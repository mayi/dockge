import { DockgeServer } from "../dockge-server";
import { Router } from "../router";
import express, { Express, NextFunction, Request, Response, Router as ExpressRouter } from "express";
import jwt from "jsonwebtoken";
import { JWTDecoded, ValidationError } from "../util-server";
import { R } from "redbean-node";
import { User } from "../models/user";
import { shake256, SHAKE256_LENGTH } from "../password-hash";
import { Settings } from "../settings";
import { Stack } from "../stack";
import { promises as fsAsync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import childProcessAsync from "promisify-child-process";

export class MainRouter extends Router {

    setApiCorsHeaders(request : Request, response : Response) {
        const origin = request.headers.origin;

        if (typeof origin === "string" && origin) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Vary", "Origin");
        }

        response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    }

    async checkApiAuth(req : Request, server : DockgeServer) : Promise<void> {
        const disableAuth = await Settings.get("disableAuth");
        if (disableAuth) {
            return;
        }

        const authHeader = req.headers.authorization;
        let token = "";

        if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
            token = authHeader.slice(7);
        } else if (typeof req.query.token === "string") {
            token = req.query.token;
        }

        if (!token) {
            throw new ValidationError("You are not logged in.");
        }

        const decoded = jwt.verify(token, server.jwtSecret) as JWTDecoded;
        const user = await R.findOne("user", " username = ? AND active = 1 ", [
            decoded.username,
        ]) as User;

        if (!user) {
            throw new ValidationError("You are not logged in.");
        }

        // Verify the password hasn't changed since token was issued
        if (decoded.h && decoded.h !== shake256(user.password, SHAKE256_LENGTH)) {
            throw new ValidationError("Token invalidated by password change.");
        }
    }

    createApiAuthMiddleware(server : DockgeServer) {
        return async (req : Request, res : Response, next : NextFunction) => {
            try {
                await this.checkApiAuth(req, server);
                next();
            } catch (_error) {
                res.status(401).json({
                    ok: false,
                    msg: "You are not logged in.",
                });
            }
        };
    }

    create(app: Express, server: DockgeServer): ExpressRouter {
        const router = express.Router();
        const apiAuth = this.createApiAuthMiddleware(server);

        // Security headers middleware
        router.use((_req, res, next) => {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("X-Frame-Options", "SAMEORIGIN");
            res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
            res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
            res.removeHeader("X-Powered-By");
            next();
        });

        router.get("/", (_req, res) => {
            res.send(server.indexHTML);
        });

        // Robots.txt
        router.get("/robots.txt", async (_request, response) => {
            let txt = "User-agent: *\nDisallow: /";
            response.setHeader("Content-Type", "text/plain");
            response.send(txt);
        });

        router.options("/api/stacks/:stackName/backup", (request, response) => {
            this.setApiCorsHeaders(request, response);
            response.status(204).end();
        });

        router.get("/api/stacks/:stackName/backup", apiAuth, async (request, response) => {
            let archivePath = "";

            try {
                this.setApiCorsHeaders(request, response);

                const stackName = request.params.stackName;

                if (typeof stackName !== "string") {
                    throw new ValidationError("Invalid stack name");
                }

                const stack = await Stack.getStack(server, stackName);

                if (!stack.isManagedByDockge) {
                    throw new ValidationError("Stack not managed by Dockge");
                }

                const now = new Date().toISOString().replace(/[:.]/g, "-");
                const fileName = `${stackName}-backup-${now}.tar.gz`;

                archivePath = path.join(os.tmpdir(), `dockge-${stackName}-${Date.now()}-${randomUUID()}.tar.gz`);

                await childProcessAsync.spawn("tar", [ "-czf", archivePath, "-C", server.stacksDir, stackName ], {
                    encoding: "utf-8",
                });

                await childProcessAsync.spawn("tar", [ "-tzf", archivePath ], {
                    encoding: "utf-8",
                });

                response.setHeader("Cache-Control", "no-store");
                response.download(archivePath, fileName, async () => {
                    await fsAsync.rm(archivePath, {
                        force: true,
                    });
                });
            } catch (error) {
                if (archivePath) {
                    await fsAsync.rm(archivePath, {
                        force: true,
                    });
                }

                if (error instanceof ValidationError) {
                    response.status(400).json({
                        ok: false,
                        msg: error.message,
                    });
                } else {
                    response.status(500).json({
                        ok: false,
                        msg: "Failed to backup stack",
                    });
                }
            }
        });

        router.options("/api/stacks/:stackName/logs", (request, response) => {
            this.setApiCorsHeaders(request, response);
            response.status(204).end();
        });

        router.get("/api/stacks/:stackName/logs", apiAuth, async (request, response) => {
            try {
                this.setApiCorsHeaders(request, response);

                const stackName = request.params.stackName;

                if (typeof stackName !== "string" || !stackName.match(/^[a-z0-9_-]+$/)) {
                    throw new ValidationError("Invalid stack name");
                }

                const stack = await Stack.getStack(server, stackName);

                if (!stack.isManagedByDockge) {
                    throw new ValidationError("Stack not managed by Dockge");
                }

                const service = typeof request.query.service === "string" ? request.query.service : undefined;
                let lines = 1000;
                if (typeof request.query.lines === "string") {
                    const parsed = parseInt(request.query.lines);
                    if (!isNaN(parsed) && parsed > 0 && parsed <= 10000) {
                        lines = parsed;
                    }
                }

                const args = [
                    "compose",
                    "-f", path.join(server.stacksDir, stackName, "compose.yaml"),
                    "logs",
                    "--no-color",
                    "--tail", String(lines),
                ];

                if (service) {
                    if (!service.match(/^[a-zA-Z0-9_-]+$/)) {
                        throw new ValidationError("Invalid service name");
                    }
                    args.push(service);
                }

                const result = await childProcessAsync.spawn("docker", args, {
                    encoding: "utf-8",
                    timeout: 30000,
                });

                const logContent = (result.stdout?.toString() || "") + (result.stderr?.toString() || "");
                const now = new Date().toISOString().replace(/[:.]/g, "-");
                const fileName = service
                    ? `${stackName}-${service}-logs-${now}.txt`
                    : `${stackName}-logs-${now}.txt`;

                response.setHeader("Content-Type", "text/plain");
                response.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
                response.setHeader("Cache-Control", "no-store");
                response.send(logContent);
            } catch (error) {
                if (error instanceof ValidationError) {
                    response.status(400).json({
                        ok: false,
                        msg: error.message,
                    });
                } else {
                    response.status(500).json({
                        ok: false,
                        msg: "Failed to export logs",
                    });
                }
            }
        });

        return router;
    }

}
