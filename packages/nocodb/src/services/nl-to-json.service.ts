import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface NocoDBRequest {
  project_id: string;
  table_id: string;
  operation: 'list' | 'get' | 'create' | 'update' | 'delete';
  query?: {
    limit?: number;
    offset?: number;
    filters?: any;
    sort?: any[];
  };
}

export interface MetadataItem {
  id: string;
  title: string;
}

@Injectable()
export class NlToJsonService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get('ai.apiKey');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async convertToJson(naturalLanguage: string, context?: any): Promise<NocoDBRequest | null> {
    if (!this.openai) {
      console.log('NLtoJSON: OpenAI not initialized');
      return null;
    }

    console.log('NLtoJSON: Converting NL to JSON:', naturalLanguage);

    const systemPrompt = `You are an assistant that converts natural language into structured API requests for NocoDB.

IMPORTANT: Your ONLY job is to generate JSON. Do NOT ask questions or provide explanations.

- If the user request has enough information, generate a valid JSON request in this exact structure:
  {
    "project_id": "<project_name>",
    "table_id": "<table_name>",
    "operation": "<list|get|create|update|delete>",
    "query": { "limit": 50, "offset": 0 }
  }

- If the request is missing project_id or table_id, use "default" as the value.
- For operations, map these keywords:
  * "show", "list", "get", "find", "search" → "list"
  * "create", "add", "insert", "new" → "create"
  * "update", "edit", "modify", "change" → "update"
  * "delete", "remove", "drop" → "delete"

- SPECIAL CASE: For "list all bases" or "show bases" queries, use:
  {
    "project_id": "default",
    "table_id": "bases",
    "operation": "list",
    "query": { "limit": 50, "offset": 0 }
  }

- ALWAYS respond with ONLY valid JSON, no other text.
- Do NOT ask clarifying questions - just generate the JSON with available information.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: naturalLanguage }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content?.trim();
      console.log('NLtoJSON: LLM Response:', response);

      if (!response) {
        return null;
      }

      // Check if response is a question (needs clarification)
      if (response.includes('?') && !response.includes('{')) {
        console.log('NLtoJSON: LLM asked a question instead of generating JSON');
        console.log('NLtoJSON: Response was:', response);
        return null;
      }

      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('NLtoJSON: No JSON found in response');
        return null;
      }

      const jsonStr = jsonMatch[0];
      const parsedRequest = JSON.parse(jsonStr) as NocoDBRequest;
      
      console.log('NLtoJSON: Parsed JSON Request:', JSON.stringify(parsedRequest, null, 2));
      
      return parsedRequest;
    } catch (error) {
      console.error('NLtoJSON: Error converting NL to JSON:', error);
      return null;
    }
  }

  async resolveMetadata(projectName: string, tableName?: string): Promise<{ projectId?: string; tableId?: string }> {
    try {
      // For now, we'll use a simple mapping approach
      // In a real implementation, this would call NocoDB metadata APIs
      console.log('NLtoJSON: Resolving metadata for project:', projectName, 'table:', tableName);
      
      // Placeholder implementation - replace with actual API calls
      const projectId = projectName.toLowerCase().replace(/\s+/g, '_');
      const tableId = tableName ? tableName.toLowerCase().replace(/\s+/g, '_') : undefined;
      
      console.log('NLtoJSON: Resolved IDs - project:', projectId, 'table:', tableId);
      
      return { projectId, tableId };
    } catch (error) {
      console.error('NLtoJSON: Error resolving metadata:', error);
      return {};
    }
  }

  async executeRequest(request: NocoDBRequest): Promise<any> {
    try {
      console.log('NLtoJSON: Executing request:', JSON.stringify(request, null, 2));
      
      // For "list all bases" query, call the actual bases API
      if (request.operation === 'list' && request.table_id === 'bases') {
        console.log('NLtoJSON: Calling bases API to list all bases');
        
        // This would be the actual API call to NocoDB bases endpoint
        // For now, return a structured response that the formatter can work with
        const response = {
          success: true,
          operation: 'list_bases',
          data: [
            {
              id: 'default',
              title: 'Default Base',
              description: 'Default NocoDB base',
              sources: []
            }
          ],
          message: 'Successfully retrieved list of bases'
        };
        
        console.log('NLtoJSON: Execution response:', response);
        return response;
      }
      
      // For other operations, use placeholder for now
      const response = {
        success: true,
        data: [],
        message: `Executed ${request.operation} operation on ${request.table_id} in ${request.project_id}`
      };
      
      console.log('NLtoJSON: Execution response:', response);
      return response;
    } catch (error) {
      console.error('NLtoJSON: Error executing request:', error);
      throw error;
    }
  }

  async formatResponse(rawResponse: any): Promise<string> {
    if (!this.openai) {
      return JSON.stringify(rawResponse, null, 2);
    }

    try {
      console.log('NLtoJSON: Formatting response for display');
      
      const systemPrompt = `You are an assistant that formats NocoDB API responses into human-friendly text.

- Convert the raw API response into natural, conversational language
- Highlight key information and results
- Keep the response concise and easy to understand
- If there are errors, explain them clearly`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Format this response: ${JSON.stringify(rawResponse)}` }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      const formattedResponse = completion.choices[0]?.message?.content?.trim();
      console.log('NLtoJSON: Formatted response:', formattedResponse);
      
      return formattedResponse || JSON.stringify(rawResponse, null, 2);
    } catch (error) {
      console.error('NLtoJSON: Error formatting response:', error);
      return JSON.stringify(rawResponse, null, 2);
    }
  }
}
