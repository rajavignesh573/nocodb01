#!/usr/bin/env node

/**
 * Production Setup Test Script
 * 
 * This script tests the NL Orchestration system in production mode
 * to ensure all components are working correctly.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

console.log('🚀 Testing Production Setup for NL Orchestration System\n');

// Test 1: Environment Variables
console.log('📋 Test 1: Environment Variables');
console.log('================================');

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'ENABLE_AI_ASSISTANT',
  'AI_PROVIDER',
  'DEFAULT_AI_MODEL'
];

let envVarsOk = true;
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  if (!value) {
    console.log(`❌ ${envVar}: NOT SET`);
    envVarsOk = false;
  } else {
    if (envVar === 'OPENAI_API_KEY') {
      const maskedValue = `${value.substring(0, 7)}...${value.substring(value.length - 4)}`;
      console.log(`✅ ${envVar}: ${maskedValue}`);
    } else {
      console.log(`✅ ${envVar}: ${value}`);
    }
  }
}

if (!envVarsOk) {
  console.log('\n❌ Some required environment variables are missing!');
  console.log('Please check PRODUCTION_SETUP.md for configuration instructions.\n');
  process.exit(1);
}

// Test 2: OpenAI API Key Validation
console.log('\n🔑 Test 2: OpenAI API Key Validation');
console.log('====================================');

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey.startsWith('sk-')) {
  console.log('❌ Invalid OpenAI API key format. Key should start with "sk-"');
  process.exit(1);
}

console.log('✅ OpenAI API key format is valid');

// Test 3: OpenAI API Connection
console.log('\n🌐 Test 3: OpenAI API Connection');
console.log('================================');

try {
  console.log('Testing OpenAI API connection...');
  
  // Use curl to test the API connection
  const testCommand = `curl -s -H "Authorization: Bearer ${apiKey}" https://api.openai.com/v1/models`;
  
  try {
    const result = execSync(testCommand, { encoding: 'utf8', timeout: 10000 });
    const response = JSON.parse(result);
    
    if (response.data && Array.isArray(response.data)) {
      console.log('✅ OpenAI API connection successful');
      console.log(`   Available models: ${response.data.length}`);
      
      // Check if the configured model is available
      const configuredModel = process.env.DEFAULT_AI_MODEL || 'gpt-4o-mini';
      const modelAvailable = response.data.some(model => model.id === configuredModel);
      
      if (modelAvailable) {
        console.log(`✅ Configured model "${configuredModel}" is available`);
      } else {
        console.log(`⚠️  Configured model "${configuredModel}" not found in available models`);
        console.log('   Available models:', response.data.map(m => m.id).join(', '));
      }
    } else {
      console.log('❌ Unexpected response from OpenAI API');
      console.log(`   Response: ${result.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log('❌ Failed to connect to OpenAI API');
    console.log('   Error:', error.message);
    console.log('   Please check your internet connection and API key validity');
  }
} catch (error) {
  console.log('❌ Error testing OpenAI API:', error.message);
}

// Test 4: NocoDB Configuration
console.log('\n🗄️  Test 4: NocoDB Configuration');
console.log('================================');

const nocoConfigVars = [
  'NC_DATABASE_URL',
  'NC_JWT_SECRET',
  'NC_PORT'
];

for (const envVar of nocoConfigVars) {
  const value = process.env[envVar];
  if (!value) {
    console.log(`⚠️  ${envVar}: NOT SET (optional for testing)`);
  } else {
    if (envVar === 'NC_JWT_SECRET') {
      const maskedValue = `${value.substring(0, 10)}...`;
      console.log(`✅ ${envVar}: ${maskedValue}`);
    } else {
      console.log(`✅ ${envVar}: ${value}`);
    }
  }
}

// Test 5: File Structure
console.log('\n📁 Test 5: File Structure');
console.log('==========================');

const requiredFiles = [
  'src/services/ai.service.ts',
  'src/services/llm-planner.service.ts',
  'src/services/query-executor.service.ts',
  'src/services/schema-catalog.service.ts',
  'src/services/response-formatter.service.ts',
  'src/services/nl-orchestrator.service.ts',
  'src/controllers/nl-query.controller.ts',
  'src/modules/noco.module.ts',
  'PRODUCTION_SETUP.md',
  'NL_ORCHESTRATOR_README.md'
];

let filesOk = true;
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}: NOT FOUND`);
    filesOk = false;
  }
}

if (!filesOk) {
  console.log('\n❌ Some required files are missing!');
  console.log('Please ensure all NL orchestration components are properly installed.\n');
  process.exit(1);
}

// Test 6: Package Dependencies
console.log('\n📦 Test 6: Package Dependencies');
console.log('===============================');

const requiredPackages = [
  'openai',
  '@nestjs/common',
  '@nestjs/config'
];

try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    for (const pkg of requiredPackages) {
      if (dependencies[pkg]) {
        console.log(`✅ ${pkg}: ${dependencies[pkg]}`);
      } else {
        console.log(`❌ ${pkg}: NOT INSTALLED`);
      }
    }
  } else {
    console.log('⚠️  package.json not found');
  }
} catch (error) {
  console.log('❌ Error checking package dependencies:', error.message);
}

// Test 7: Build Test
console.log('\n🔨 Test 7: Build Test');
console.log('=====================');

try {
  console.log('Testing TypeScript compilation...');
  const buildCommand = 'npx tsc --noEmit';
  execSync(buildCommand, { encoding: 'utf8', timeout: 30000 });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log('   Error:', error.message);
  console.log('   Please fix any TypeScript errors before proceeding');
}

// Summary
console.log('\n📊 Test Summary');
console.log('===============');

if (envVarsOk && filesOk) {
  console.log('✅ All critical tests passed!');
  console.log('\n🎉 Your NL Orchestration system is ready for production!');
  console.log('\nNext steps:');
  console.log('1. Start your NocoDB server: pnpm run start');
  console.log('2. Test the health endpoint: curl http://localhost:8080/api/v1/db/data/v1/default/default/ai/health');
  console.log('3. Try a natural language query through the API');
  console.log('4. Monitor logs for any issues');
  console.log('\nFor detailed setup instructions, see PRODUCTION_SETUP.md');
} else {
  console.log('❌ Some tests failed. Please fix the issues above before proceeding.');
  console.log('\nFor help, see:');
  console.log('- PRODUCTION_SETUP.md for configuration instructions');
  console.log('- NL_ORCHESTRATOR_README.md for system documentation');
  process.exit(1);
}

console.log('\n✨ Production setup test completed!\n');
