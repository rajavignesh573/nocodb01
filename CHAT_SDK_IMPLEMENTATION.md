# NocoDB Chat SDK Implementation

This document describes the complete implementation of the Vercel AI SDK integration in NocoDB.

## Overview

The chat SDK has been fully implemented with the following features:

- ✅ **Vercel AI SDK Integration**: Using `ai` package for streaming responses
- ✅ **Database Persistence**: Conversations and messages stored in SQLite/PostgreSQL
- ✅ **Real-time Streaming**: Server-Sent Events (SSE) for live message streaming
- ✅ **Conversation Management**: Create, load, and delete conversations
- ✅ **User Authentication**: Integrated with NocoDB's existing auth system
- ✅ **Permission System**: `workspaceChat` permission for access control
- ✅ **Error Handling**: Comprehensive error handling and validation
- ✅ **Configuration**: Centralized AI configuration management

## Architecture

### Backend Components

1. **AI Controller** (`packages/nocodb/src/controllers/ai.controller.ts`)
   - Handles chat endpoints with proper validation
   - Manages conversation CRUD operations
   - Implements SSE streaming for real-time responses

2. **AI Service** (`packages/nocodb/src/services/ai.service.ts`)
   - Uses Vercel AI SDK's `streamText` function
   - Configurable AI provider settings
   - Health check functionality

3. **Database Models**
   - `AiConversation` (`packages/nocodb/src/models/AiConversation.ts`)
   - `AiMessage` (`packages/nocodb/src/models/AiMessage.ts`)

4. **Configuration** (`packages/nocodb/src/config/ai.config.ts`)
   - Centralized AI settings
   - Environment variable management

### Frontend Components

1. **Chat View** (`packages/nc-gui/components/workspace/chat/view.vue`)
   - Modern chat interface with conversation sidebar
   - Real-time message streaming
   - Error handling and loading states

2. **Chat Composable** (`packages/nc-gui/composables/useChat.ts`)
   - Reusable chat logic
   - State management
   - API integration

## API Endpoints

### Chat Endpoints

- `POST /api/v1/db/data/v1/:projectId/:tableName/ai/chat`
  - Send a message and get streaming response
  - Creates new conversation if no `conversationId` provided

- `GET /api/v1/db/data/v1/:projectId/:tableName/ai/conversations`
  - List user's conversations with pagination

- `GET /api/v1/db/data/v1/:projectId/:tableName/ai/conversations/:id`
  - Get specific conversation details

- `GET /api/v1/db/data/v1/:projectId/:tableName/ai/conversations/:id/messages`
  - Get messages for a conversation

- `DELETE /api/v1/db/data/v1/:projectId/:tableName/ai/conversations/:id`
  - Delete a conversation and all its messages

- `GET /api/v1/db/data/v1/:projectId/:tableName/ai/health`
  - Health check for AI service

## Configuration

### Environment Variables

```env
# AI Configuration
ENABLE_AI_ASSISTANT=true
AI_PROVIDER=openai
DEFAULT_AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
AI_TIMEOUT=30000
AI_RETRIES=3
```

### Configuration Object

```typescript
{
  enabled: true,
  provider: 'openai',
  model: 'gpt-4o-mini',
  maxTokens: 1000,
  temperature: 0.7,
  apiKey: 'your_openai_api_key',
  baseUrl: 'https://api.openai.com/v1',
  timeout: 30000,
  retries: 3,
}
```

## Database Schema

### AI Conversations Table

```sql
CREATE TABLE nc_ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### AI Messages Table

```sql
CREATE TABLE nc_ai_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content_json TEXT NOT NULL,
  provider_msg_id TEXT,
  tool_call_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES nc_ai_conversations(id) ON DELETE CASCADE
);
```

## Usage

### Frontend Usage

```typescript
import { useChat } from '~/composables/useChat'

const {
  messages,
  conversations,
  isLoading,
  error,
  sendMessage,
  loadConversations,
  loadConversation,
  deleteConversation,
  clearMessages
} = useChat()

// Send a message
await sendMessage('Hello, how can you help me?')

// Load conversations
await loadConversations()

// Load a specific conversation
await loadConversation('conversation-id')
```

### Backend Usage

```typescript
import { AiService } from '~/services/ai.service'

// Generate a response
const response = await aiService.generateResponse('Hello')

// Stream a response
const stream = await aiService.streamResponse('Hello')
for await (const chunk of stream) {
  console.log(chunk)
}
```

## Features

### 1. Real-time Streaming
- Uses Server-Sent Events (SSE) for live message streaming
- Vercel AI SDK's `streamText` function for optimal performance
- Progressive message display in the UI

### 2. Conversation Management
- Create new conversations automatically
- Load existing conversations
- Delete conversations with cascade delete
- Conversation history persistence

### 3. Error Handling
- Comprehensive error handling with user-friendly messages
- Validation using Zod schemas
- Graceful degradation on API failures

### 4. Security
- User authentication required for all endpoints
- Conversation ownership validation
- Permission-based access control

### 5. Performance
- Efficient database queries with proper indexing
- Streaming responses to reduce latency
- Configurable timeouts and retries

## Testing

### Health Check
```bash
curl -X GET "http://localhost:8080/api/v1/db/data/v1/default/default/ai/health" \
  -H "Authorization: Bearer your_token"
```

### Send Message
```bash
curl -X POST "http://localhost:8080/api/v1/db/data/v1/default/default/ai/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token" \
  -d '{
    "message": "Hello, how can you help me?",
    "model": "gpt-4o-mini"
  }'
```

## Dependencies

### Backend Dependencies
```json
{
  "ai": "^3.4.33",
  "zod": "^3.22.4",
  "openai": "^4.0.0"
}
```

### Frontend Dependencies
```json
{
  "ai": "^3.4.33"
}
```

## Migration

The implementation includes database migrations that will automatically create the required tables:

- `nc_091_ai_conversations.ts` - Creates conversations table
- `nc_092_ai_messages.ts` - Creates messages table with foreign key

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   - Ensure `OPENAI_API_KEY` environment variable is set
   - Check the API key is valid and has sufficient credits

2. **Permission Denied**
   - Verify user has `workspaceChat` permission
   - Check authentication token is valid

3. **Streaming Issues**
   - Ensure proper SSE headers are set
   - Check network connectivity and timeouts

4. **Database Errors**
   - Verify migrations have run successfully
   - Check database connection and permissions

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=ai:*
```

## Future Enhancements

1. **Multi-provider Support**
   - Support for other AI providers (Anthropic, Google, etc.)
   - Provider-specific configuration

2. **Advanced Features**
   - File uploads and attachments
   - Code highlighting and formatting
   - Markdown rendering

3. **Analytics**
   - Usage tracking and metrics
   - Performance monitoring
   - Cost tracking

4. **Integration**
   - Webhook support for external integrations
   - API rate limiting
   - Caching layer

## Contributing

When contributing to the chat SDK:

1. Follow the existing code patterns
2. Add proper TypeScript types
3. Include error handling
4. Write tests for new features
5. Update documentation

## License

This implementation follows the same license as NocoDB (AGPL-3.0-or-later).
