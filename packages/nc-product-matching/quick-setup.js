#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Quick Setup for Product Matching Data Migration\n');

// Check if we're in the right directory
const packageJsonPath = path.join(__dirname, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Please run this script from the nc-product-matching directory');
  process.exit(1);
}

// Check if CSV files exist
const csvDir = path.join(__dirname, '../../dumb data');
const requiredFiles = [
  'categories_202508231359.csv',
  'products_202508231359.csv',
  'skus_202508231359.csv',
  'source_catalog_202508231359.csv',
  'media_assets_202508231359.csv',
  'media_links_202508231359.csv'
];

console.log('📁 Checking CSV files...');
const missingFiles = [];
for (const file of requiredFiles) {
  const filePath = path.join(csvDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error('❌ Missing required CSV files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  console.error('\nPlease ensure all CSV files are in the "dumb data" directory');
  process.exit(1);
}

console.log('✅ All CSV files found\n');

// Check database configuration
console.log('🔧 Checking database configuration...');
const configPath = path.join(__dirname, 'config.js');
if (!fs.existsSync(configPath)) {
  console.error('❌ config.js not found. Please create it with your database settings.');
  process.exit(1);
}

console.log('✅ Database configuration found\n');

// Install dependencies if needed
console.log('📦 Checking dependencies...');
try {
  require('csv-parser');
  require('pg');
  console.log('✅ Dependencies already installed\n');
} catch (error) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed\n');
  } catch (installError) {
    console.error('❌ Failed to install dependencies:', installError.message);
    process.exit(1);
  }
}

// Setup database
console.log('🗄️ Setting up database schema...');
try {
  execSync('node setup-database.js', { stdio: 'inherit' });
  console.log('✅ Database schema setup completed\n');
} catch (dbError) {
  console.error('❌ Database setup failed:', dbError.message);
  console.error('Please check your database connection in config.js');
  process.exit(1);
}

// Run migration
console.log('🔄 Running data migration...');
try {
  execSync('node run-migration.js', { stdio: 'inherit' });
  console.log('✅ Data migration completed successfully!\n');
} catch (migrationError) {
  console.error('❌ Data migration failed:', migrationError.message);
  process.exit(1);
}

// Final success message
console.log('🎉 Quick setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('   1. Start the product matching server:');
console.log('      node server.js');
console.log('   2. Access the API at: http://localhost:3001');
console.log('   3. Test endpoints using the Postman collection');
console.log('\n📚 For more information, see: MIGRATION_GUIDE.md');
