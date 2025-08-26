const { Client } = require('pg');
const dbConfig = require('./config.js').database;

async function fixActiveProducts() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Update all products to be active
    const result = await client.query('UPDATE nc_internal_products SET is_active = true WHERE tenant_id = $1', ['default']);
    console.log(`✅ Updated ${result.rowCount} products to be active`);
    
    // Verify the update
    const countResult = await client.query('SELECT COUNT(*) FROM nc_internal_products WHERE tenant_id = $1 AND is_active = $2', ['default', true]);
    console.log(`📊 Active products count: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

fixActiveProducts().catch(console.error);
