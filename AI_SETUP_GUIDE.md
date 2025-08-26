# AI Setup Guide

## Setting Up Your OpenAI API Key

To use the chat SDK, you need to configure your OpenAI API key. Follow these steps:

### 1. Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the generated API key

### 2. Configure Environment Variables

Create a `.env` file in the root of your NocoDB project with the following variables:

```env
# AI Assistant Configuration
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
NC_DISABLE_TELE=true
```

### 3. Replace the Placeholder

Replace `your_actual_api_key_here` with your actual OpenAI API key.

### 4. Restart the Server

After setting up the environment variables, restart your NocoDB server:

```bash
# Stop the current server (Ctrl+C)
# Then restart
pnpm run watch:run
```

### 5. Verify Configuration

You can verify the configuration by checking the health endpoint:

```bash
curl -X GET "http://localhost:8080/api/v1/db/data/v1/default/default/ai/health"
```

If configured correctly, you should see:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "sdk": "vercel-ai"
}
```

### 6. Test the Chat

1. Open your NocoDB application
2. Navigate to the chat interface (sidebar icon)
3. Try sending a message

## Troubleshooting

### API Key Not Found
If you see "OpenAI API key not found" in the logs:
- Check that your `.env` file is in the correct location
- Verify the API key is correctly copied
- Restart the server after making changes

### Permission Denied
If you get permission errors:
- Make sure you have the `workspaceChat` permission
- Check that you're logged in to NocoDB

### Rate Limiting
If you hit rate limits:
- Check your OpenAI account usage
- Consider upgrading your OpenAI plan
- Adjust the `AI_TIMEOUT` and `AI_RETRIES` settings

## Security Notes

- Never commit your `.env` file to version control
- Keep your API key secure and don't share it
- Consider using environment-specific configuration files
- Monitor your OpenAI usage to avoid unexpected charges

## Alternative Models

You can change the model by modifying the `DEFAULT_AI_MODEL` environment variable:

```env
# For GPT-4
DEFAULT_AI_MODEL=gpt-4

# For GPT-3.5 Turbo
DEFAULT_AI_MODEL=gpt-3.5-turbo

# For GPT-4o Mini (recommended for cost efficiency)
DEFAULT_AI_MODEL=gpt-4o-mini
```

## Cost Considerations

- GPT-4o-mini is the most cost-effective option
- Monitor your usage at [OpenAI Usage](https://platform.openai.com/usage)
- Set up billing alerts to avoid unexpected charges
