import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  await knex.schema.createTable(MetaTable.AI_CONVERSATIONS, (table) => {
    table.string('id').primary();
    table.string('user_id').notNullable();
    table.string('title');
    table.string('created_at').notNullable();
    table.string('updated_at').notNullable();
    
    // Add indexes for performance
    table.index('user_id');
    table.index('updated_at');
  });
};

const down = async (knex: Knex) => {
  await knex.schema.dropTable(MetaTable.AI_CONVERSATIONS);
};

export { up, down };
