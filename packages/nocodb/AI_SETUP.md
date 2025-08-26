# AI Integration Setup Guide

## Prerequisites

1. **OpenAI API Key**: You need a valid OpenAI API key to use the AI chat feature.

## Environment Variables

Add the following environment variable to your NocoDB configuration:

```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
```

### Setting up the environment variable:

#### Option 1: Environment file
Create a `.env` file in the root directory and add:
```
OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### Option 2: System environment variable
Set the environment variable in your system:
```bash
export OPENAI_API_KEY=sk-your-openai-api-key-here
```

#### Option 3: Docker environment
If running with Docker, add to your docker-compose.yml:
```yaml
environment:
  - OPENAI_API_KEY=sk-your-openai-api-key-here
```

## Features

The AI integration provides:

1. **Chat Interface**: Users can chat with an AI assistant
2. **NocoDB Integration**: AI can understand and interact with NocoDB data
3. **Function Calling**: AI can call NocoDB API functions to:
   - List bases
   - List tables in a base
   - Query records from tables

## Usage

1. Navigate to the chat page in NocoDB
2. Ask questions like:
   - "Show me my NocoDB bases"
   - "List tables in base X"
   - "Query records from table Y"

## Troubleshooting

- **API Key Error**: Ensure your OpenAI API key is valid and has sufficient credits
- **Connection Issues**: Check your internet connection and OpenAI API status
- **Function Call Errors**: Verify that the NocoDB API endpoints are accessible

## Security

- The AI service uses NocoDB's existing authentication system
- API keys are stored securely using environment variables
- All requests are authenticated and authorized
