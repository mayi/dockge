import { R } from "redbean-node";
import { log } from "./log";

export class AuditLog {

    /**
     * Log an audit event
     */
    static async log(
        userId: number,
        username: string,
        action: string,
        resourceType: string,
        resourceName: string,
        ipAddress: string,
        details?: object,
    ): Promise<void> {
        try {
            const bean = R.dispense("audit_log");
            bean.user_id = userId;
            bean.username = username;
            bean.action = action;
            bean.resource_type = resourceType;
            bean.resource_name = resourceName;
            bean.ip_address = ipAddress;
            bean.details = details ? JSON.stringify(details) : null;
            await R.store(bean);
        } catch (e) {
            // Don't let audit logging failures break the main operation
            log.error("audit", "Failed to write audit log: " + (e instanceof Error ? e.message : e));
        }
    }

    /**
     * Get recent audit log entries with pagination
     */
    static async getRecent(limit: number = 50, offset: number = 0, actionFilter?: string): Promise<object[]> {
        let sql = "SELECT * FROM audit_log";
        const params: (string | number)[] = [];

        if (actionFilter) {
            sql += " WHERE action LIKE ?";
            params.push(`${actionFilter}%`);
        }

        sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        return await R.getAll(sql, params);
    }

    /**
     * Get total count of audit log entries
     */
    static async getCount(actionFilter?: string): Promise<number> {
        if (actionFilter) {
            return await R.getCell("SELECT COUNT(*) FROM audit_log WHERE action LIKE ?", [`${actionFilter}%`]);
        }
        return await R.getCell("SELECT COUNT(*) FROM audit_log");
    }
}
