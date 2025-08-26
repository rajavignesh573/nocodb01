const { Client } = require('pg');
const config = require('./config');

// Database configuration
const dbConfig = config.database;

async function resetDatabase() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Connect to the specific database
    await client.end();
    
    const dbClient = new Client({
      ...dbConfig,
      database: 'nc_product_matching'
    });
    
    await dbClient.connect();
    console.log('✅ Connected to nc_product_matching database\n');

    // Drop existing tables in reverse order
    console.log('🗑️ Dropping existing tables...');
    
    await dbClient.query('DROP TABLE IF EXISTS nc_product_matches CASCADE');
    await dbClient.query('DROP TABLE IF EXISTS nc_product_match_sessions CASCADE');
    await dbClient.query('DROP TABLE IF EXISTS nc_product_match_rules CASCADE');
    await dbClient.query('DROP TABLE IF EXISTS nc_product_match_brand_synonyms CASCADE');
    await dbClient.query('DROP TABLE IF EXISTS nc_product_match_sources CASCADE');
    
    console.log('✅ Dropped existing tables\n');

    // Create tables with correct schema
    console.log('📋 Creating tables...');
    
    // Create nc_product_match_sources table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_product_match_sources (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        base_config TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(255),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255)
      )
    `);
    console.log('✅ Created nc_product_match_sources table');

    // Create nc_product_match_brand_synonyms table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_product_match_brand_synonyms (
        id VARCHAR(20) PRIMARY KEY,
        tenant_id VARCHAR(255),
        brand_canonical VARCHAR(255) NOT NULL,
        brand_variant VARCHAR(255) NOT NULL,
        confidence DECIMAL(3,2),
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(255),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255)
      )
    `);
    console.log('✅ Created nc_product_match_brand_synonyms table');

    // Create nc_product_match_rules table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_product_match_rules (
        id VARCHAR(20) PRIMARY KEY,
        tenant_id VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        weights TEXT NOT NULL,
        price_band_pct DECIMAL(5,2) DEFAULT 15,
        algorithm VARCHAR(50) DEFAULT 'jarowinkler',
        min_score DECIMAL(3,2) DEFAULT 0.65,
        is_default BOOLEAN DEFAULT false,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(255),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255)
      )
    `);
    console.log('✅ Created nc_product_match_rules table');

    // Create nc_product_match_sessions table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_product_match_sessions (
        id VARCHAR(20) PRIMARY KEY,
        tenant_id VARCHAR(255),
        created_by VARCHAR(255),
        note TEXT,
        created_at VARCHAR(50) NOT NULL,
        updated_at VARCHAR(50)
      )
    `);
    console.log('✅ Created nc_product_match_sessions table');

    // Create nc_product_matches table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_product_matches (
        id VARCHAR(20) PRIMARY KEY,
        tenant_id VARCHAR(255),
        local_product_id VARCHAR(255) NOT NULL,
        external_product_key VARCHAR(255) NOT NULL,
        source_id VARCHAR(20) NOT NULL,
        score DECIMAL(3,2),
        price_delta_pct DECIMAL(8,2),
        rule_id VARCHAR(20),
        session_id VARCHAR(20),
        status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'rejected', 'superseded')),
        reviewed_by VARCHAR(255),
        reviewed_at VARCHAR(50),
        notes TEXT,
        version INTEGER DEFAULT 1,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(255),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255),
        FOREIGN KEY (source_id) REFERENCES nc_product_match_sources(id),
        FOREIGN KEY (rule_id) REFERENCES nc_product_match_rules(id),
        FOREIGN KEY (session_id) REFERENCES nc_product_match_sessions(id)
      )
    `);
    console.log('✅ Created nc_product_matches table');

    // Create indexes
    console.log('📊 Creating indexes...');
    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_product_matches_tenant_local 
      ON nc_product_matches(tenant_id, local_product_id)
    `);
    
    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_product_matches_tenant_external 
      ON nc_product_matches(tenant_id, external_product_key, source_id)
    `);

    // Insert sample data
    console.log('📝 Inserting sample data...');
    
    // Insert sample sources
    await dbClient.query(`
      INSERT INTO nc_product_match_sources (id, name, code, base_config, is_active, created_at)
      VALUES 
        ('src-amazon-001', 'Amazon', 'AMZ', '{"baseId": "b_amz", "productsTable": "products"}', true, NOW()),
        ('src-target-001', 'Target', 'TGT', '{"baseId": "b_tgt", "productsTable": "products"}', true, NOW()),
        ('src-walmart-001', 'Walmart', 'WMT', '{"baseId": "b_wmt", "productsTable": "products"}', true, NOW())
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('✅ Inserted sample sources');

    // Insert sample rules
    await dbClient.query(`
      INSERT INTO nc_product_match_rules (id, name, weights, price_band_pct, algorithm, min_score, is_default, created_at)
      VALUES 
        ('rule-default-001', 'Default Rule', '{"name": 0.4, "brand": 0.3, "category": 0.2, "price": 0.1}', 15, 'jarowinkler', 0.65, true, NOW()),
        ('rule-strict-001', 'Strict Rule', '{"name": 0.5, "brand": 0.4, "category": 0.1, "price": 0.0}', 10, 'jarowinkler', 0.8, false, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Inserted sample rules');

    // Insert sample brand synonyms
    await dbClient.query(`
      INSERT INTO nc_product_match_brand_synonyms (id, brand_canonical, brand_variant, confidence, created_at)
      VALUES 
        ('syn-001', 'Nike', 'Nike Inc.', 0.95, NOW()),
        ('syn-002', 'Nike', 'Nike Brand', 0.90, NOW()),
        ('syn-003', 'Adidas', 'Adidas AG', 0.95, NOW()),
        ('syn-004', 'Adidas', 'Adidas Brand', 0.90, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Inserted sample brand synonyms');

    console.log('\n🎉 Database reset completed successfully!');
    console.log('\n📋 Database Summary:');
    console.log('   - Database: nc_product_matching');
    console.log('   - Tables: 5 (sources, rules, sessions, matches, brand_synonyms)');
    console.log('   - Sample data: 3 sources, 2 rules, 4 brand synonyms');
    console.log('\n🔧 Next steps:');
    console.log('   1. Start the API server: npm start');
    console.log('   2. Test with Postman');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
  } finally {
    await client.end();
  }
}

// Run the reset
resetDatabase().catch(console.error);
