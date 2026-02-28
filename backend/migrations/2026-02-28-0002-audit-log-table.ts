import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("audit_log", (table) => {
        table.increments("id");
        table.integer("user_id").notNullable();
        table.string("username", 255).notNullable();
        table.string("action", 100).notNullable();
        table.string("resource_type", 50);
        table.string("resource_name", 255);
        table.string("ip_address", 45);
        table.text("details");
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("audit_log");
}
