import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  enabled: process.env.ENABLE_AI_ASSISTANT === 'true' || true,
  provider: process.env.AI_PROVIDER || 'openai',
  model: process.env.DEFAULT_AI_MODEL || 'gpt-4o-mini',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  apiKey: process.env.OPENAI_API_KEY,
  baseUrl: process.env.OPENAI_BASE_URL,
  timeout: parseInt(process.env.AI_TIMEOUT || '30000'),
  retries: parseInt(process.env.AI_RETRIES || '3'),
}));
