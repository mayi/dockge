import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("session", (table) => {
        table.increments("id");
        table.integer("user_id").notNullable();
        table.string("token_hash", 128).notNullable();
        table.string("ip_address", 45);
        table.string("user_agent", 512);
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
        table.timestamp("last_active_at").notNullable().defaultTo(knex.fn.now());
        table.boolean("is_valid").notNullable().defaultTo(true);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("session");
}
