import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { callbackError, callbackResult, checkLogin, DockgeSocket, ValidationError } from "../util-server";
import { AuditLog } from "../audit-log";

export class AuditLogSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        socket.on("getAuditLog", async (data: unknown, callback) => {
            try {
                checkLogin(socket);

                let limit = 50;
                let offset = 0;
                let actionFilter: string | undefined;

                if (data && typeof data === "object") {
                    const d = data as Record<string, unknown>;
                    if (typeof d.limit === "number" && d.limit > 0 && d.limit <= 200) {
                        limit = d.limit;
                    }
                    if (typeof d.offset === "number" && d.offset >= 0) {
                        offset = d.offset;
                    }
                    if (typeof d.actionFilter === "string" && d.actionFilter) {
                        actionFilter = d.actionFilter;
                    }
                }

                const entries = await AuditLog.getRecent(limit, offset, actionFilter);
                const total = await AuditLog.getCount(actionFilter);

                callbackResult({
                    ok: true,
                    entries,
                    total,
                }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        socket.on("getAuditLogCount", async (callback) => {
            try {
                checkLogin(socket);
                const total = await AuditLog.getCount();
                callbackResult({ ok: true, total }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }
}
