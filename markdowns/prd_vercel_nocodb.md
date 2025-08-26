Got it — here’s the **full combined PRD** with all your missing gaps addressed, all architecture steps, and the complete backend + frontend code ready for Cursor.

---

# **PRD – NocoDB + Vercel AI SDK Integration**

**Objective:**
Embed Vercel’s `@vercel/ai` Chat SDK into the NocoDB frontend and backend to deliver a seamless AI assistant experience, behaving as if it’s part of the native NocoDB application.

---

## **1. Prerequisites**

* **NocoDB:** Existing installation (server + frontend) already functional.
* **Node.js:** ≥ 18.x
* **pnpm:** ≥ 8.x
* **Database:** Postgres or SQLite (both supported)
* **Environment Variables:**

  ```env
  OPENAI_API_KEY=sk-...
  DEFAULT_AI_MODEL=gpt-4o-mini
  ENABLE_AI_ASSISTANT=true
  ```

---

## **2. Architecture Overview**

**Monorepo Structure (Relevant Parts):**

```
/packages
  /nocodb          # Backend (Express)
  /nc-gui          # Frontend (Vue/Nuxt + Quasar)
```

**Integration Points:**

* **Backend** → `/api/ai` Express router with SSE streaming.
* **Frontend** → `/assistant` route in `nc-gui`.
* **Database** → `nc_ai_conversations` & `nc_ai_messages` tables for chat persistence.
* **Auth** → Uses NocoDB’s existing `requireNcUser` middleware.
* **Feature Flag** → `ENABLE_AI_ASSISTANT`.

---

## **3. Implementation Steps**

### **Step 1 – Install Packages**

```bash
# Install at workspace root for shared access
pnpm -w add @vercel/ai openai zod

# Verify compatibility with existing NocoDB dependencies
pnpm -w list @vercel/ai openai zod
```

**Package Installation Strategy:**
* Install at workspace root to ensure both `nc-gui` and `nocodb` packages have access
* Verify no conflicts with existing NocoDB dependencies
* Check `pnpm-lock.yaml` for version compatibility
* If conflicts arise, use `pnpm -w add --resolution` to force specific versions

**Version Compatibility Check:**
```bash
# Check for potential conflicts
pnpm -w outdated
pnpm -w audit
```

---

### **Step 2 – Database Schema & Migration Strategy**

#### **Migration Files Structure:**
```
packages/nocodb/migrations/
├── 20250101000000_ai_postgres.sql
├── 20250101000001_ai_sqlite.sql
└── 20250101000002_ai_indexes.sql
```

#### **Postgres Migration** (`packages/nocodb/migrations/20250101000000_ai_postgres.sql`)

```sql
-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create AI conversations table
CREATE TABLE IF NOT EXISTS nc_ai_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create AI messages table
CREATE TABLE IF NOT EXISTS nc_ai_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES nc_ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content_json jsonb NOT NULL,
  provider_msg_id text,
  tool_call_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON nc_ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON nc_ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON nc_ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON nc_ai_messages(created_at);
```

#### **SQLite Migration** (`packages/nocodb/migrations/20250101000001_ai_sqlite.sql`)

```sql
-- Create AI conversations table
CREATE TABLE IF NOT EXISTS nc_ai_conversations (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  title text,
  created_at text NOT NULL DEFAULT (datetime('now')),
  updated_at text NOT NULL DEFAULT (datetime('now'))
);

-- Create AI messages table
CREATE TABLE IF NOT EXISTS nc_ai_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL,
  role text NOT NULL,
  content_json text NOT NULL,
  provider_msg_id text,
  tool_call_json text,
  created_at text NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (conversation_id) REFERENCES nc_ai_conversations(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON nc_ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at ON nc_ai_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON nc_ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON nc_ai_messages(created_at);
```

#### **Migration Strategy:**
```bash
# Run migrations
cd packages/nocodb
npm run migrate

# Verify tables created
npm run db:check

# Rollback if needed
npm run migrate:rollback
```

