// @ts-ignore
import composerize from "composerize";
import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { log } from "../log";
import { R } from "redbean-node";
import { loginRateLimiter, twoFaRateLimiter, apiRateLimiter } from "../rate-limiter";
import { generatePasswordHash, needRehashPassword, shake256, SHAKE256_LENGTH, verifyPassword } from "../password-hash";
import { User } from "../models/user";
import {
    callbackError,
    callbackResult,
    checkLogin,
    DockgeSocket,
    doubleCheckPassword,
    JWTDecoded,
    ValidationError,
    validatePasswordStrength
} from "../util-server";
import jwt from "jsonwebtoken";
import { Settings } from "../settings";
import fs, { promises as fsAsync } from "fs";
import path from "path";
import { AuditLog } from "../audit-log";

export class MainSocketHandler extends SocketHandler {
    create(socket : DockgeSocket, server : DockgeServer) {

        // ***************************
        // Public Socket API
        // ***************************

        // Setup
        socket.on("setup", async (username, password, callback) => {
            try {
                const clientIP = await server.getClientIP(socket);

                // Rate limit setup attempts
                if (!await loginRateLimiter.pass(clientIP, callback)) {
                    log.info("auth", `Too many setup requests. IP=${clientIP}`);
                    return;
                }

                validatePasswordStrength(password);

                if ((await R.knex("user").count("id as count").first()).count !== 0) {
                    throw new Error("Dockge has been initialized. If you want to run setup again, please delete the database.");
                }

                const user = R.dispense("user");
                user.username = username;
                user.password = generatePasswordHash(password);
                await R.store(user);

                server.needSetup = false;

                callback({
                    ok: true,
                    msg: "successAdded",
                    msgi18n: true,
                });

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        // Login by token
        socket.on("loginByToken", async (token, callback) => {
            const clientIP = await server.getClientIP(socket);

            log.info("auth", `Login by token. IP=${clientIP}`);

            // Rate limit token login attempts
            if (!await loginRateLimiter.pass(clientIP, callback)) {
                log.info("auth", `Too many loginByToken requests. IP=${clientIP}`);
                return;
            }

            try {
                const decoded = jwt.verify(token, server.jwtSecret) as JWTDecoded;

                log.info("auth", "Username from JWT: " + decoded.username);

                const user = await R.findOne("user", " username = ? AND active = 1 ", [
                    decoded.username,
                ]) as User;

                if (user) {
                    // Check if the password changed
                    if (decoded.h !== shake256(user.password, SHAKE256_LENGTH)) {
                        throw new Error("The token is invalid due to password change or old token");
                    }

                    // Check if the session is still valid
                    const tokenHash = User.hashToken(token);
                    const session = await R.findOne("session", " token_hash = ? AND is_valid = 1 ", [tokenHash]);
                    if (!session) {
                        throw new Error("Session has been revoked");
                    }

                    // Update last active time
                    await R.exec("UPDATE `session` SET last_active_at = datetime('now') WHERE token_hash = ?", [tokenHash]);

                    // Store token hash on socket for session identification
                    (socket as any)._tokenHash = tokenHash;

                    log.debug("auth", "afterLogin");
                    await server.afterLogin(socket, user);
                    log.debug("auth", "afterLogin ok");

                    log.info("auth", `Successfully logged in user ${decoded.username}. IP=${clientIP}`);

                    callback({
                        ok: true,
                    });
                } else {

                    log.info("auth", `Inactive or deleted user ${decoded.username}. IP=${clientIP}`);

                    callback({
                        ok: false,
                        msg: "authUserInactiveOrDeleted",
                        msgi18n: true,
                    });
                }
            } catch (error) {
                if (!(error instanceof Error)) {
                    console.error("Unknown error:", error);
                    return;
                }
                log.error("auth", `Invalid token. IP=${clientIP}`);
                if (error.message) {
                    log.error("auth", error.message + ` IP=${clientIP}`);
                }
                callback({
                    ok: false,
                    msg: "authInvalidToken",
                    msgi18n: true,
                });
            }

        });

        // Login
        socket.on("login", async (data, callback) => {
            const clientIP = await server.getClientIP(socket);

            log.info("auth", `Login by username + password. IP=${clientIP}`);

            // Checking
            if (typeof callback !== "function") {
                return;
            }

            if (!data) {
                return;
            }

            // Login Rate Limit
            if (!await loginRateLimiter.pass(clientIP, callback)) {
                log.info("auth", `Too many failed requests for user ${data.username}. IP=${clientIP}`);
                return;
            }

            const user = await this.login(data.username, data.password);
            const userAgent = socket.request?.headers?.["user-agent"] || "";

            if (user) {
                if (user.twofa_status === 0) {
                    server.afterLogin(socket, user);

                    log.info("auth", `Successfully logged in user ${data.username}. IP=${clientIP}`);

                    const token = await User.createJWTWithSession(user, server.jwtSecret, clientIP, userAgent);
                    callback({
                        ok: true,
                        token,
                    });
                    await AuditLog.log(user.id, data.username, "auth.login", "user", data.username, clientIP);
                }

                if (user.twofa_status === 1 && !data.token) {

                    log.info("auth", `2FA token required for user ${data.username}. IP=${clientIP}`);

                    callback({
                        tokenRequired: true,
                    });
                }

                if (data.token) {
                    // @ts-ignore
                    const verify = notp.totp.verify(data.token, user.twofa_secret, twoFAVerifyOptions);

                    if (user.twofa_last_token !== data.token && verify) {
                        server.afterLogin(socket, user);

                        await R.exec("UPDATE `user` SET twofa_last_token = ? WHERE id = ? ", [
                            data.token,
                            socket.userID,
                        ]);

                        log.info("auth", `Successfully logged in user ${data.username}. IP=${clientIP}`);

                        const token = await User.createJWTWithSession(user, server.jwtSecret, clientIP, userAgent);
                        callback({
                            ok: true,
                            token,
                        });
                    } else {

                        log.warn("auth", `Invalid token provided for user ${data.username}. IP=${clientIP}`);

                        callback({
                            ok: false,
                            msg: "authInvalidToken",
                            msgi18n: true,
                        });
                    }
                }
            } else {

                log.warn("auth", `Incorrect username or password for user ${data.username}. IP=${clientIP}`);

                callback({
                    ok: false,
                    msg: "authIncorrectCreds",
                    msgi18n: true,
                });
                await AuditLog.log(0, data.username || "unknown", "auth.login_failed", "user", data.username || "", clientIP);
            }

        });

        // Change Password
        socket.on("changePassword", async (password, callback) => {
            try {
                checkLogin(socket);

                if (! password.newPassword) {
                    throw new Error("Invalid new password");
                }

                validatePasswordStrength(password.newPassword);

                let user = await doubleCheckPassword(socket, password.currentPassword);
                await user.resetPassword(password.newPassword);

                // Invalidate all other sessions
                await R.exec("UPDATE `session` SET is_valid = 0 WHERE user_id = ?", [user.id]);

                server.disconnectAllSocketClients(user.id, socket.id);

                callback({
                    ok: true,
                    msg: "Password has been updated successfully.",
                });

                const clientIP = await server.getClientIP(socket);
                await AuditLog.log(user.id, user.username, "auth.password_change", "user", user.username, clientIP);

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        // Get active sessions for current user
        socket.on("getActiveSessions", async (callback) => {
            try {
                checkLogin(socket);

                const sessions = await R.getAll(
                    "SELECT id, ip_address, user_agent, created_at, last_active_at FROM `session` WHERE user_id = ? AND is_valid = 1 ORDER BY last_active_at DESC",
                    [socket.userID]
                );

                const currentTokenHash = (socket as any)._tokenHash || "";

                const mapped = sessions.map((s: any) => ({
                    id: s.id,
                    ipAddress: s.ip_address,
                    userAgent: s.user_agent,
                    createdAt: s.created_at,
                    lastActiveAt: s.last_active_at,
                    isCurrent: s.id === (currentTokenHash ? undefined : undefined), // Will be set below
                }));

                // Find current session by token hash
                if (currentTokenHash) {
                    const currentSession = await R.findOne("session", " token_hash = ? ", [currentTokenHash]);
                    if (currentSession) {
                        for (const s of mapped) {
                            s.isCurrent = (s.id === currentSession.id);
                        }
                    }
                }

                callbackResult({
                    ok: true,
                    sessions: mapped,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Revoke a specific session
        socket.on("revokeSession", async (sessionId: unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof sessionId !== "number") {
                    throw new ValidationError("Session ID must be a number");
                }

                await R.exec(
                    "UPDATE `session` SET is_valid = 0 WHERE id = ? AND user_id = ?",
                    [sessionId, socket.userID]
                );

                callbackResult({
                    ok: true,
                    msg: "sessionRevoked",
                    msgi18n: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Revoke all other sessions
        socket.on("revokeAllOtherSessions", async (callback) => {
            try {
                checkLogin(socket);

                const currentTokenHash = (socket as any)._tokenHash || "";

                if (currentTokenHash) {
                    await R.exec(
                        "UPDATE `session` SET is_valid = 0 WHERE user_id = ? AND token_hash != ?",
                        [socket.userID, currentTokenHash]
                    );
                } else {
                    await R.exec(
                        "UPDATE `session` SET is_valid = 0 WHERE user_id = ?",
                        [socket.userID]
                    );
                }

                server.disconnectAllSocketClients(socket.userID, socket.id);

                callbackResult({
                    ok: true,
                    msg: "allOtherSessionsRevoked",
                    msgi18n: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("getSettings", async (callback) => {
            try {
                checkLogin(socket);
                const data = await Settings.getSettings("general");

                if (fs.existsSync(path.join(server.stacksDir, "global.env"))) {
                    data.globalENV = fs.readFileSync(path.join(server.stacksDir, "global.env"), "utf-8");
                } else {
                    data.globalENV = "# VARIABLE=value #comment";
                }

                callback({
                    ok: true,
                    data: data,
                });

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        socket.on("setSettings", async (data, currentPassword, callback) => {
            try {
                checkLogin(socket);

                // If currently is disabled auth, don't need to check
                // Disabled Auth + Want to Disable Auth => No Check
                // Disabled Auth + Want to Enable Auth => No Check
                // Enabled Auth + Want to Disable Auth => Check!!
                // Enabled Auth + Want to Enable Auth => No Check
                const currentDisabledAuth = await Settings.get("disableAuth");
                if (!currentDisabledAuth && data.disableAuth) {
                    await doubleCheckPassword(socket, currentPassword);
                }
                // Handle global.env
                if (data.globalENV && data.globalENV != "# VARIABLE=value #comment") {
                    await fsAsync.writeFile(path.join(server.stacksDir, "global.env"), data.globalENV);
                } else {
                    await fsAsync.rm(path.join(server.stacksDir, "global.env"), {
                        recursive: true,
                        force: true
                    });
                }
                delete data.globalENV;

                await Settings.setSettings("general", data);

                callback({
                    ok: true,
                    msg: "Saved"
                });

                server.sendInfo(socket);

                const settingsIP = await server.getClientIP(socket);
                const settingsUser = await R.findOne("user", " id = ? ", [socket.userID]);
                await AuditLog.log(socket.userID, settingsUser?.username || "unknown", "settings.change", "settings", "general", settingsIP);

            } catch (e) {
                if (e instanceof Error) {
                    callback({
                        ok: false,
                        msg: e.message,
                    });
                }
            }
        });

        // Disconnect all other socket clients of the user
        socket.on("disconnectOtherSocketClients", async () => {
            try {
                checkLogin(socket);
                server.disconnectAllSocketClients(socket.userID, socket.id);
            } catch (e) {
                if (e instanceof Error) {
                    log.warn("disconnectOtherSocketClients", e.message);
                }
            }
        });

        // composerize
        socket.on("composerize", async (dockerRunCommand : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(dockerRunCommand) !== "string") {
                    throw new ValidationError("dockerRunCommand must be a string");
                }

                // Option: 'latest' | 'v2x' | 'v3x'
                let composeTemplate = composerize(dockerRunCommand, "", "latest");

                // Remove the first line "name: <your project name>"
                composeTemplate = composeTemplate.split("\n").slice(1).join("\n");

                callback({
                    ok: true,
                    composeTemplate,
                });
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    async login(username : string, password : string) : Promise<User | null> {
        if (typeof username !== "string" || typeof password !== "string") {
            return null;
        }

        const user = await R.findOne("user", " username = ? AND active = 1 ", [
            username,
        ]) as User;

        if (user && verifyPassword(password, user.password)) {
            // Upgrade the hash to bcrypt
            if (needRehashPassword(user.password)) {
                await R.exec("UPDATE `user` SET password = ? WHERE id = ? ", [
                    generatePasswordHash(password),
                    user.id,
                ]);
            }
            return user;
        }

        return null;
    }
}
