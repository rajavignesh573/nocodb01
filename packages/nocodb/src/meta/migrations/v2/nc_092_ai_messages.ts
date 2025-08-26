import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  await knex.schema.createTable(MetaTable.AI_MESSAGES, (table) => {
    table.string('id').primary();
    table.string('conversation_id').notNullable();
    table.string('role').notNullable();
    table.text('content_json').notNullable();
    table.string('provider_msg_id');
    table.text('tool_call_json');
    table.string('created_at').notNullable();
    
    // Add foreign key constraint
    table.foreign('conversation_id').references('id').inTable(MetaTable.AI_CONVERSATIONS).onDelete('CASCADE');
    
    // Add indexes for performance
    table.index('conversation_id');
    table.index('created_at');
  });
};

const down = async (knex: Knex) => {
  await knex.schema.dropTable(MetaTable.AI_MESSAGES);
};

export { up, down };