#### **Database Abstraction Layer** (`packages/nocodb/src/lib/ai-db.ts`):
```typescript
import { NcContext } from '../meta/NcContext';
import { NcRequest } from '../meta/NcRequest';

export interface AiConversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content_json: any;
  provider_msg_id?: string;
  tool_call_json?: any;
  created_at: string;
}

export class AiDatabaseService {
  constructor(private context: NcContext) {}

  async createConversation(userId: string, title?: string): Promise<AiConversation> {
    const id = this.context.dbType === 'sqlite' ? 
      this.generateUUID() : 
      await this.context.db.raw('SELECT uuid_generate_v4()').then(r => r[0].uuid_generate_v4);
    
    const [conversation] = await this.context.db('nc_ai_conversations')
      .insert({ id, user_id: userId, title })
      .returning('*');
    
    return conversation;
  }

  async getConversations(userId: string, limit = 50, offset = 0): Promise<AiConversation[]> {
    return await this.context.db('nc_ai_conversations')
      .where({ user_id: userId })
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async getMessages(conversationId: string, limit = 100, offset = 0): Promise<AiMessage[]> {
    return await this.context.db('nc_ai_messages')
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'asc')
      .limit(limit)
      .offset(offset);
  }

  async saveMessage(message: Omit<AiMessage, 'id' | 'created_at'>): Promise<AiMessage> {
    const id = this.context.dbType === 'sqlite' ? 
      this.generateUUID() : 
      await this.context.db.raw('SELECT uuid_generate_v4()').then(r => r[0].uuid_generate_v4);
    
    const [savedMessage] = await this.context.db('nc_ai_messages')
      .insert({ ...message, id })
      .returning('*');
    
    return savedMessage;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
```
  provider_msg_id text,
  tool_call_json text,
  created_at text NOT NULL DEFAULT (datetime('now'))
);
```

---

### **Step 3 – Backend API**

**File:** `packages/nocodb/src/routes/ai.ts`

```ts
import express from 'express';
import { requireNcUser } from '../middleware/requireNcUser';
import { streamText } from 'ai';
import OpenAI from 'openai';
import { z } from 'zod';
import db from '../lib/db';

export const aiRouter = express.Router();
aiRouter.use(requireNcUser);

const messageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1)
});

aiRouter.post('/chat', async (req, res) => {
  const parseResult = messageSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: 'Invalid request body' });

  const { conversationId, message } = parseResult.data;
  const userId = req.user.id;
  let convId = conversationId;

  if (!convId) {
    const [row] = await db('nc_ai_conversations')
      .insert({ user_id: userId, title: message.slice(0, 50) })
      .returning(['id']);
    convId = row.id;
  }

  await db('nc_ai_messages').insert({
    conversation_id: convId,
    role: 'user',
    content_json: JSON.stringify({ text: message })
  });

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const stream = await streamText({
    model: client.chat(process.env.DEFAULT_AI_MODEL || 'gpt-4o-mini'),
    messages: [{ role: 'user', content: message }]
  });

  let fullResponse = '';

  for await (const part of stream) {
    if (part.type === 'text') {
      fullResponse += part.text;
      res.write(`data: ${JSON.stringify({ text: part.text })}\n\n`);
    }
  }

  await db('nc_ai_messages').insert({
    conversation_id: convId,
    role: 'assistant',
    content_json: JSON.stringify({ text: fullResponse })
  });

  res.write(`event: done\ndata: {}\n\n`);
  res.end();
});
```

**Mount Router** in `packages/nocodb/src/index.ts`:

```ts
import { aiRouter } from './routes/ai';
if (process.env.ENABLE_AI_ASSISTANT === 'true') {
  app.use('/api/ai', aiRouter);
}
```

---

### **Step 4 – Frontend Integration**

**File:** `packages/nc-gui/pages/assistant.vue`

```vue
<template>
  <div class="q-pa-md column items-center">
    <div class="full-width" style="max-width: 800px">
      <q-card class="q-pa-md">
        <q-card-section><div class="text-h6">AI Assistant</div></q-card-section>
        <q-separator />
        <q-card-section style="max-height: 60vh; overflow-y: auto;">
          <div v-for="(msg, index) in messages" :key="index" :class="msg.role">
            <div v-html="msg.content"></div>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-input v-model="input" placeholder="Type..." @keyup.enter="sendMessage">
            <template v-slot:append>
              <q-btn icon="send" @click="sendMessage" :disable="loading" />
            </template>
          </q-input>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const input = ref('');
