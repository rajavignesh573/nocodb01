#!/usr/bin/env node

const { spawn } = require('node:child_process');
const http = require('node:http');

console.log('🧪 Testing NocoDB + Product Matching Merged Server...');

// Set environment variables for testing
process.env.NOCODB_PORT = '8080';
process.env.NOCODB_DB_TYPE = 'postgres';
process.env.NOCODB_DB_HOST = 'localhost';
process.env.NOCODB_DB_PORT = '5432';
process.env.NOCODB_DB_USER = 'postgres';
process.env.NOCODB_DB_PASSWORD = 'password';
process.env.NOCODB_DB_NAME = 'nocodb';

process.env.PM_PORT = '3001';
process.env.PM_DB_HOST = 'localhost';
process.env.PM_DB_PORT = '5432';
process.env.PM_DB_NAME = 'product_matching';
process.env.PM_DB_USER = 'postgres';
process.env.PM_DB_PASSWORD = 'password';
process.env.NODE_ENV = 'development';
process.env.NC_DISABLE_TELE = 'true';

// Start the merged server
const server = spawn('node', ['dist/main-merged.js'], {
  stdio: 'pipe',
  env: process.env
});

let serverReady = false;
let nocodbReady = false;
let productMatchingReady = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('Server:', output);
  
  // Check if NocoDB is ready
  if (output.includes('NocoDB initialized successfully')) {
    nocodbReady = true;
  }
  
  // Check if Product Matching is ready
  if (output.includes('Product Matching API listening on port 3001')) {
    productMatchingReady = true;
  }
  
  // Check if both services are ready
  if (nocodbReady && productMatchingReady && !serverReady) {
    serverReady = true;
    console.log('\n✅ Both services are ready!');
    testServices();
  }
});

server.stderr.on('data', (data) => {
  console.error('Server Error:', data.toString());
});

function testServices() {
  console.log('\n🧪 Testing services...');
  
  let completedTests = 0;
  const totalTests = 2;
  
  // Test NocoDB
  const nocodbReq = http.get('http://localhost:8080/api/health', (res) => {
    console.log(`✅ NocoDB (Port 8080): HTTP ${res.statusCode}`);
    completedTests++;
    
    if (completedTests === totalTests) {
      console.log('\n🎉 All tests passed!');
      console.log('\n📊 Service URLs:');
      console.log('   - NocoDB Dashboard: http://localhost:8080/dashboard');
      console.log('   - Product Matching API: http://localhost:3001');
      console.log('\nPress Ctrl+C to stop the server');
    }
  });
  
  nocodbReq.on('error', (err) => {
    console.error(`❌ NocoDB (Port 8080): ${err.message}`);
    completedTests++;
    
    if (completedTests === totalTests) {
      console.log('\n💥 Some tests failed!');
      server.kill();
      process.exit(1);
    }
  });
  
  nocodbReq.setTimeout(5000, () => {
    console.error(`❌ NocoDB (Port 8080): Timeout`);
    completedTests++;
    
    if (completedTests === totalTests) {
      console.log('\n💥 Some tests failed!');
      server.kill();
      process.exit(1);
    }
  });
  
  // Test Product Matching
  const pmReq = http.get('http://localhost:3001/health', (res) => {
    console.log(`✅ Product Matching (Port 3001): HTTP ${res.statusCode}`);
    completedTests++;
    
    if (completedTests === totalTests) {
      console.log('\n🎉 All tests passed!');
      console.log('\n📊 Service URLs:');
      console.log('   - NocoDB Dashboard: http://localhost:8080/dashboard');
      console.log('   - Product Matching API: http://localhost:3001');
      console.log('\nPress Ctrl+C to stop the server');
    }
  });
  
  pmReq.on('error', (err) => {
    console.error(`❌ Product Matching (Port 3001): ${err.message}`);
    completedTests++;
    
    if (completedTests === totalTests) {
      console.log('\n💥 Some tests failed!');
      server.kill();
      process.exit(1);
    }
  });
  
  pmReq.setTimeout(5000, () => {
    console.error(`❌ Product Matching (Port 3001): Timeout`);
    completedTests++;
    
    if (completedTests === totalTests) {
      console.log('\n💥 Some tests failed!');
      server.kill();
      process.exit(1);
    }
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  server.kill();
  process.exit(0);
});

// Timeout after 30 seconds
setTimeout(() => {
  if (!serverReady) {
    console.error('❌ Server failed to start within 30 seconds');
    server.kill();
    process.exit(1);
  }
}, 30000);
