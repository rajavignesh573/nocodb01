const path = require('path');
const dotenv = require('dotenv');

console.log('Testing environment variable loading...');

// Load .env from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('Environment variables:');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('ENABLE_AI_ASSISTANT:', process.env.ENABLE_AI_ASSISTANT);
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
console.log('DEFAULT_AI_MODEL:', process.env.DEFAULT_AI_MODEL);

if (process.env.OPENAI_API_KEY) {
  console.log('✅ OpenAI API key is loaded!');
} else {
  console.log('❌ OpenAI API key is NOT loaded!');
}
