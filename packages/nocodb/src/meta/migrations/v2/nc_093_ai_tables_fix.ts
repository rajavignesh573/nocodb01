import type { Knex } from 'knex';
import { MetaTable } from '~/utils/globals';

const up = async (knex: Knex) => {
  // Add missing columns to AI conversations table
  await knex.schema.alterTable(MetaTable.AI_CONVERSATIONS, (table) => {
    table.string('base_id').notNullable().defaultTo('default');
    table.string('workspace_id').notNullable().defaultTo('default');
    
    // Add indexes for the new columns
    table.index(['base_id', 'workspace_id']);
  });

  // Add missing columns to AI messages table
  await knex.schema.alterTable(MetaTable.AI_MESSAGES, (table) => {
    table.string('base_id').notNullable().defaultTo('default');
    table.string('workspace_id').notNullable().defaultTo('default');
    
    // Add indexes for the new columns
    table.index(['base_id', 'workspace_id']);
  });
};

const down = async (knex: Knex) => {
  // Remove the columns if needed to rollback
  await knex.schema.alterTable(MetaTable.AI_CONVERSATIONS, (table) => {
    table.dropColumn('base_id');
    table.dropColumn('workspace_id');
  });

  await knex.schema.alterTable(MetaTable.AI_MESSAGES, (table) => {
    table.dropColumn('base_id');
    table.dropColumn('workspace_id');
  });
};

export { up, down };
