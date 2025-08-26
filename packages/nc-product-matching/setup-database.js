const { Client } = require('pg');
const config = require('./config');

// Database configuration
const dbConfig = config.database;

async function setupDatabase() {
  const client = new Client(dbConfig);
  
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Create database if it doesn't exist
    console.log('🗄️ Creating database...');
    try {
      await client.query('CREATE DATABASE nc_product_matching');
      console.log('✅ Database created successfully');
    } catch (error) {
      if (error.code === '42P04') {
        console.log('ℹ️ Database already exists');
      } else {
        throw error;
      }
    }

    // Connect to the specific database
    await client.end();
    
    const dbClient = new Client({
      ...dbConfig,
      database: 'testdb01'
    });
    
    await dbClient.connect();
    console.log('✅ Connected to testdb01 database\n');

    // Create tables
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

    // Create nc_internal_products table (for internal product catalog)
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_internal_products (
        id VARCHAR(20) PRIMARY KEY,
        tenant_id VARCHAR(255),
        title VARCHAR(500) NOT NULL,
        brand VARCHAR(255),
        category_id VARCHAR(100),
        price DECIMAL(10,2),
        gtin VARCHAR(50),
        sku VARCHAR(100),
        description TEXT,
        image_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(255),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255)
      )
    `);
    console.log('✅ Created nc_internal_products table');

    // Create nc_external_products table (for scraped external data)
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_external_products (
        id VARCHAR(20) PRIMARY KEY,
        external_product_key VARCHAR(255) NOT NULL,
        source_id VARCHAR(20) NOT NULL,
        title VARCHAR(500) NOT NULL,
        brand VARCHAR(255),
        category_id VARCHAR(100),
        price DECIMAL(10,2),
        gtin VARCHAR(50),
        sku VARCHAR(100),
        description TEXT,
        image_url VARCHAR(500),
        product_url VARCHAR(500),
        availability BOOLEAN DEFAULT true,
        last_scraped_at VARCHAR(50),
        created_at VARCHAR(50) NOT NULL,
        updated_at VARCHAR(50),
        FOREIGN KEY (source_id) REFERENCES nc_product_match_sources(id)
      )
    `);
    console.log('✅ Created nc_external_products table');

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
        local_product_id VARCHAR(20) NOT NULL,
        external_product_key VARCHAR(255) NOT NULL,
        source_id VARCHAR(20) NOT NULL,
        score DECIMAL(3,2),
        price_delta_pct DECIMAL(8,2),
        rule_id VARCHAR(20),
        session_id VARCHAR(20),
        status VARCHAR(20) DEFAULT 'matched' CHECK (status IN ('matched', 'not_matched', 'superseded')),
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
        FOREIGN KEY (session_id) REFERENCES nc_product_match_sessions(id),
        FOREIGN KEY (local_product_id) REFERENCES nc_internal_products(id)
      )
    `);
    console.log('✅ Created nc_product_matches table');

    // Create nc_media_assets table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_media_assets (
        id VARCHAR(20) PRIMARY KEY,
        tenant_id VARCHAR(255),
        url VARCHAR(1000) NOT NULL,
        type VARCHAR(50) DEFAULT 'image',
        alt_text VARCHAR(500),
        checksum VARCHAR(100),
        width INTEGER,
        height INTEGER,
        meta TEXT,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(255),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255)
      )
    `);
    console.log('✅ Created nc_media_assets table');

    // Create nc_media_links table
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS nc_media_links (
        id VARCHAR(20) PRIMARY KEY,
        tenant_id VARCHAR(255),
        media_id VARCHAR(20) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(20) NOT NULL,
        role VARCHAR(50) DEFAULT 'main',
        sort_order INTEGER DEFAULT 1,
        created_at VARCHAR(50) NOT NULL,
        created_by VARCHAR(255),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255),
        FOREIGN KEY (media_id) REFERENCES nc_media_assets(id)
      )
    `);
    console.log('✅ Created nc_media_links table');

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

    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_internal_products_tenant 
      ON nc_internal_products(tenant_id, is_active)
    `);

    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_external_products_source 
      ON nc_external_products(source_id, availability)
    `);

    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_media_links_entity 
      ON nc_media_links(entity_type, entity_id, role)
    `);

    await dbClient.query(`
      CREATE INDEX IF NOT EXISTS idx_media_assets_tenant 
      ON nc_media_assets(tenant_id, type)
    `);

    // Insert sample data
    console.log('📝 Inserting sample data...');
    
    // Insert sample sources
    await dbClient.query(`
      INSERT INTO nc_product_match_sources (id, name, code, base_config, is_active, created_at)
      VALUES 
        ('src-amazon-001', 'Amazon', 'AMZ', '{"baseId": "b_amz", "productsTable": "products"}', true, NOW()),
        ('src-target-001', 'Target', 'TGT', '{"baseId": "b_tgt", "productsTable": "products"}', true, NOW()),
        ('src-walmart-001', 'Walmart', 'WMT', '{"baseId": "b_wmt", "productsTable": "products"}', true, NOW()),
        ('src-buybuy-001', 'BuyBuy Baby', 'BBB', '{"baseId": "b_bbb", "productsTable": "products"}', true, NOW()),
        ('src-babies-001', 'Babies R Us', 'BRU', '{"baseId": "b_bru", "productsTable": "products"}', true, NOW())
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

    // Insert sample brand synonyms for stroller brands
    await dbClient.query(`
      INSERT INTO nc_product_match_brand_synonyms (id, brand_canonical, brand_variant, confidence, created_at)
      VALUES 
        ('syn-uppababy-001', 'UPPAbaby', 'UPPAbaby Inc.', 0.95, NOW()),
        ('syn-uppababy-002', 'UPPAbaby', 'UPPAbaby Brand', 0.90, NOW()),
        ('syn-bugaboo-001', 'Bugaboo', 'Bugaboo International', 0.95, NOW()),
        ('syn-bugaboo-002', 'Bugaboo', 'Bugaboo Brand', 0.90, NOW()),
        ('syn-nuna-001', 'Nuna', 'Nuna International', 0.95, NOW()),
        ('syn-nuna-002', 'Nuna', 'Nuna Brand', 0.90, NOW()),
        ('syn-cybex-001', 'Cybex', 'Cybex GmbH', 0.95, NOW()),
        ('syn-cybex-002', 'Cybex', 'Cybex Brand', 0.90, NOW()),
        ('syn-thule-001', 'Thule', 'Thule Group', 0.95, NOW()),
        ('syn-thule-002', 'Thule', 'Thule Brand', 0.90, NOW()),
        ('syn-graco-001', 'Graco', 'Graco Children''s Products', 0.95, NOW()),
        ('syn-graco-002', 'Graco', 'Graco Brand', 0.90, NOW()),
        ('syn-chicco-001', 'Chicco', 'Chicco USA', 0.95, NOW()),
        ('syn-chicco-002', 'Chicco', 'Chicco Brand', 0.90, NOW()),
        ('syn-evenflo-001', 'Evenflo', 'Evenflo Company', 0.95, NOW()),
        ('syn-evenflo-002', 'Evenflo', 'Evenflo Brand', 0.90, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Inserted sample brand synonyms');

    // Insert internal products (baby strollers)
    await dbClient.query(`
      INSERT INTO nc_internal_products (id, tenant_id, title, brand, category_id, price, gtin, sku, description, image_url, is_active, created_at)
      VALUES 
        ('int-001', 'default', 'UPPAbaby VISTA V2 Stroller', 'UPPAbaby', 'strollers', 969.99, '1234567890123', 'UP-VISTA-V2', 'Premium travel system with bassinet and toddler seat', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-002', 'default', 'Bugaboo Fox 3 Stroller', 'Bugaboo', 'strollers', 1299.00, '1234567890124', 'BUG-FOX-3', 'Compact fold stroller with premium materials', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-003', 'default', 'Nuna MIXX Next Stroller', 'Nuna', 'strollers', 649.95, '1234567890125', 'NUN-MIXX-NEXT', 'Lightweight stroller with one-handed fold', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-004', 'default', 'Cybex Gazelle S Stroller', 'Cybex', 'strollers', 849.95, '1234567890126', 'CYB-GAZ-S', 'Modular stroller system with multiple configurations', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-005', 'default', 'Thule Spring Stroller', 'Thule', 'strollers', 399.95, '1234567890127', 'THU-SPRING', 'Compact jogging stroller for active families', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-006', 'default', 'Graco Modes Pramette Stroller', 'Graco', 'strollers', 299.99, '1234567890128', 'GRA-MODES-PRAM', '3-in-1 travel system with infant car seat', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-007', 'default', 'Chicco Bravo Trio Travel System', 'Chicco', 'strollers', 399.99, '1234567890129', 'CHI-BRAVO-TRIO', 'Complete travel system with car seat and stroller', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-008', 'default', 'Evenflo Pivot Xpand Modular Travel System', 'Evenflo', 'strollers', 369.99, '1234567890130', 'EVN-PIVOT-XPAND', 'Modular system that grows with your family', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-009', 'default', 'Babyzen YOYO2 Stroller', 'Babyzen', 'strollers', 499.99, '1234567890131', 'BAB-YOYO-2', 'Ultra-compact stroller that fits in overhead bin', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW()),
        ('int-010', 'default', 'Britax B-Free Stroller', 'Britax', 'strollers', 379.99, '1234567890132', 'BRI-B-FREE', 'Lightweight stroller with one-handed fold', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', true, NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Inserted internal products');

    // Insert external products (scraped from various sources)
    await dbClient.query(`
      INSERT INTO nc_external_products (id, external_product_key, source_id, title, brand, category_id, price, gtin, sku, description, image_url, product_url, availability, last_scraped_at, created_at)
      VALUES 
        -- Amazon products
        ('ext-amz-001', 'AMZ-UPPAbaby-VISTA-V2', 'src-amazon-001', 'UPPAbaby VISTA V2 Stroller - Premium Travel System', 'UPPAbaby', 'strollers', 949.99, '1234567890123', 'AMZ-UP-VISTA-V2', 'Premium travel system with bassinet and toddler seat', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://amazon.com/product1', true, NOW(), NOW()),
        ('ext-amz-002', 'AMZ-Bugaboo-Fox-3', 'src-amazon-001', 'Bugaboo Fox 3 Compact Fold Stroller', 'Bugaboo', 'strollers', 1249.00, '1234567890124', 'AMZ-BUG-FOX-3', 'Compact fold stroller with premium materials', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://amazon.com/product2', true, NOW(), NOW()),
        ('ext-amz-003', 'AMZ-Nuna-MIXX-Next', 'src-amazon-001', 'Nuna MIXX Next Lightweight Stroller', 'Nuna', 'strollers', 629.95, '1234567890125', 'AMZ-NUN-MIXX-NEXT', 'Lightweight stroller with one-handed fold', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://amazon.com/product3', true, NOW(), NOW()),
        
        -- Target products
        ('ext-tgt-001', 'TGT-UPPAbaby-VISTA-V2', 'src-target-001', 'UPPAbaby VISTA V2 Travel System', 'UPPAbaby', 'strollers', 989.99, '1234567890123', 'TGT-UP-VISTA-V2', 'Premium travel system with bassinet and toddler seat', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://target.com/product1', true, NOW(), NOW()),
        ('ext-tgt-002', 'TGT-Graco-Modes-Pramette', 'src-target-001', 'Graco Modes Pramette 3-in-1 Travel System', 'Graco', 'strollers', 279.99, '1234567890128', 'TGT-GRA-MODES-PRAM', '3-in-1 travel system with infant car seat', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://target.com/product2', true, NOW(), NOW()),
        ('ext-tgt-003', 'TGT-Chicco-Bravo-Trio', 'src-target-001', 'Chicco Bravo Trio Travel System', 'Chicco', 'strollers', 379.99, '1234567890129', 'TGT-CHI-BRAVO-TRIO', 'Complete travel system with car seat and stroller', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://target.com/product3', true, NOW(), NOW()),
        
        -- Walmart products
        ('ext-wmt-001', 'WMT-Cybex-Gazelle-S', 'src-walmart-001', 'Cybex Gazelle S Modular Stroller System', 'Cybex', 'strollers', 829.95, '1234567890126', 'WMT-CYB-GAZ-S', 'Modular stroller system with multiple configurations', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://walmart.com/product1', true, NOW(), NOW()),
        ('ext-wmt-002', 'WMT-Thule-Spring', 'src-walmart-001', 'Thule Spring Compact Jogging Stroller', 'Thule', 'strollers', 379.95, '1234567890127', 'WMT-THU-SPRING', 'Compact jogging stroller for active families', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://walmart.com/product2', true, NOW(), NOW()),
        ('ext-wmt-003', 'WMT-Evenflo-Pivot-Xpand', 'src-walmart-001', 'Evenflo Pivot Xpand Modular Travel System', 'Evenflo', 'strollers', 349.99, '1234567890130', 'WMT-EVN-PIVOT-XPAND', 'Modular system that grows with your family', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://walmart.com/product3', true, NOW(), NOW()),
        
        -- BuyBuy Baby products
        ('ext-bbb-001', 'BBB-Bugaboo-Fox-3', 'src-buybuy-001', 'Bugaboo Fox 3 Premium Stroller', 'Bugaboo', 'strollers', 1299.00, '1234567890124', 'BBB-BUG-FOX-3', 'Compact fold stroller with premium materials', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://buybuybaby.com/product1', true, NOW(), NOW()),
        ('ext-bbb-002', 'BBB-Nuna-MIXX-Next', 'src-buybuy-001', 'Nuna MIXX Next Stroller - Lightweight Design', 'Nuna', 'strollers', 659.95, '1234567890125', 'BBB-NUN-MIXX-NEXT', 'Lightweight stroller with one-handed fold', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://buybuybaby.com/product2', true, NOW(), NOW()),
        ('ext-bbb-003', 'BBB-Babyzen-YOYO2', 'src-buybuy-001', 'Babyzen YOYO2 Ultra-Compact Stroller', 'Babyzen', 'strollers', 479.99, '1234567890131', 'BBB-BAB-YOYO-2', 'Ultra-compact stroller that fits in overhead bin', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://buybuybaby.com/product3', true, NOW(), NOW()),
        
        -- Babies R Us products
        ('ext-bru-001', 'BRU-UPPAbaby-VISTA-V2', 'src-babies-001', 'UPPAbaby VISTA V2 Complete Travel System', 'UPPAbaby', 'strollers', 969.99, '1234567890123', 'BRU-UP-VISTA-V2', 'Premium travel system with bassinet and toddler seat', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://babiesrus.com/product1', true, NOW(), NOW()),
        ('ext-bru-002', 'BRU-Britax-B-Free', 'src-babies-001', 'Britax B-Free Lightweight Stroller', 'Britax', 'strollers', 359.99, '1234567890132', 'BRU-BRI-B-FREE', 'Lightweight stroller with one-handed fold', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://babiesrus.com/product2', true, NOW(), NOW()),
        ('ext-bru-003', 'BRU-Cybex-Gazelle-S', 'src-babies-001', 'Cybex Gazelle S Modular Stroller', 'Cybex', 'strollers', 859.95, '1234567890126', 'BRU-CYB-GAZ-S', 'Modular stroller system with multiple configurations', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center', 'https://babiesrus.com/product3', true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Inserted external products');

    // Insert some sample matches
    await dbClient.query(`
      INSERT INTO nc_product_matches (id, tenant_id, local_product_id, external_product_key, source_id, score, price_delta_pct, rule_id, status, reviewed_by, reviewed_at, notes, created_at)
      VALUES 
        ('match-001', 'default', 'int-001', 'AMZ-UPPAbaby-VISTA-V2', 'src-amazon-001', 0.95, -2.06, 'rule-default-001', 'matched', 'user-1', NOW(), 'High confidence match', NOW()),
        ('match-002', 'default', 'int-001', 'TGT-UPPAbaby-VISTA-V2', 'src-target-001', 0.92, 2.06, 'rule-default-001', 'matched', 'user-1', NOW(), 'Good match with slight price difference', NOW()),
        ('match-003', 'default', 'int-002', 'AMZ-Bugaboo-Fox-3', 'src-amazon-001', 0.94, -3.85, 'rule-default-001', 'matched', 'user-1', NOW(), 'Excellent match', NOW()),
        ('match-004', 'default', 'int-003', 'AMZ-Nuna-MIXX-Next', 'src-amazon-001', 0.91, -3.08, 'rule-default-001', 'matched', 'user-1', NOW(), 'Good match', NOW()),
        ('match-005', 'default', 'int-004', 'WMT-Cybex-Gazelle-S', 'src-walmart-001', 0.93, -2.35, 'rule-default-001', 'matched', 'user-1', NOW(), 'High confidence match', NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('✅ Inserted sample matches');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Database Summary:');
    console.log('   - Database: testdb01');
    console.log('   - Tables: 7 (sources, internal_products, external_products, rules, sessions, matches, brand_synonyms)');
    console.log('   - Sample data:');
    console.log('     • 5 sources (Amazon, Target, Walmart, BuyBuy Baby, Babies R Us)');
    console.log('     • 10 internal products (baby strollers)');
    console.log('     • 15 external products (scraped from sources)');
    console.log('     • 2 rules (default and strict)');
    console.log('     • 16 brand synonyms (stroller brands)');
    console.log('     • 5 sample matches');
    console.log('\n🔧 Next steps:');
    console.log('   1. Update the backend service to use the new tables');
    console.log('   2. Start the API server');
    console.log('   3. Test the product matching functionality');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
  } finally {
    await client.end();
  }
}

// Run the setup
setupDatabase().catch(console.error);
