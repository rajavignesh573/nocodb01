#!/usr/bin/env node

const { execSync } = require('node:child_process')
const path = require('node:path')
const fs = require('node:fs')

console.log('🚀 Setting up Product Matching Backend...\n')

// Paths
const backendPath = path.join(__dirname, '../../nc-product-matching')
const configPath = path.join(backendPath, 'config.js')

// Check if backend directory exists
if (!fs.existsSync(backendPath)) {
  console.error('❌ Backend directory not found at:', backendPath)
  console.log('Please ensure the nc-product-matching package is available')
  process.exit(1)
}

try {
  // Install backend dependencies
  console.log('📦 Installing backend dependencies...')
  execSync('npm install', { cwd: backendPath, stdio: 'inherit' })
  
  // Build the backend
  console.log('🔨 Building backend...')
  execSync('npm run build', { cwd: backendPath, stdio: 'inherit' })
  
  // Setup database
  console.log('🗄️  Setting up database...')
  execSync('npm run setup-db', { cwd: backendPath, stdio: 'inherit' })
  
  console.log('\n✅ Backend setup complete!')
  console.log('\n📋 Next steps:')
  console.log('1. Start the backend server:')
  console.log(`   cd ${backendPath}`)
  console.log('   npm start')
  console.log('\n2. The backend will be available at: http://localhost:3001')
  console.log('\n3. The frontend will automatically connect to the backend')
  console.log('\n4. If you need to reset the database:')
  console.log(`   cd ${backendPath}`)
  console.log('   npm run reset-db')
  
} catch (error) {
  console.error('❌ Setup failed:', error.message)
  process.exit(1)
}
