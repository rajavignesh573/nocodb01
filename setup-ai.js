#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🤖 NocoDB AI Setup Helper');
console.log('========================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file found');
  
  // Read existing .env file
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  // Check for existing AI configuration
  const hasOpenAIKey = lines.some(line => line.startsWith('OPENAI_API_KEY='));
  const hasAIEnabled = lines.some(line => line.startsWith('ENABLE_AI_ASSISTANT='));
  
  if (hasOpenAIKey) {
    console.log('✅ OpenAI API key already configured');
  } else {
    console.log('❌ OpenAI API key not found');
  }
  
  if (hasAIEnabled) {
    console.log('✅ AI assistant already enabled');
  } else {
    console.log('❌ AI assistant not enabled');
  }
} else {
  console.log('❌ .env file not found');
}

console.log('\n📝 Configuration Steps:');
console.log('1. Get your OpenAI API key from: https://platform.openai.com/api-keys');
console.log('2. Create or update your .env file with the following variables:\n');

const envTemplate = `# AI Assistant Configuration
ENABLE_AI_ASSISTANT=true
AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7

# OpenAI Configuration
OPENAI_API_KEY=your_actual_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# AI Service Configuration
AI_TIMEOUT=30000
AI_RETRIES=3

# Other NocoDB Configuration
NC_DISABLE_TELE=true`;

console.log(envTemplate);

console.log('\n🔧 Quick Setup:');
console.log('1. Copy the template above');
console.log('2. Create a .env file in the root directory');
console.log('3. Paste the template and replace "your_actual_api_key_here" with your real API key');
console.log('4. Restart the NocoDB server');

console.log('\n🧪 Testing:');
console.log('After setup, test the AI service by visiting:');
console.log('http://localhost:8080/api/v1/db/data/v1/default/default/ai/health');

console.log('\n📋 Troubleshooting:');
console.log('- Make sure your API key is valid and has credits');
console.log('- Check the server logs for any error messages');
console.log('- Verify the .env file is in the correct location (root directory)');
console.log('- Restart the server after making changes to .env');

rl.question('\nWould you like me to create a .env file template for you? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    const newEnvPath = path.join(__dirname, '.env.template');
    fs.writeFileSync(newEnvPath, envTemplate);
    console.log(`\n✅ Template created at: ${newEnvPath}`);
    console.log('📝 Copy this file to .env and add your API key');
  }
  
  rl.close();
});
