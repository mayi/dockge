import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { callbackError, callbackResult, checkLogin, DockgeSocket, ValidationError } from "../util-server";
import { StackTemplates } from "../stack-templates";

export class TemplateSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {
        const templates = new StackTemplates(server.config.dataDir);

        socket.on("getTemplateList", async (callback) => {
            try {
                checkLogin(socket);
                const list = templates.getAllTemplates();
                callbackResult({
                    ok: true,
                    templates: list,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("getTemplate", async (id: unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof id !== "string") {
                    throw new ValidationError("Template ID must be a string");
                }
                const template = templates.getTemplate(id);
                if (!template) {
                    throw new ValidationError("Template not found");
                }
                callbackResult({
                    ok: true,
                    template,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("saveCustomTemplate", async (data: unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof data !== "object" || data === null) {
                    throw new ValidationError("Data must be an object");
                }
                const d = data as Record<string, unknown>;
                if (typeof d.name !== "string" || !d.name) {
                    throw new ValidationError("Template name is required");
                }
                if (typeof d.composeYAML !== "string" || !d.composeYAML) {
                    throw new ValidationError("Compose YAML is required");
                }

                templates.saveCustomTemplate({
                    id: typeof d.id === "string" ? d.id : "",
                    name: d.name,
                    description: typeof d.description === "string" ? d.description : "",
                    category: typeof d.category === "string" ? d.category : "Custom",
                    composeYAML: d.composeYAML,
                    composeENV: typeof d.composeENV === "string" ? d.composeENV : "",
                    isBuiltIn: false,
                });

                callbackResult({
                    ok: true,
                    msg: "templateSaved",
                    msgi18n: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("deleteCustomTemplate", async (id: unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof id !== "string") {
                    throw new ValidationError("Template ID must be a string");
                }
                templates.deleteCustomTemplate(id);
                callbackResult({
                    ok: true,
                    msg: "templateDeleted",
                    msgi18n: true,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }
}
