import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface QueryEntity {
  base?: string;
  table?: string;
  view?: string;
  filters?: Record<string, unknown>;
  format?: 'table' | 'json' | 'chart';
}

export interface QueryStep {
  action: string;
  endpoint: string;
  params?: Record<string, unknown>;
}

export interface QueryPlan {
  intent: string;
  entities: QueryEntity;
  steps: QueryStep[];
}

@Injectable()
export class LlmPlannerService {
  private readonly logger = new Logger(LlmPlannerService.name);
  private openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get('ai');
    if (config?.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        timeout: config.timeout,
        maxRetries: config.retries,
      });
    }
  }

  /**
   * Convert natural language query to structured plan
   */
  async createPlan(userQuery: string): Promise<QueryPlan> {
    this.logger.log(`Creating plan for query: ${userQuery}`);

    if (!this.openai) {
      throw new Error('OpenAI client not initialized. Please check your API key configuration.');
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userQuery }
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      if (!response) {
        throw new Error('No response from LLM');
      }

      this.logger.log(`LLM Response: ${response}`);

      // Parse the JSON response
      const plan = this.parsePlanResponse(response);
      this.logger.log(`Parsed plan: ${JSON.stringify(plan, null, 2)}`);

      return plan;
    } catch (error) {
      this.logger.error('Error creating plan:', error);
      throw new Error(`Failed to create query plan: ${error.message}`);
    }
  }

  /**
   * Build the system prompt for the LLM
   */
  private buildSystemPrompt(): string {
    return `You are an assistant that converts natural language queries into structured NocoDB API request plans.

Rules:
1. Do not generate actual API responses.
2. Always decompose queries into step-by-step actions.
3. Only use valid NocoDB API endpoints:
   - GET /api/v2/meta/bases
   - GET /api/v2/meta/bases/{baseId}/tables
   - GET /api/v2/meta/bases/{baseId}/views
   - GET /api/v2/meta/bases/{baseId}/tables/{tableId}/rows
   - GET /api/v2/meta/bases/{baseId}/views/{viewId}/rows
4. If user gives only a table/view name, first iterate through bases to locate it.
5. Support filters (map conditions like "city = New York" into query parameters).
6. Output JSON with intent, entities, and ordered steps.

Output format:
{
  "intent": "string",
  "entities": { "base": "optional", "table": "optional", "view": "optional", "filters": "optional", "format": "optional" },
  "steps": [
    { "action": "description", "endpoint": "endpoint with placeholders", "params": "optional" }
  ]
}

Examples:

User: "Get all data from Orders"
Response:
{
  "intent": "fetch_data",
  "entities": { "table": "Orders" },
  "steps": [
    { "action": "list all bases", "endpoint": "/api/v2/meta/bases" },
    { "action": "for each base, list tables", "endpoint": "/api/v2/meta/bases/{baseId}/tables" },
    { "action": "find target 'Orders' in tables", "endpoint": "n/a" },
    { "action": "fetch rows from Orders table", "endpoint": "/api/v2/meta/bases/{baseId}/tables/{tableId}/rows" }
  ]
}

User: "Show customers in New York"
Response:
{
  "intent": "fetch_filtered_data",
  "entities": { "table": "customers", "filters": { "city": "New York" } },
  "steps": [
    { "action": "list all bases", "endpoint": "/api/v2/meta/bases" },
    { "action": "for each base, list tables", "endpoint": "/api/v2/meta/bases/{baseId}/tables" },
    { "action": "find target 'customers' in tables", "endpoint": "n/a" },
    { "action": "fetch filtered rows from customers table", "endpoint": "/api/v2/meta/bases/{baseId}/tables/{tableId}/rows", "params": { "where": "city,eq,New York" } }
  ]
}

User: "List all bases"
Response:
{
  "intent": "list_bases",
  "entities": {},
  "steps": [
    { "action": "list all bases", "endpoint": "/api/v2/meta/bases" }
  ]
}

ALWAYS respond with ONLY valid JSON, no other text.`;
  }

  /**
   * Parse the LLM response into a QueryPlan
   */
  private parsePlanResponse(response: string): QueryPlan {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);

      // Validate the structure
      if (!parsed.intent || !parsed.entities || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid plan structure');
      }

      // Ensure entities has the correct structure
      const entities: QueryEntity = {
        base: parsed.entities.base,
        table: parsed.entities.table,
        view: parsed.entities.view,
        filters: parsed.entities.filters,
        format: parsed.entities.format,
      };

      // Validate steps
      const steps: QueryStep[] = parsed.steps.map((step: Record<string, unknown>, index: number) => {
        if (!step.action || !step.endpoint) {
          throw new Error(`Invalid step at index ${index}`);
        }
        return {
          action: step.action as string,
          endpoint: step.endpoint as string,
          params: step.params as Record<string, unknown> | undefined,
        };
      });

      return {
        intent: parsed.intent,
        entities,
        steps,
      };
    } catch (error) {
      this.logger.error('Error parsing plan response:', error);
      this.logger.error('Raw response:', response);
      
      // Return a fallback plan
      return {
        intent: 'unknown',
        entities: {},
        steps: [
          {
            action: 'list all bases',
            endpoint: '/api/v2/meta/bases',
          }
        ]
      };
    }
  }

  /**
   * Validate if a query plan is complete and executable
   */
  validatePlan(plan: QueryPlan): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.intent) {
      errors.push('Plan must have an intent');
    }

    if (!plan.steps || plan.steps.length === 0) {
      errors.push('Plan must have at least one step');
    }

    for (const step of plan.steps) {
      if (!step.action) {
        errors.push('Each step must have an action');
      }
      if (!step.endpoint) {
        errors.push('Each step must have an endpoint');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