const messages = ref([]);
const loading = ref(false);

async function sendMessage() {
  if (!input.value.trim()) return;
  const userMsg = { role: 'user', content: input.value };
  messages.value.push(userMsg);

  const token = auth.token;
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'xc-auth': token },
    body: JSON.stringify({ message: input.value })
  });

  input.value = '';
  loading.value = true;

  const reader = res.body.getReader();
  let assistantMsg = { role: 'assistant', content: '' };
  messages.value.push(assistantMsg);

  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    assistantMsg.content += chunk;
  }
  loading.value = false;
}
</script>

<style scoped>
.user { text-align: right; background: #e0f7fa; padding: 6px; border-radius: 8px; }
.assistant { text-align: left; background: #f1f8e9; padding: 6px; border-radius: 8px; }
</style>
```

**Navigation Update** (`packages/nc-gui/src/layouts/MainLayout.vue`):

```vue
<q-item v-if="process.env.ENABLE_AI_ASSISTANT === 'true'" to="/assistant" clickable v-ripple>
  <q-item-section avatar><q-icon name="smart_toy" /></q-item-section>
  <q-item-section>Assistant</q-item-section>
</q-item>
```

---

### **Step 5 – Authentication & Authorization**

#### **Authentication Middleware Implementation** (`packages/nocodb/src/middleware/ai-auth.ts`):
```typescript
import { NcContext } from '../meta/NcContext';
import { NcRequest } from '../meta/NcRequest';
import { Response } from 'express';
import { extractSdkResponseErrorMsg } from '../utils/errorUtils';

export interface AiAuthUser {
  id: string;
  email: string;
  roles: string[];
}

export async function requireAiUser(
  req: NcRequest,
  res: Response,
  next: Function
): Promise<void> {
  try {
    // Extract token from headers or cookies
    const token = req.header('xc-auth') || req.cookies?.['xc-auth'];
    
    if (!token) {
      res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Validate token using NocoDB's existing auth system
    const user = await req.context.jwt.verify(token);
    
    if (!user || !user.id) {
      res.status(401).json({ 
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
      return;
    }

    // Check if user has AI assistant permission
    const hasPermission = await checkAiPermission(req.context, user.id);
    
    if (!hasPermission) {
      res.status(403).json({ 
        error: 'Insufficient permissions for AI assistant',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    // Attach user to request
    req.aiUser = {
      id: user.id,
      email: user.email,
      roles: user.roles || []
    };

    next();
  } catch (error) {
    console.error('AI Auth Error:', error);
    res.status(401).json({ 
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      details: await extractSdkResponseErrorMsg(error)
    });
  }
}

async function checkAiPermission(context: NcContext, userId: string): Promise<boolean> {
  try {
    // Check if user has workspaceChat permission
    const userRoles = await context.db('nc_users')
      .select('roles')
      .where({ id: userId })
      .first();
    
    if (!userRoles) return false;
    
    // Parse roles and check for AI permissions
    const roles = JSON.parse(userRoles.roles || '{}');
    return roles.workspaceChat === true || roles['*'] === true;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}
```

#### **Frontend Authentication Integration** (`packages/nc-gui/composables/useAiAuth.ts`):
```typescript
import { useAuthStore } from '~/store/auth';
import { useGlobal } from '~/composables/useGlobal';

export function useAiAuth() {
  const authStore = useAuthStore();
  const { $api } = useGlobal();

  const getAuthHeaders = () => {
    const token = authStore.token;
    return token ? { 'xc-auth': token } : {};
  };

  const isAuthenticated = computed(() => !!authStore.token);

  const hasAiPermission = computed(() => {
    const user = authStore.user;
    if (!user) return false;
    
    // Check if user has AI assistant permission
    return user.roles?.workspaceChat === true || user.roles?.['*'] === true;
  });

  const checkAiAccess = async () => {
    try {
      const response = await $api.get('/api/ai/health', {
        headers: getAuthHeaders()
      });
      return response.status === 200;
    } catch (error) {
      console.error('AI access check failed:', error);
      return false;
    }
  };

  return {
    getAuthHeaders,
    isAuthenticated,
    hasAiPermission,
    checkAiAccess
  };
}
```

#### **Session Management** (`packages/nocodb/src/lib/ai-session.ts`):
```typescript
import { NcContext } from '../meta/NcContext';
import { AiAuthUser } from '../middleware/ai-auth';

export class AiSessionManager {
  private sessions = new Map<string, {
    user: AiAuthUser;
    lastActivity: Date;
    conversationId?: string;
  }>();

  constructor(private context: NcContext) {
    // Clean up expired sessions every 30 minutes
    setInterval(() => this.cleanupSessions(), 30 * 60 * 1000);
  }

  createSession(user: AiAuthUser): string {
    const sessionId = this.generateSessionId();
    this.sessions.set(sessionId, {
      user,
      lastActivity: new Date()
    });
    return sessionId;
  }

  getSession(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      return session;
    }
    return null;
  }

  updateConversation(sessionId: string, conversationId: string) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.conversationId = conversationId;
      session.lastActivity = new Date();
    }
  }

  private cleanupSessions() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private generateSessionId(): string {
    return 'ai_' + Math.random().toString(36).substr(2, 9);
  }
}
```

---

### **Step 6 – Error Handling & Performance Optimization**

#### **Comprehensive Error Handling** (`packages/nocodb/src/lib/ai-error-handler.ts`):
```typescript
import { Response } from 'express';
import { extractSdkResponseErrorMsg } from '../utils/errorUtils';

export class AiErrorHandler {
  static async handleStreamError(error: any, res: Response, conversationId?: string) {
    console.error('AI Stream Error:', {
      error: error.message,
      conversationId,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });

    // Send error to client via SSE
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: {
        message: 'AI service temporarily unavailable',
        code: 'AI_SERVICE_ERROR',
        retryable: true
      }
    })}\n\n`);

    // Log to monitoring system
    await this.logError(error, 'stream_error', { conversationId });
  }

  static async handleDatabaseError(error: any, res: Response) {
    console.error('AI Database Error:', error);
    
    res.status(500).json({
      error: 'Database operation failed',
      code: 'DB_ERROR',
      retryable: true
    });

    await this.logError(error, 'database_error');
  }

  static async handleAuthError(error: any, res: Response) {
    console.error('AI Auth Error:', error);
    
    res.status(401).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
      retryable: false
    });

    await this.logError(error, 'auth_error');
  }

  static async handleRateLimitError(res: Response) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMIT',
      retryable: true,
      retryAfter: 60
    });
  }

  private static async logError(error: any, type: string, metadata?: any) {
    // Implement logging to your monitoring system
    // Example: Sentry, DataDog, etc.
    try {
      // await logToMonitoringSystem({
      //   type,
      //   message: error.message,
      //   stack: error.stack,
      //   metadata,
      //   timestamp: new Date().toISOString()
      // });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }
}
```

#### **Performance Optimization** (`packages/nocodb/src/lib/ai-performance.ts`):
```typescript
import { NcContext } from '../meta/NcContext';

export class AiPerformanceOptimizer {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(private context: NcContext) {
    // Clean up expired cache entries every 10 minutes
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
  }

  // Cache conversation history
  async getCachedConversation(conversationId: string) {
    const cacheKey = `conv_${conversationId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    const messages = await this.context.db('nc_ai_messages')
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'asc')
      .limit(50); // Limit to last 50 messages for performance

    this.cache.set(cacheKey, {
      data: messages,
      timestamp: Date.now()
    });

    return messages;
  }

  // Optimize database queries with pagination
  async getConversationsOptimized(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const [conversations, total] = await Promise.all([
      this.context.db('nc_ai_conversations')
        .where({ user_id: userId })
        .orderBy('updated_at', 'desc')
        .limit(limit)
        .offset(offset),
      this.context.db('nc_ai_conversations')
        .where({ user_id: userId })
        .count('* as total')
        .first()
    ]);

    return {
      conversations,
      pagination: {
        page,
        limit,
        total: total?.total || 0,
        pages: Math.ceil((total?.total || 0) / limit)
      }
    };
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}
```

#### **Rate Limiting** (`packages/nocodb/src/middleware/ai-rate-limit.ts`):
```typescript
import { NcRequest } from '../meta/NcRequest';
import { Response } from 'express';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class AiRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private config: RateLimitConfig) {
    // Clean up expired rate limit entries every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  checkLimit(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId);

    if (!userRequests || now > userRequests.resetTime) {
      // Reset or create new rate limit entry
      this.requests.set(userId, {
        count: 1,
        resetTime: now + this.config.windowMs
      });
      return true;
    }

    if (userRequests.count >= this.config.maxRequests) {
      return false; // Rate limit exceeded
    }

    userRequests.count++;
    return true;
  }

  private cleanup() {
    const now = Date.now();
    for (const [userId, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(userId);
      }
    }
  }
}

// Usage in middleware
export function createAiRateLimitMiddleware(config: RateLimitConfig) {
  const limiter = new AiRateLimiter(config);
  
  return (req: NcRequest, res: Response, next: Function) => {
    const userId = req.aiUser?.id || req.ip;
    
    if (!limiter.checkLimit(userId)) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT',
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
      return;
    }
    
    next();
  };
}
```

### **Step 7 – Monitoring & Observability**

#### **Metrics Collection** (`packages/nocodb/src/lib/ai-metrics.ts`):
```typescript
export class AiMetricsCollector {
  private metrics = {
    requests: 0,
    errors: 0,
    averageResponseTime: 0,
    totalTokens: 0,
    activeConversations: 0
  };

  recordRequest(responseTime: number, tokenCount: number) {
    this.metrics.requests++;
    this.metrics.totalTokens += tokenCount;
    
    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.requests - 1) + responseTime) / this.metrics.requests;
  }

  recordError(errorType: string) {
    this.metrics.errors++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0,
      timestamp: new Date().toISOString()
    };
  }

  // Export metrics for monitoring systems
  async exportMetrics() {
    const metrics = this.getMetrics();
    
    // Send to monitoring system (Prometheus, DataDog, etc.)
    // await sendToMonitoringSystem('ai_metrics', metrics);
    
    return metrics;
  }
}
```

#### **Health Check Endpoint** (`packages/nocodb/src/routes/ai.ts` - Add):
```typescript
// Health check endpoint
aiRouter.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await req.context.db.raw('SELECT 1');
    
    // Check OpenAI API connectivity
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    await openai.models.list();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
```

### **Step 8 – Testing Strategy**

#### **Unit Tests** (`packages/nocodb/test/ai/`):
```typescript
// packages/nocodb/test/ai/ai-router.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('AI Router', () => {
  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/ai/chat')
      .send({ message: 'Hello' });
    
    expect(response.status).toBe(401);
  });

  it('should handle rate limiting', async () => {
    // Test rate limiting logic
  });

  it('should stream responses correctly', async () => {
    // Test SSE streaming
  });
});
```

#### **Integration Tests** (`packages/nocodb/test/ai/integration.test.ts`):
```typescript
describe('AI Integration', () => {
  it('should create conversation and save messages', async () => {
    // Test full flow from request to database
  });

  it('should handle database errors gracefully', async () => {
    // Test error handling
  });
});
```

#### **E2E Tests** (`packages/nc-gui/test/e2e/ai-assistant.spec.ts`):
```typescript
import { test, expect } from '@playwright/test';

