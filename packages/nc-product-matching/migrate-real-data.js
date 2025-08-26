const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const csv = require('csv-parser');
const dbConfig = require('./config.js').database;

// Utility functions
function generateId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

function cleanString(str) {
  if (!str) return '';
  return str.replace(/[^\w\s-]/g, '').trim();
}

function normalizeBrand(brand) {
  if (!brand) return 'Unknown';
  return brand.trim();
}

function normalizeCategory(categoryName) {
  if (!categoryName) return 'other';
  
  // Map Spanish categories to English equivalents
  const categoryMap = {
    'Dormir': 'sleep',
    'Pasear': 'strollers',
    'Comer': 'feeding',
    'Textil': 'textiles',
    'Accesorios': 'accessories',
    'Juguetes educativos': 'educational-toys',
    'Juguetes': 'toys',
    'Calzado': 'footwear',
    'Viajar': 'travel',
    'Baño': 'bath',
    'Vestir': 'clothing',
    'Higiene': 'hygiene',
    'Protección solar': 'sun-protection',
    'Embarazo': 'pregnancy',
    'Salud y cuidado': 'health-care',
    'Sillas de coche': 'car-seats',
    'Ropa': 'clothing',
    'Aprender': 'learning',
    'Lactancia': 'nursing',
    'Bolsos para bebés': 'baby-bags',
    'Maternidad': 'maternity',
    'Juguetes y estimulación': 'toys-stimulation',
    'Baño e Higiene': 'bath-hygiene',
    'Patinetes y accesorios': 'scooters-accessories',
    'Protección': 'protection',
    'Baño y piscina': 'bath-pool',
    'Aprendizaje': 'learning',
    'Juguetes y regalos para bebés': 'baby-toys-gifts',
    'Cambiar': 'changing',
    'Natación': 'swimming',
    'Juguetes y Regalos': 'toys-gifts',
    'Seguridad infantil': 'child-safety',
    'Juguetes musicales': 'musical-toys',
    'Comer/Dormir': 'feeding-sleeping',
    'Viaje': 'travel',
    'Complementos de baño': 'bath-accessories',
    'Alimentación': 'feeding',
    'Chupeteros': 'pacifier-holders',
    'Juguetes para bebés': 'baby-toys',
    'Accesorios para alimentación': 'feeding-accessories',
    'Juguetes y regalos': 'toys-gifts',
    'Cambiadores para bebés': 'baby-changers',
    'Estimulación': 'stimulation',
    'Seguridad para bebés': 'baby-safety',
    'Apego': 'attachment',
    'Andadores para bebés y niños': 'baby-walkers',
    'Recambios cochecitos': 'stroller-parts',
    'Patinetes y sillas de paseo': 'scooters-strollers',
    'Casa y descanso': 'home-rest',
    'Baño e higiene bebés': 'baby-bath-hygiene',
    'Madres': 'mothers',
    'Textil para cuna': 'crib-textiles',
    'Bañeras': 'bathtubs',
    'Accesorios para bebés': 'baby-accessories',
    'Cuidado del bebé': 'baby-care',
    'Regalos': 'gifts',
    'Seguridad Vehicular': 'vehicle-safety',
    'Movilidad': 'mobility',
    'Cambiadores': 'changers',
    'Aseo': 'grooming',
    'Bolsos de maternidad y maletas': 'maternity-bags-luggage',
    'Complementos para cochecitos': 'stroller-accessories',
    'Accesorios paseo': 'walking-accessories',
    'Accesorios viaje': 'travel-accessories',
    'Textil infantil': 'children-textiles',
    'Regalos y recuerdos': 'gifts-souvenirs',
    'Juguetes y entretenimiento': 'toys-entertainment',
    'Recambios para cochecitos': 'stroller-replacements',
    'Accesorios de paseo': 'walking-accessories',
    'Accesorios para trona': 'high-chair-accessories',
    'Bolsos para cochecitos': 'stroller-bags',
    'Complementos para sillas de paseo': 'stroller-seat-accessories',
    'Equipamiento para bebé': 'baby-equipment'
  };
  
  return categoryMap[categoryName] || 'other';
}

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function migrateRealData() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM nc_product_matches');
    await client.query('DELETE FROM nc_media_links');
    await client.query('DELETE FROM nc_media_assets');
    await client.query('DELETE FROM nc_external_products');
    await client.query('DELETE FROM nc_internal_products');
    await client.query('DELETE FROM nc_product_match_brand_synonyms');
    await client.query('DELETE FROM nc_product_match_sources');
    console.log('✅ Cleared existing data');

    // Read CSV files
    console.log('📖 Reading CSV files...');
    const csvDir = path.join(__dirname, '../../dumb data');
    
    const categories = await readCSV(path.join(csvDir, 'categories_202508231359.csv'));
    const products = await readCSV(path.join(csvDir, 'products_202508231359.csv'));
    const skus = await readCSV(path.join(csvDir, 'skus_202508231359.csv'));
    const sources = await readCSV(path.join(csvDir, 'source_catalog_202508231359.csv'));
    const mediaAssets = await readCSV(path.join(csvDir, 'media_assets_202508231359.csv'));
    const mediaLinks = await readCSV(path.join(csvDir, 'media_links_202508231359.csv'));
    
    console.log(`✅ Read ${categories.length} categories, ${products.length} products, ${skus.length} SKUs, ${sources.length} sources, ${mediaAssets.length} media assets, ${mediaLinks.length} media links`);

    // Insert sources
    console.log('📝 Inserting sources...');
    for (const source of sources) {
      await client.query(`
        INSERT INTO nc_product_match_sources (id, name, code, base_config, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO NOTHING
      `, [
        `src-${source.source_id}`,
        source.name,
        `SRC${source.source_id}`,
        JSON.stringify({ kind: source.kind, url: source.meta?.url || '' }),
        true
      ]);
    }
    console.log(`✅ Inserted ${sources.length} sources`);

    // Insert media assets
    console.log('📝 Inserting media assets...');
    const mediaAssetMap = {};
    for (const asset of mediaAssets) {
      const assetId = `media-${asset.media_id}`;
      mediaAssetMap[asset.media_id] = assetId;
      
      await client.query(`
        INSERT INTO nc_media_assets (id, tenant_id, url, type, alt_text, checksum, width, height, meta, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [
        assetId,
        'default',
        asset.url,
        asset.type || 'image',
        asset.alt_text || '',
        asset.checksum || '',
        asset.width ? parseInt(asset.width) : null,
        asset.height ? parseInt(asset.height) : null,
        asset.meta || '{}',
        new Date().toISOString()
      ]);
    }
    console.log(`✅ Inserted ${mediaAssets.length} media assets`);

    // Create category mapping
    const categoryMap = {};
    for (const category of categories) {
      categoryMap[category.category_id] = {
        id: category.category_id,
        name: category.name,
        normalized: normalizeCategory(category.name)
      };
    }

    // Insert internal products (from products + skus)
    console.log('📝 Inserting internal products...');
    const internalProducts = [];
    let productIndex = 1;

    for (const product of products) {
      // Find SKUs for this product
      const productSkus = skus.filter(sku => sku.product_id === product.product_id);
      
      if (productSkus.length === 0) continue;

      const category = categoryMap[product.category_id] || { normalized: 'other' };
      const brand = normalizeBrand(product.brand);
      
      for (const sku of productSkus) {
        // Find media asset for this product/sku
        const productMediaLink = mediaLinks.find(link => 
          (link.entity_type === 'product' && link.entity_id == product.product_id) ||
          (link.entity_type === 'sku' && link.entity_id == sku.sku_id)
        );
        
        let imageUrl = `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300&h=300&fit=crop&crop=center&v=${Math.random()}`;
        if (productMediaLink) {
          const mediaAsset = mediaAssets.find(asset => asset.media_id == productMediaLink.media_id);
          if (mediaAsset && mediaAsset.url) {
            imageUrl = mediaAsset.url;
          }
        }

        const internalProduct = {
          id: generateId('int', productIndex++),
          tenant_id: 'default',
          title: sku.sku_title || product.title,
          brand: brand,
          category_id: category.normalized,
          price: Math.random() * 200 + 20, // Generate realistic price
          gtin: sku.gtin && sku.gtin !== 'EAN-NO-DISPONIBLE' ? sku.gtin : null,
          sku: sku.internal_sku || sku.manufacturer_sku,
          description: product.description || `${sku.sku_title} - ${brand} product`,
          image_url: imageUrl,
          is_active: sku.status === 'published',
          created_at: new Date().toISOString(),
          original_product_id: product.product_id,
          original_sku_id: sku.sku_id
        };
        
        internalProducts.push(internalProduct);
        
        await client.query(`
          INSERT INTO nc_internal_products (id, tenant_id, title, brand, category_id, price, gtin, sku, description, image_url, is_active, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (id) DO NOTHING
        `, [
          internalProduct.id, internalProduct.tenant_id, internalProduct.title, internalProduct.brand,
          internalProduct.category_id, internalProduct.price, internalProduct.gtin, internalProduct.sku,
          internalProduct.description, internalProduct.image_url, internalProduct.is_active, internalProduct.created_at
        ]);
      }
    }
    console.log(`✅ Inserted ${internalProducts.length} internal products`);

    // Insert media links for internal products
    console.log('📝 Inserting media links...');
    let mediaLinkIndex = 1;
    for (const product of internalProducts) {
      // Find corresponding media links from the original data
      const originalMediaLinks = mediaLinks.filter(link => 
        (link.entity_type === 'product' && link.entity_id == product.original_product_id) ||
        (link.entity_type === 'sku' && link.entity_id == product.original_sku_id)
      );
      
      for (const link of originalMediaLinks) {
        const mediaAssetId = mediaAssetMap[link.media_id];
        if (mediaAssetId) {
          await client.query(`
            INSERT INTO nc_media_links (id, tenant_id, media_id, entity_type, entity_id, role, sort_order, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO NOTHING
          `, [
            generateId('link', mediaLinkIndex++),
            'default',
            mediaAssetId,
            'product',
            product.id,
            link.role || 'main',
            link.sort_order || 1,
            new Date().toISOString()
          ]);
        }
      }
    }
    console.log(`✅ Inserted ${mediaLinkIndex - 1} media links`);

    // Generate external products for each source
    console.log('📝 Generating external products...');
    const externalProducts = [];
    let externalIndex = 1;

    for (const source of sources) {
      for (const internalProduct of internalProducts) {
        // Generate 1-3 external products per internal product
        const numExternal = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < numExternal; i++) {
          const priceAdjustment = (Math.random() - 0.5) * 0.4; // ±20% price variation
          const externalPrice = internalProduct.price * (1 + priceAdjustment);
          
          // Create title variations
          const titleVariations = [
            internalProduct.title,
            `${internalProduct.title} - ${source.name}`,
            `${internalProduct.title} ${internalProduct.brand}`,
            `${internalProduct.brand} ${internalProduct.title}`
          ];
          
          const externalTitle = titleVariations[Math.floor(Math.random() * titleVariations.length)];
          const externalGTIN = internalProduct.gtin && Math.random() > 0.7 ? internalProduct.gtin : null;
          
          const externalProduct = {
            id: generateId('ext', externalIndex++),
            external_product_key: `${source.name}-${internalProduct.sku}-${i + 1}`,
            source_id: `src-${source.source_id}`,
            title: externalTitle,
            brand: internalProduct.brand,
            category_id: internalProduct.category_id,
            price: Math.round(externalPrice * 100) / 100,
            gtin: externalGTIN,
            sku: `${source.name}-${internalProduct.sku}`,
            description: `${externalTitle} - Available at ${source.name}. ${internalProduct.description}`,
            image_url: internalProduct.image_url,
            product_url: `https://${source.name}.com/product/${Math.random().toString(36).substring(2, 8)}`,
            availability: Math.random() > 0.1,
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

    // Generate brand synonyms
    console.log('📝 Generating brand synonyms...');
    const brands = [...new Set(internalProducts.map(p => p.brand))];
    
    for (const brand of brands) {
      if (brand === 'Unknown') continue;
      
      const synonyms = [
        `${brand} Inc.`,
        `${brand} International`,
        `${brand} Brand`,
        `${brand} Company`,
        `${brand} España`,
        `${brand} Europe`
      ];
      
      for (const synonym of synonyms) {
        await client.query(`
          INSERT INTO nc_product_match_brand_synonyms (id, brand_canonical, brand_variant, confidence, created_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (id) DO NOTHING
        `, [
          `syn-${brand.substring(0, 8).toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 6)}`,
          brand,
          synonym,
          Math.random() * 0.1 + 0.9
        ]);
      }
    }
    console.log(`✅ Generated brand synonyms for ${brands.length} brands`);

    // Generate sample matches
    console.log('📝 Generating sample matches...');
    let matchIndex = 1;
    const matchCount = Math.floor(externalProducts.length * 0.25); // 25% of external products will have matches
    
    for (let i = 0; i < matchCount; i++) {
      const externalProduct = externalProducts[Math.floor(Math.random() * externalProducts.length)];
      const internalProduct = internalProducts.find(p => 
        p.brand === externalProduct.brand && 
        p.category_id === externalProduct.category_id
      );
      
      if (internalProduct) {
        const score = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
        const priceDelta = ((externalProduct.price - internalProduct.price) / internalProduct.price) * 100;
        const status = Math.random() > 0.3 ? 'matched' : 'not_matched';
        
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
    console.log('\n🎉 Real data migration completed successfully!');
    console.log('\n📊 Database Summary:');
    
    const internalCount = await client.query('SELECT COUNT(*) FROM nc_internal_products');
    const externalCount = await client.query('SELECT COUNT(*) FROM nc_external_products');
    const matchCountResult = await client.query('SELECT COUNT(*) FROM nc_product_matches');
    const sourceCount = await client.query('SELECT COUNT(*) FROM nc_product_match_sources');
    const synonymCount = await client.query('SELECT COUNT(*) FROM nc_product_match_brand_synonyms');
    const mediaAssetCount = await client.query('SELECT COUNT(*) FROM nc_media_assets');
    const mediaLinkCount = await client.query('SELECT COUNT(*) FROM nc_media_links');
    
    console.log(`   • Internal Products: ${internalCount.rows[0].count}`);
    console.log(`   • External Products: ${externalCount.rows[0].count}`);
    console.log(`   • Product Matches: ${matchCountResult.rows[0].count}`);
    console.log(`   • Data Sources: ${sourceCount.rows[0].count}`);
    console.log(`   • Brand Synonyms: ${synonymCount.rows[0].count}`);
    console.log(`   • Media Assets: ${mediaAssetCount.rows[0].count}`);
    console.log(`   • Media Links: ${mediaLinkCount.rows[0].count}`);
    
    console.log('\n🏪 Real Sources:');
    for (const source of sources) {
      const count = externalProducts.filter(p => p.source_id === `src-${source.source_id}`).length;
      console.log(`   • ${source.name} (${source.kind}): ${count} products`);
    }
    
    console.log('\n🏷️ Real Brands:');
    const brandCounts = {};
    for (const product of internalProducts) {
      brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1;
    }
    for (const [brand, count] of Object.entries(brandCounts).slice(0, 10)) {
      console.log(`   • ${brand}: ${count} products`);
    }

  } catch (error) {
    console.error('❌ Error migrating data:', error);
  } finally {
    await client.end();
  }
}

// Run the migration
migrateRealData().catch(console.error);
