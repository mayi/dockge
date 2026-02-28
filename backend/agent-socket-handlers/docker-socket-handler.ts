import { AgentSocketHandler } from "../agent-socket-handler";
import { DockgeServer } from "../dockge-server";
import { callbackError, callbackResult, checkLogin, DockgeSocket, ValidationError } from "../util-server";
import { Stack } from "../stack";
import { AgentSocket } from "../../common/agent-socket";
import { apiRateLimiter, KumaRateLimiterCallback } from "../rate-limiter";
import childProcessAsync from "promisify-child-process";
import { AuditLog } from "../audit-log";
import { R } from "redbean-node";

export class DockerSocketHandler extends AgentSocketHandler {
    create(socket : DockgeSocket, server : DockgeServer, agentSocket : AgentSocket) {
        // Do not call super.create()

        const audit = async (action: string, resourceType: string, resourceName: string) => {
            const clientIP = await server.getClientIP(socket);
            const user = socket.userID ? await R.findOne("user", " id = ? ", [socket.userID]) : null;
            const username = user ? user.username : "unknown";
            await AuditLog.log(socket.userID || 0, username, action, resourceType, resourceName, clientIP);
        };

        agentSocket.on("deployStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }
                const stack = await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                await stack.deploy(socket);
                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Deployed",
                    msgi18n: true,
                }, callback);
                stack.joinCombinedTerminal(socket);
                await audit("stack.deploy", "stack", String(name));
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("saveStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                callbackResult({
                    ok: true,
                    msg: "Saved",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
                await audit("stack.save", "stack", String(name));
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("deleteStack", async (name : unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }
                if (typeof(name) !== "string") {
                    throw new ValidationError("Name must be a string");
                }
                const stack = await Stack.getStack(server, name);

                try {
                    await stack.delete(socket);
                } catch (e) {
                    server.sendStackList();
                    throw e;
                }

                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Deleted",
                    msgi18n: true,
                }, callback);
                await audit("stack.delete", "stack", name);

            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("getStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);

                if (stack.isManagedByDockge) {
                    stack.joinCombinedTerminal(socket);
                }

                callbackResult({
                    ok: true,
                    stack: await stack.toJSON(socket.endpoint),
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // requestStackList
        agentSocket.on("requestStackList", async (callback) => {
            try {
                checkLogin(socket);
                server.sendStackList();
                callbackResult({
                    ok: true,
                    msg: "Updated",
                    msgi18n: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // startStack
        agentSocket.on("startStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.start(socket);
                callbackResult({
                    ok: true,
                    msg: "Started",
                    msgi18n: true,
                }, callback);
                server.sendStackList();

                stack.joinCombinedTerminal(socket);
                await audit("stack.start", "stack", stackName);

            } catch (e) {
                callbackError(e, callback);
            }
        });

        // stopStack
        agentSocket.on("stopStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.stop(socket);
                callbackResult({
                    ok: true,
                    msg: "Stopped",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
                await audit("stack.stop", "stack", stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // restartStack
        agentSocket.on("restartStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.restart(socket);
                callbackResult({
                    ok: true,
                    msg: "Restarted",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
                await audit("stack.restart", "stack", stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // updateStack
        agentSocket.on("updateStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.update(socket);
                callbackResult({
                    ok: true,
                    msg: "Updated",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
                await audit("stack.update", "stack", stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // down stack
        agentSocket.on("downStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.down(socket);
                callbackResult({
                    ok: true,
                    msg: "Downed",
                    msgi18n: true,
                }, callback);
                server.sendStackList();
                await audit("stack.down", "stack", stackName);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Services status
        agentSocket.on("serviceStatusList", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName, true);
                const serviceStatusList = Object.fromEntries(await stack.getServiceStatusList());
                callbackResult({
                    ok: true,
                    serviceStatusList,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Container stats (CPU, memory, network, block IO)
        agentSocket.on("containerStats", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);

                if (typeof(stackName) !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const stack = await Stack.getStack(server, stackName, true);
                const containerStats = Object.fromEntries(await stack.getContainerStats());
                callbackResult({
                    ok: true,
                    containerStats,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // getExternalNetworkList
        agentSocket.on("getDockerNetworkList", async (callback) => {
            try {
                checkLogin(socket);
                const res = await childProcessAsync.spawn("docker", [
                    "network", "ls", "--format", "{{json .}}"
                ], { encoding: "utf-8" });

                const networks: object[] = [];
                if (res.stdout) {
                    for (const line of res.stdout.toString().split("\n")) {
                        if (line.trim()) {
                            const raw = JSON.parse(line);
                            // Normalize field names across Docker and Podman
                            networks.push({
                                name: raw.Name || raw.name || "",
                                id: raw.ID || raw.Id || raw.id || "",
                                driver: raw.Driver || raw.driver || "",
                                scope: raw.Scope || raw.scope || "local",
                            });
                        }
                    }
                }
                networks.sort((a: any, b: any) => a.name.localeCompare(b.name));
                callbackResult({
                    ok: true,
                    networks,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Inspect a docker network
        agentSocket.on("inspectDockerNetwork", async (name: unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof name !== "string") {
                    throw new ValidationError("Network name must be a string");
                }
                const details = await server.getDockerNetworkDetails(name);
                callbackResult({
                    ok: true,
                    details,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Create a docker network
        agentSocket.on("createDockerNetwork", async (data: unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof data !== "object" || data === null) {
                    throw new ValidationError("Data must be an object");
                }
                const d = data as Record<string, unknown>;
                if (typeof d.name !== "string" || !d.name) {
                    throw new ValidationError("Network name is required");
                }
                const driver = typeof d.driver === "string" ? d.driver : undefined;
                const subnet = typeof d.subnet === "string" ? d.subnet : undefined;
                await server.createDockerNetwork(d.name, driver, subnet);
                callbackResult({
                    ok: true,
                    msg: "networkCreated",
                    msgi18n: true,
                }, callback);
                await audit("network.create", "network", d.name);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Remove a docker network
        agentSocket.on("removeDockerNetwork", async (name: unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof name !== "string") {
                    throw new ValidationError("Network name must be a string");
                }
                await server.removeDockerNetwork(name);
                callbackResult({
                    ok: true,
                    msg: "networkRemoved",
                    msgi18n: true,
                }, callback);
                await audit("network.remove", "network", name);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // List docker images
        agentSocket.on("listDockerImages", async (callback) => {
            try {
                checkLogin(socket);
                const res = await childProcessAsync.spawn("docker", [
                    "image", "ls", "--format", "{{json .}}"
                ], { encoding: "utf-8" });

                const images: object[] = [];
                if (res.stdout) {
                    for (const line of res.stdout.toString().split("\n")) {
                        if (line.trim()) {
                            const raw = JSON.parse(line);
                            // Normalize field names across Docker and Podman
                            images.push({
                                id: raw.ID || raw.Id || raw.id || "",
                                repository: raw.Repository || raw.repository || "",
                                tag: raw.Tag || raw.tag || "",
                                size: DockerSocketHandler.formatBytes(raw.Size, raw.VirtualSize),
                                createdAt: DockerSocketHandler.formatCreated(raw.CreatedSince, raw.Created, raw.CreatedAt),
                            });
                        }
                    }
                }
                callbackResult({ ok: true, images }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Remove a docker image
        agentSocket.on("removeDockerImage", async (imageId: unknown, callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }

                if (typeof imageId !== "string") {
                    throw new ValidationError("Image ID must be a string");
                }
                // Validate image ID format (sha256 hash or repo:tag)
                if (!imageId.match(/^[a-zA-Z0-9/:._-]+$/)) {
                    throw new ValidationError("Invalid image ID format");
                }
                await childProcessAsync.spawn("docker", ["image", "rm", imageId], {
                    encoding: "utf-8",
                });
                callbackResult({
                    ok: true,
                    msg: "imageRemoved",
                    msgi18n: true,
                }, callback);
                await audit("image.remove", "image", imageId);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Prune unused images
        agentSocket.on("pruneDockerImages", async (callback) => {
            try {
                checkLogin(socket);
                const clientIP = await server.getClientIP(socket);
                if (!await apiRateLimiter.pass(clientIP, callback as KumaRateLimiterCallback)) { return; }

                await childProcessAsync.spawn("docker", ["image", "prune", "-a", "--force"], {
                    encoding: "utf-8",
                });
                callbackResult({
                    ok: true,
                    msg: "imagesPruned",
                    msgi18n: true,
                }, callback);
                await audit("image.prune", "image", "all");
            } catch (e) {
                callbackError(e, callback);
            }
        });

        // Inspect a docker image
        agentSocket.on("inspectDockerImage", async (imageId: unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof imageId !== "string") {
                    throw new ValidationError("Image ID must be a string");
                }
                const res = await childProcessAsync.spawn("docker", ["image", "inspect", imageId], {
                    encoding: "utf-8",
                });
                if (!res.stdout) {
                    throw new Error("Failed to inspect image");
                }
                const details = JSON.parse(res.stdout.toString());
                callbackResult({
                    ok: true,
                    details: Array.isArray(details) ? details[0] : details,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    async saveStack(server : DockgeServer, name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown) : Promise<Stack> {
        // Check types
        if (typeof(name) !== "string") {
            throw new ValidationError("Name must be a string");
        }
        if (typeof(composeYAML) !== "string") {
            throw new ValidationError("Compose YAML must be a string");
        }
        if (typeof(composeENV) !== "string") {
            throw new ValidationError("Compose ENV must be a string");
        }
        if (typeof(isAdd) !== "boolean") {
            throw new ValidationError("isAdd must be a boolean");
        }

        const stack = new Stack(server, name, composeYAML, composeENV, false);
        await stack.save(isAdd);
        return stack;
    }

    /**
     * Format bytes to human-readable size string.
     * Handles both Docker (pre-formatted string) and Podman (raw number) output.
     */
    static formatBytes(size: unknown, virtualSize?: unknown): string {
        const raw = size ?? virtualSize;
        if (typeof raw === "string") {
            return raw;
        }
        if (typeof raw === "number") {
            if (raw < 1024) {
                return raw + "B";
            } else if (raw < 1024 * 1024) {
                return (raw / 1024).toFixed(1) + "KB";
            } else if (raw < 1024 * 1024 * 1024) {
                return (raw / (1024 * 1024)).toFixed(1) + "MB";
            } else {
                return (raw / (1024 * 1024 * 1024)).toFixed(2) + "GB";
            }
        }
        return "";
    }

    /**
     * Format created time to human-readable string.
     * Handles Docker (CreatedSince string) and Podman (unix timestamp or date string).
     */
    static formatCreated(createdSince?: unknown, created?: unknown, createdAt?: unknown): string {
        if (typeof createdSince === "string" && createdSince) {
            return createdSince;
        }
        if (typeof created === "number" && created > 0) {
            const diff = Date.now() - created * 1000;
            const minutes = Math.floor(diff / 60000);
            if (minutes < 60) {
                return minutes + " minutes ago";
            }
            const hours = Math.floor(minutes / 60);
            if (hours < 24) {
                return hours + " hours ago";
            }
            const days = Math.floor(hours / 24);
            if (days < 30) {
                return days + " days ago";
            }
            const months = Math.floor(days / 30);
            return months + " months ago";
        }
        if (typeof createdAt === "string" && createdAt) {
            return createdAt;
        }
        return "";
    }

}

