import type { Knex } from 'knex';

const up = async (knex: Knex) => {
  // Create nc_product_match_sources table
  await knex.schema.createTable('nc_product_match_sources', (table) => {
    table.string('id', 20).primary();
    table.string('name').notNullable();
    table.string('code').notNullable().unique();
    table.text('base_config').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
  });

  // Create nc_product_match_brand_synonyms table
  await knex.schema.createTable('nc_product_match_brand_synonyms', (table) => {
    table.string('id', 20).primary();
    table.string('tenant_id');
    table.string('brand_canonical').notNullable();
    table.string('brand_variant').notNullable();
    table.decimal('confidence', 3, 2);
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
  });

  // Create nc_product_match_category_map table
  await knex.schema.createTable('nc_product_match_category_map', (table) => {
    table.string('id', 20).primary();
    table.string('tenant_id');
    table.string('internal_category_id').notNullable();
    table.string('external_category_key').notNullable();
    table.string('source_id', 20).notNullable();
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
    
    table.foreign('source_id').references('id').inTable('nc_product_match_sources');
  });

  // Create nc_product_match_rules table
  await knex.schema.createTable('nc_product_match_rules', (table) => {
    table.string('id', 20).primary();
    table.string('tenant_id');
    table.string('name').notNullable();
    table.text('weights').notNullable(); // JSON string
    table.decimal('price_band_pct', 5, 2).defaultTo(15);
    table.string('algorithm').defaultTo('jarowinkler');
    table.decimal('min_score', 3, 2).defaultTo(0.65);
    table.boolean('is_default').defaultTo(false);
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
  });

  // Create nc_product_match_sessions table
  await knex.schema.createTable('nc_product_match_sessions', (table) => {
    table.string('id', 20).primary();
    table.string('tenant_id');
    table.string('created_by');
    table.text('note');
    table.string('created_at', 30).notNullable();
    table.string('updated_at', 30);
  });

  // Create nc_product_matches table
  await knex.schema.createTable('nc_product_matches', (table) => {
    table.string('id', 20).primary();
    table.string('tenant_id');
    table.string('local_product_id').notNullable();
    table.string('external_product_key').notNullable();
    table.string('source_id', 20).notNullable();
    table.decimal('score', 3, 2);
    table.decimal('price_delta_pct', 8, 2);
    table.string('rule_id', 20);
    table.string('session_id', 20);
    table.enum('status', ['matched', 'not_matched', 'superseded']).defaultTo('matched');
    table.string('reviewed_by');
    table.string('reviewed_at', 30);
    table.text('notes');
    table.integer('version').defaultTo(1);
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
    
    table.foreign('source_id').references('id').inTable('nc_product_match_sources');
    table.foreign('rule_id').references('id').inTable('nc_product_match_rules');
    table.foreign('session_id').references('id').inTable('nc_product_match_sessions');
  });

  // Create nc_product_match_candidates table
  await knex.schema.createTable('nc_product_match_candidates', (table) => {
    table.string('id', 20).primary();
    table.string('tenant_id');
    table.string('local_product_id').notNullable();
    table.string('external_product_key').notNullable();
    table.string('source_id', 20).notNullable();
    table.decimal('score', 3, 2);
    table.text('explanations'); // JSON string
    table.string('generated_at', 30).notNullable();
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
    
    table.foreign('source_id').references('id').inTable('nc_product_match_sources');
  });

  // Create nc_product_search_log table
  await knex.schema.createTable('nc_product_search_log', (table) => {
    table.string('id', 20).primary();
    table.string('tenant_id');
    table.string('user_id');
    table.text('query').notNullable(); // JSON string
    table.integer('result_count');
    table.string('created_at', 30).notNullable();
    table.string('created_by');
    table.string('updated_at', 30);
    table.string('updated_by');
  });

  // Create indexes for performance
  await knex.schema.alterTable('nc_product_matches', (table) => {
    table.index(['tenant_id', 'local_product_id']);
    table.index(['tenant_id', 'external_product_key', 'source_id']);
    table.unique(['tenant_id', 'external_product_key', 'source_id'], 'unique_active_match');
  });

  await knex.schema.alterTable('nc_product_match_candidates', (table) => {
    table.index(['tenant_id', 'local_product_id', 'score']);
  });

  await knex.schema.alterTable('nc_product_match_brand_synonyms', (table) => {
    table.index(['tenant_id', 'brand_canonical']);
  });

  await knex.schema.alterTable('nc_product_match_category_map', (table) => {
    table.index(['tenant_id', 'internal_category_id']);
    table.index(['source_id', 'external_category_key']);
  });
};

const down = async (knex: Knex) => {
  // Drop tables in reverse order
  await knex.schema.dropTable('nc_product_search_log');
  await knex.schema.dropTable('nc_product_match_candidates');
  await knex.schema.dropTable('nc_product_matches');
  await knex.schema.dropTable('nc_product_match_sessions');
  await knex.schema.dropTable('nc_product_match_rules');
  await knex.schema.dropTable('nc_product_match_category_map');
  await knex.schema.dropTable('nc_product_match_brand_synonyms');
  await knex.schema.dropTable('nc_product_match_sources');
};

export { up, down };
