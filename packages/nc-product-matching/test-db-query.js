const { Client } = require('pg');
const dbConfig = require('./config.js').database;

async function testQuery() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Check what values exist in the database
    console.log('🔍 Checking database values...');
    
    const tenantResult = await client.query('SELECT DISTINCT tenant_id FROM nc_internal_products LIMIT 5');
    console.log('📋 Tenant IDs:', tenantResult.rows);
    
    const activeResult = await client.query('SELECT DISTINCT is_active FROM nc_internal_products LIMIT 5');
    console.log('📋 Is Active values:', activeResult.rows);
    
    // Test without the is_active filter
    const query = 'SELECT * FROM nc_internal_products WHERE tenant_id = $1 LIMIT $2 OFFSET $3';
    const values = ['default', 5, 0];
    
    console.log('🔍 Testing query without is_active filter:', query);
    console.log('📋 Values:', values);
    
    const result = await client.query(query, values);
    console.log(`✅ Found ${result.rows.length} products`);
    
    if (result.rows.length > 0) {
      console.log('📋 First product:', result.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

testQuery().catch(console.error);
