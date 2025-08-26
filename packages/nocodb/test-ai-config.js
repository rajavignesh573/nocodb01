const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('=== AI Configuration Test ===');
console.log('');

// Check environment variables
console.log('Environment Variables:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET (' + process.env.OPENAI_API_KEY.substring(0, 10) + '...)' : 'NOT SET');
console.log('- ENABLE_AI_ASSISTANT:', process.env.ENABLE_AI_ASSISTANT || 'NOT SET');
console.log('- AI_PROVIDER:', process.env.AI_PROVIDER || 'NOT SET');
console.log('- DEFAULT_AI_MODEL:', process.env.DEFAULT_AI_MODEL || 'NOT SET');
console.log('- AI_MAX_TOKENS:', process.env.AI_MAX_TOKENS || 'NOT SET');
console.log('- AI_TEMPERATURE:', process.env.AI_TEMPERATURE || 'NOT SET');
console.log('');

// Test AI configuration loading
try {
  const aiConfig = require('./src/config/ai.config.ts');
  console.log('AI Config Module:');
  console.log('- Config loaded:', !!aiConfig);
  console.log('- Config content:', JSON.stringify(aiConfig, null, 2));
} catch (error) {
  console.log('AI Config Module Error:', error.message);
}

console.log('');
console.log('=== Test Complete ===');
