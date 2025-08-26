const { Client } = require('pg');
const dbConfig = require('./config.js');

// Product categories and their subcategories
const PRODUCT_CATEGORIES = {
  'baby-gear': {
    'strollers': {
      brands: ['UPPAbaby', 'Bugaboo', 'Nuna', 'Cybex', 'Thule', 'Graco', 'Chicco', 'Evenflo', 'Babyzen', 'Britax'],
      priceRange: { min: 150, max: 1500 },
      features: ['Travel System', 'Lightweight', 'Compact Fold', 'Jogging', 'All-Terrain', 'Double', 'Modular']
    },
    'car-seats': {
      brands: ['Graco', 'Chicco', 'Evenflo', 'Britax', 'Maxi-Cosi', 'Clek', 'Diono', 'Safety 1st', 'Cosco', 'UPPAbaby'],
      priceRange: { min: 50, max: 500 },
      features: ['Infant', 'Convertible', 'Booster', 'All-in-One', 'Travel System', 'Side Impact Protection']
    },
    'high-chairs': {
      brands: ['Graco', 'Chicco', 'Evenflo', 'Fisher-Price', 'Summer Infant', 'Inglesina', 'Stokke', 'Peg Perego'],
      priceRange: { min: 30, max: 300 },
      features: ['Convertible', 'Space Saver', 'Portable', 'Adjustable Height', 'Easy Clean', 'Foldable']
    }
  },
  'toys': {
    'educational': {
      brands: ['Fisher-Price', 'VTech', 'LeapFrog', 'Melissa & Doug', 'Learning Resources', 'Educational Insights'],
      priceRange: { min: 10, max: 100 },
      features: ['STEM', 'Interactive', 'Bilingual', 'Age-Appropriate', 'Battery-Operated', 'Wooden']
    },
    'outdoor': {
      brands: ['Little Tikes', 'Step2', 'Radio Flyer', 'Playskool', 'Fisher-Price', 'KidKraft'],
      priceRange: { min: 20, max: 200 },
      features: ['Ride-On', 'Slides', 'Swings', 'Playhouses', 'Water Toys', 'Sports Equipment']
    }
  },
  'clothing': {
    'boys': {
      brands: ['Carter\'s', 'OshKosh B\'gosh', 'The Children\'s Place', 'Gap Kids', 'Old Navy', 'H&M Kids'],
      priceRange: { min: 5, max: 50 },
      features: ['Organic Cotton', 'Quick-Dry', 'UV Protection', 'Stain Resistant', 'Adjustable', 'Seasonal']
    },
    'girls': {
      brands: ['Carter\'s', 'OshKosh B\'gosh', 'The Children\'s Place', 'Gap Kids', 'Old Navy', 'H&M Kids'],
      priceRange: { min: 5, max: 60 },
      features: ['Organic Cotton', 'Quick-Dry', 'UV Protection', 'Stain Resistant', 'Adjustable', 'Seasonal']
    }
  }
};

// Retail sources with their characteristics
const RETAIL_SOURCES = [
  { id: 'src-amazon-001', name: 'Amazon', code: 'AMZ', priceAdjustment: { min: -15, max: 5 } },
  { id: 'src-target-001', name: 'Target', code: 'TGT', priceAdjustment: { min: -10, max: 10 } },
  { id: 'src-walmart-001', name: 'Walmart', code: 'WMT', priceAdjustment: { min: -20, max: 0 } },
  { id: 'src-buybuy-001', name: 'BuyBuy Baby', code: 'BBB', priceAdjustment: { min: -5, max: 15 } },
  { id: 'src-babies-001', name: 'Babies R Us', code: 'BRU', priceAdjustment: { min: -8, max: 12 } },
  { id: 'src-toysrus-001', name: 'Toys R Us', code: 'TRU', priceAdjustment: { min: -12, max: 8 } },
  { id: 'src-kohls-001', name: 'Kohl\'s', code: 'KOH', priceAdjustment: { min: -25, max: 5 } },
  { id: 'src-macys-001', name: 'Macy\'s', code: 'MAC', priceAdjustment: { min: -15, max: 20 } }
];

