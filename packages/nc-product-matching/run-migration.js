#!/usr/bin/env node

const { migrateRealDataEnhanced } = require('./migrate-real-data-enhanced.js');

console.log('🚀 Starting Enhanced Product Matching Data Migration...\n');

// Check if required dependencies are installed
try {
  require('csv-parser');
  require('pg');
} catch (error) {
  console.error('❌ Missing required dependencies. Please install them first:');
  console.error('   npm install csv-parser pg');
  process.exit(1);
}

// Run the migration
migrateRealDataEnhanced()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Start the product matching server: node server.js');
    console.log('   2. Access the API at http://localhost:3001');
    console.log('   3. Test the endpoints using the provided Postman collection');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is running');
    console.error('   2. Check database connection in config.js');
    console.error('   3. Ensure CSV files exist in the "dumb data" directory');
    console.error('   4. Verify database schema is set up (run setup-database.js first)');
    process.exit(1);
  });
