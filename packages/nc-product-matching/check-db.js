const { Client } = require('pg');
const dbConfig = require('./config.js').database;

async function checkDatabase() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Check product count
    const countResult = await client.query('SELECT COUNT(*) FROM nc_internal_products');
    console.log(`📊 Total products: ${countResult.rows[0].count}`);
    
    // Check sample products
    const productsResult = await client.query('SELECT id, title, brand, category_id FROM nc_internal_products LIMIT 5');
    console.log('📋 Sample products:');
    productsResult.rows.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.title} (${product.brand}) - ${product.category_id}`);
    });
    
    // Check sources
    const sourcesResult = await client.query('SELECT COUNT(*) FROM nc_product_match_sources');
    console.log(`🏪 Total sources: ${sourcesResult.rows[0].count}`);
    
    // Check media assets
    const mediaResult = await client.query('SELECT COUNT(*) FROM nc_media_assets');
    console.log(`🖼️ Total media assets: ${mediaResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await client.end();
  }
}

checkDatabase().catch(console.error);