// Utility functions
function generateId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomPrice(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function generateProductName(brand, category, features) {
  const feature = randomChoice(features);
  const categoryName = category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
  return `${brand} ${feature} ${categoryName}`;
}

function generateGTIN() {
  return Math.floor(Math.random() * 9000000000000) + 1000000000000;
}

function generateSKU(brand, category) {
  const brandCode = brand.substring(0, 3).toUpperCase();
  const categoryCode = category.substring(0, 3).toUpperCase();
  const randomNum = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${brandCode}-${categoryCode}-${randomNum}`;
}

async function dumpData() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM nc_product_matches');
    await client.query('DELETE FROM nc_external_products');
    await client.query('DELETE FROM nc_internal_products');
    await client.query('DELETE FROM nc_product_match_brand_synonyms');
    console.log('✅ Cleared existing data');

    // Insert brand synonyms for all brands
    console.log('📝 Inserting brand synonyms...');
    const allBrands = new Set();
    for (const category of Object.values(PRODUCT_CATEGORIES)) {
      for (const subcategory of Object.values(category)) {
        for (const brand of subcategory.brands) {
          allBrands.add(brand);
        }
      }
    }

    for (const brand of allBrands) {
      const synonyms = [
        `${brand} Inc.`,
        `${brand} International`,
        `${brand} Brand`,
        `${brand} Company`,
        `${brand} USA`
      ];
      
      for (const synonym of synonyms) {
        await client.query(`
          INSERT INTO nc_product_match_brand_synonyms (id, brand_canonical, brand_variant, confidence, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (id) DO NOTHING
        `, [
          `syn-${brand.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 8)}`,
          brand,
          synonym,
          Math.random() * 0.1 + 0.9 // 0.9 to 1.0
        ]);
      }
    }
    console.log('✅ Inserted brand synonyms');

    // Insert retail sources
    console.log('📝 Inserting retail sources...');
    for (const source of RETAIL_SOURCES) {
      await client.query(`
        INSERT INTO nc_product_match_sources (id, name, code, description, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        source.id,
        source.name,
        source.code,
        `${source.name} - ${source.code} retail source for product matching`,
        true
      ]);
    }
    console.log(`✅ Inserted ${RETAIL_SOURCES.length} retail sources`);

    // Generate internal products
    console.log('📝 Generating internal products...');
    const internalProducts = [];
    let productIndex = 1;

    for (const [category, subcategories] of Object.entries(PRODUCT_CATEGORIES)) {
      for (const [subcategory, config] of Object.entries(subcategories)) {
        const numProducts = Math.floor(Math.random() * 8) + 3; // 3-10 products per subcategory
        
        for (let i = 0; i < numProducts; i++) {
          const brand = randomChoice(config.brands);
          const features = randomChoice(config.features);
          const title = generateProductName(brand, subcategory, config.features);
          const price = randomPrice(config.priceRange.min, config.priceRange.max);
          const gtin = generateGTIN();
          const sku = generateSKU(brand, subcategory);
          
          const product = {
            id: generateId('int', productIndex++),
            tenant_id: 'default',
            title,
            brand,
            category_id: subcategory,
            price,
            gtin: gtin.toString(),
            sku,
            description: `${title} - ${features} design for optimal comfort and safety.`,
            image_url: `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center&v=${Math.random()}`,
            is_active: true,
            created_at: new Date().toISOString()
          };
          
          internalProducts.push(product);
          
          await client.query(`
            INSERT INTO nc_internal_products (id, tenant_id, title, brand, category_id, price, gtin, sku, description, image_url, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO NOTHING
          `, [
            product.id, product.tenant_id, product.title, product.brand, product.category_id,
            product.price, product.gtin, product.sku, product.description, product.image_url,
            product.is_active, product.created_at
          ]);
        }
      }
    }
    console.log(`✅ Generated ${internalProducts.length} internal products`);

    // Generate external products for each source
    console.log('📝 Generating external products...');
    const externalProducts = [];
    let externalIndex = 1;

    for (const source of RETAIL_SOURCES) {
      // Generate 2-4 external products for each internal product
      for (const internalProduct of internalProducts) {
        const numExternal = Math.floor(Math.random() * 3) + 2; // 2-4 external products per internal
        
        for (let i = 0; i < numExternal; i++) {
          const priceAdjustment = randomPrice(source.priceAdjustment.min, source.priceAdjustment.max) / 100;
          const externalPrice = internalProduct.price * (1 + priceAdjustment);
          
          // Slightly modify the title for external products
          const titleVariations = [
            internalProduct.title,
            `${internalProduct.title} - ${randomChoice(['Premium', 'Deluxe', 'Standard', 'Basic'])}`,
            `${internalProduct.title} ${randomChoice(['Pro', 'Plus', 'Elite', 'Classic'])}`,
            internalProduct.title.replace(internalProduct.brand, `${internalProduct.brand} Brand`)
          ];
          
          const externalTitle = randomChoice(titleVariations);
          const externalGTIN = Math.random() > 0.7 ? internalProduct.gtin : generateGTIN().toString(); // 30% chance of same GTIN
          
          const externalProduct = {
            id: generateId('ext', externalIndex++),
            external_product_key: `${source.code}-${internalProduct.sku}-${i + 1}`,
            source_id: source.id,
            title: externalTitle,
            brand: internalProduct.brand,
            category_id: internalProduct.category_id,
            price: Math.round(externalPrice * 100) / 100,
            gtin: externalGTIN,
            sku: `${source.code}-${internalProduct.sku}`,
            description: `${externalTitle} - Available at ${source.name}. ${internalProduct.description}`,
            image_url: internalProduct.image_url,
            product_url: `https://${source.name.toLowerCase().replace(/\s+/g, '')}.com/product/${Math.random().toString(36).substring(2, 8)}`,
            availability: Math.random() > 0.1, // 90% chance of being available
            last_scraped_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          };
          
          externalProducts.push(externalProduct);
          
          await client.query(`
            INSERT INTO nc_external_products (id, external_product_key, source_id, title, brand, category_id, price, gtin, sku, description, image_url, product_url, availability, last_scraped_at, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (id) DO NOTHING
          `, [
            externalProduct.id, externalProduct.external_product_key, externalProduct.source_id,
            externalProduct.title, externalProduct.brand, externalProduct.category_id, externalProduct.price,
            externalProduct.gtin, externalProduct.sku, externalProduct.description, externalProduct.image_url,
            externalProduct.product_url, externalProduct.availability, externalProduct.last_scraped_at, externalProduct.created_at
          ]);
        }
      }
    }
    console.log(`✅ Generated ${externalProducts.length} external products`);

    // Generate some sample matches
    console.log('📝 Generating sample matches...');
    let matchIndex = 1;
    const matchCount = Math.floor(externalProducts.length * 0.3); // 30% of external products will have matches
    
    for (let i = 0; i < matchCount; i++) {
      const externalProduct = randomChoice(externalProducts);
      const internalProduct = internalProducts.find(p => p.brand === externalProduct.brand && p.category_id === externalProduct.category_id);
      
      if (internalProduct) {
        const score = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
        const priceDelta = ((externalProduct.price - internalProduct.price) / internalProduct.price) * 100;
        const status = Math.random() > 0.3 ? 'matched' : 'not_matched'; // 70% matched, 30% not matched
        
        await client.query(`
          INSERT INTO nc_product_matches (id, tenant_id, local_product_id, external_product_key, source_id, score, price_delta_pct, rule_id, status, reviewed_by, reviewed_at, notes, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO NOTHING
        `, [
          generateId('match', matchIndex++),
          'default',
          internalProduct.id,
          externalProduct.external_product_key,
          externalProduct.source_id,
          Math.round(score * 100) / 100,
          Math.round(priceDelta * 100) / 100,
          'rule-default-001',
          status,
          'system',
          new Date().toISOString(),
          `${status === 'matched' ? 'High confidence' : 'Low confidence'} match between ${internalProduct.title} and ${externalProduct.title}`,
          new Date().toISOString()
        ]);
      }
    }
    console.log(`✅ Generated ${matchIndex - 1} sample matches`);

    // Print summary
    console.log('\n🎉 Data dump completed successfully!');
    console.log('\n📊 Database Summary:');
    
    const internalCount = await client.query('SELECT COUNT(*) FROM nc_internal_products');
    const externalCount = await client.query('SELECT COUNT(*) FROM nc_external_products');
    const matchCountResult = await client.query('SELECT COUNT(*) FROM nc_product_matches');
    const sourceCount = await client.query('SELECT COUNT(*) FROM nc_product_match_sources');
    const synonymCount = await client.query('SELECT COUNT(*) FROM nc_product_match_brand_synonyms');
    
    console.log(`   • Internal Products: ${internalCount.rows[0].count}`);
    console.log(`   • External Products: ${externalCount.rows[0].count}`);
    console.log(`   • Product Matches: ${matchCountResult.rows[0].count}`);
    console.log(`   • Data Sources: ${sourceCount.rows[0].count}`);
    console.log(`   • Brand Synonyms: ${synonymCount.rows[0].count}`);
    
    console.log('\n📋 Product Categories:');
    for (const [category, subcategories] of Object.entries(PRODUCT_CATEGORIES)) {
      console.log(`   • ${category}:`);
      for (const [subcategory, config] of Object.entries(subcategories)) {
        const count = internalProducts.filter(p => p.category_id === subcategory).length;
        console.log(`     - ${subcategory}: ${count} products`);
      }
    }
    
    console.log('\n🏪 Retail Sources:');
    for (const source of RETAIL_SOURCES) {
      const count = externalProducts.filter(p => p.source_id === source.id).length;
      console.log(`   • ${source.name} (${source.code}): ${count} products`);
    }

  } catch (error) {
    console.error('❌ Error dumping data:', error);
  } finally {
    await client.end();
  }
}

// Run the data dump
dumpData().catch(console.error);
