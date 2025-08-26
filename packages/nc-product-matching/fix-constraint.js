const { Client } = require('pg');
const dbConfig = require('./config.js').database;

async function fixConstraint() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Drop the existing constraint
    await client.query('ALTER TABLE nc_product_matches DROP CONSTRAINT IF EXISTS nc_product_matches_status_check');
    console.log('✅ Dropped existing constraint');
    
    // Add the correct constraint
    await client.query('ALTER TABLE nc_product_matches ADD CONSTRAINT nc_product_matches_status_check CHECK (status IN (\'matched\', \'not_matched\', \'superseded\'))');
    console.log('✅ Added correct constraint');
    
    console.log('🎉 Constraint fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing constraint:', error);
  } finally {
    await client.end();
  }
}

fixConstraint().catch(console.error);