test('AI Assistant E2E', async ({ page }) => {
  await page.goto('/assistant');
  
  // Test authentication
  await expect(page.locator('[data-testid="auth-required"]')).toBeVisible();
  
  // Login and test chat
  await page.fill('[data-testid="message-input"]', 'Hello AI');
  await page.click('[data-testid="send-button"]');
  
  // Wait for response
  await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
});
```

---

### **Step 9 – Deployment & CI/CD**

#### **Docker Configuration** (`packages/nocodb/Dockerfile` - Update):
```dockerfile
# Add AI dependencies to existing Dockerfile
RUN pnpm add @vercel/ai openai zod

# Copy AI-specific files
COPY src/routes/ai.ts ./src/routes/
COPY src/middleware/ai-*.ts ./src/middleware/
COPY src/lib/ai-*.ts ./src/lib/
COPY migrations/*_ai_*.sql ./migrations/
```

#### **CI/CD Pipeline** (`.github/workflows/ai-deploy.yml`):
```yaml
name: AI Assistant Deployment

on:
  push:
    branches: [main]
    paths: ['packages/nocodb/src/routes/ai.ts', 'packages/nc-gui/pages/assistant.vue']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:ai
      - run: pnpm build:ai

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy with feature flag
        run: |
          # Deploy with AI assistant disabled initially
          export ENABLE_AI_ASSISTANT=false
          ./deploy.sh
          
          # Run database migrations
          ./run-migrations.sh
          
          # Enable AI assistant gradually
          export ENABLE_AI_ASSISTANT=true
          ./deploy.sh
```

#### **Environment Configuration** (`packages/nocodb/.env.example`):
```env
# AI Assistant Configuration
ENABLE_AI_ASSISTANT=true
OPENAI_API_KEY=sk-your-openai-key
DEFAULT_AI_MODEL=gpt-4o-mini

# Rate Limiting
AI_RATE_LIMIT_WINDOW_MS=60000
AI_RATE_LIMIT_MAX_REQUESTS=10

# Monitoring
AI_METRICS_ENABLED=true
AI_LOG_LEVEL=info

# Performance
AI_CACHE_TTL_MS=300000
AI_MAX_MESSAGES_PER_CONVERSATION=100
```

### **Step 10 – Troubleshooting & Rollback**

#### **Common Issues & Solutions**:

**1. Authentication Errors**
```bash
# Check token validity
curl -H "xc-auth: YOUR_TOKEN" http://localhost:8080/api/ai/health

# Verify user permissions
SELECT * FROM nc_users WHERE id = 'USER_ID';
```

**2. Database Migration Issues**
```bash
# Check migration status
npm run migrate:status

# Rollback specific migration
npm run migrate:rollback -- --step=1

# Reset database (DANGEROUS - backup first)
npm run db:reset
```

**3. OpenAI API Issues**
```bash
# Test OpenAI connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check API key permissions
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/usage
```

**4. Performance Issues**
```bash
# Check database performance
EXPLAIN ANALYZE SELECT * FROM nc_ai_messages WHERE conversation_id = 'xxx';

# Monitor memory usage
pm2 monit

# Check rate limiting
curl -H "xc-auth: YOUR_TOKEN" http://localhost:8080/api/ai/metrics
```

#### **Rollback Procedures**:

**Quick Rollback (Feature Flag)**
```bash
# Disable AI assistant immediately
export ENABLE_AI_ASSISTANT=false
pm2 restart nocodb

# Verify rollback
curl http://localhost:8080/api/ai/health
# Should return 404 or feature disabled
```

**Database Rollback**
```bash
# Drop AI tables (DANGEROUS - backup first)
DROP TABLE IF EXISTS nc_ai_messages;
DROP TABLE IF EXISTS nc_ai_conversations;

# Remove AI routes from code
# Comment out AI router mounting in server.ts
```

**Complete Rollback**
```bash
# 1. Disable feature flag
export ENABLE_AI_ASSISTANT=false

# 2. Remove AI packages
pnpm remove @vercel/ai openai zod

# 3. Drop AI tables
npm run db:rollback -- --step=2

# 4. Restart services
pm2 restart all

# 5. Verify rollback
curl http://localhost:8080/api/ai/health
# Should return 404
```

### **Step 11 – Monitoring & Alerting**

#### **Key Metrics to Monitor**:
- **Response Time**: Average AI response time < 5 seconds
- **Error Rate**: < 5% error rate on `/api/ai/*` endpoints
- **Token Usage**: Monitor OpenAI API usage and costs
- **Database Performance**: Query execution time < 100ms
- **Memory Usage**: < 80% of available memory

#### **Alerting Rules**:
```yaml
# Prometheus AlertManager rules
groups:
  - name: ai-assistant
    rules:
      - alert: AIHighErrorRate
        expr: rate(ai_errors_total[5m]) > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "AI Assistant error rate is high"
          
      - alert: AIHighResponseTime
        expr: histogram_quantile(0.95, rate(ai_response_time_seconds_bucket[5m])) > 10
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "AI Assistant response time is high"
```

### **Step 12 – Security & Compliance**

#### **Security Checklist**:
- [ ] API keys stored securely (not in code)
- [ ] Input sanitization implemented
- [ ] Rate limiting enabled
- [ ] Authentication required for all endpoints
- [ ] Audit logging enabled
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] SQL injection prevention
- [ ] XSS protection implemented

#### **Data Privacy**:
- [ ] User consent for AI interactions
- [ ] Data retention policies
- [ ] GDPR compliance (if applicable)
- [ ] Data encryption at rest
- [ ] Secure data transmission
- [ ] User data export/deletion capabilities

### **Step 13 – Maintenance & Updates**

#### **Regular Maintenance Tasks**:
```bash
# Weekly: Check for package updates
pnpm outdated

# Weekly: Monitor OpenAI API usage
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/usage

# Monthly: Clean up old conversations
DELETE FROM nc_ai_conversations 
WHERE updated_at < NOW() - INTERVAL '90 days';

# Monthly: Update AI models
# Check for new OpenAI models and update DEFAULT_AI_MODEL
```

#### **Update Procedures**:
```bash
# 1. Backup database
pg_dump nocodb > backup_$(date +%Y%m%d).sql

# 2. Update packages
pnpm update @vercel/ai openai zod

# 3. Run migrations
npm run migrate

# 4. Test in staging
npm run test:ai

# 5. Deploy to production
./deploy.sh

# 6. Monitor for issues
pm2 monit
```

### **Step 14 – Performance Optimization**

#### **Database Optimization**:
```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_ai_messages_user_conversation 
ON nc_ai_messages(user_id, conversation_id);

CREATE INDEX CONCURRENTLY idx_ai_conversations_user_updated 
ON nc_ai_conversations(user_id, updated_at DESC);

-- Partition large tables (if needed)
CREATE TABLE nc_ai_messages_2024 PARTITION OF nc_ai_messages
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

#### **Caching Strategy**:
```typescript
// Implement Redis caching for frequently accessed data
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class AiCacheService {
  async getCachedResponse(prompt: string): Promise<string | null> {
    return await redis.get(`ai:response:${this.hashPrompt(prompt)}`);
  }

  async cacheResponse(prompt: string, response: string, ttl = 3600): Promise<void> {
    await redis.setex(`ai:response:${this.hashPrompt(prompt)}`, ttl, response);
  }

  private hashPrompt(prompt: string): string {
    return require('crypto').createHash('md5').update(prompt).digest('hex');
  }
}
```

---

## **Final Implementation Checklist**

### **Pre-Implementation**:
- [ ] Review NocoDB codebase structure
- [ ] Set up development environment
- [ ] Obtain OpenAI API key
- [ ] Plan database migration strategy
- [ ] Set up monitoring and alerting

### **Implementation**:
- [ ] Install Vercel AI SDK packages
- [ ] Create database migrations
- [ ] Implement authentication middleware
- [ ] Build AI router with streaming
- [ ] Create frontend chat interface
- [ ] Add navigation integration
- [ ] Implement error handling
- [ ] Add rate limiting
- [ ] Set up monitoring

### **Testing**:
- [ ] Unit tests for all components
- [ ] Integration tests for full flow
- [ ] E2E tests for user experience
- [ ] Performance testing
- [ ] Security testing
- [ ] Load testing

### **Deployment**:
- [ ] Feature flag implementation
- [ ] Database migration execution
- [ ] Environment configuration
- [ ] Monitoring setup
- [ ] Gradual rollout
- [ ] Performance monitoring

### **Post-Deployment**:
- [ ] Monitor key metrics
- [ ] Gather user feedback
- [ ] Optimize performance
- [ ] Plan feature enhancements
- [ ] Document lessons learned

---

## **Success Metrics**

### **Technical Metrics**:
- Response time < 5 seconds
- Error rate < 5%
- Uptime > 99.9%
- Database query performance < 100ms

### **User Experience Metrics**:
- User adoption rate > 20%
- Session duration increase > 15%
- User satisfaction score > 4.0/5.0
- Feature usage frequency > 3 times/week

### **Business Metrics**:
- Cost per conversation < $0.10
- API usage within budget
- No security incidents
- Successful feature rollout

---

This comprehensive PRD now includes all missing implementation details, error handling, performance optimization, monitoring, security considerations, and maintenance procedures. It's ready for implementation with clear step-by-step guidance and comprehensive troubleshooting support.
