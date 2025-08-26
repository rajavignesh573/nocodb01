import { Injectable } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import OpenAI from 'openai';
import { Base, Model, Column } from '~/models';
import NcConnectionMgrv2 from '~/utils/common/NcConnectionMgrv2';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private config: Record<string, unknown>;

  constructor() {
    // Initialize configuration
    this.config = {
      enabled: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
    };

    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  async processMessage(message: string, context?: NcContext): Promise<string> {
    try {
      console.log('Processing message:', message);

      // Check if it's a database query
      if (this.isDatabaseQuery(message)) {
        return await this.handleDatabaseQuery(message, context);
      }

      // Handle regular AI chat
      return await this.handleGeneralQuery(message);
    } catch (error) {
      console.error('Error processing message:', error);
      return 'Sorry, I encountered an error while processing your message. Please try again.';
    }
  }

  private isDatabaseQuery(message: string): boolean {
    const databaseKeywords = ['bases', 'tables', 'data', 'filter', 'where', 'from', 'list', 'get', 'show'];
    const lowerMessage = message.toLowerCase();
    
    // Check if message contains database-related keywords
    const hasDatabaseKeywords = databaseKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Additional check for specific database operations
    const isSpecificOperation = lowerMessage.includes('get all') || 
                               lowerMessage.includes('list all') || 
                               lowerMessage.includes('show all') ||
                               lowerMessage.includes('from base') ||
                               lowerMessage.includes('from table');
    
    return hasDatabaseKeywords || isSpecificOperation;
  }

  private async handleDatabaseQuery(message: string, context?: NcContext): Promise<string> {
    const lowerMessage = message.toLowerCase();

    try {
      // Handle "get all bases" or "list bases"
      if ((lowerMessage.includes('bases') || lowerMessage.includes('base')) && 
          (lowerMessage.includes('get') || lowerMessage.includes('list') || lowerMessage.includes('show'))) {
        // Check if it's specifically about tables
        if (lowerMessage.includes('tables')) {
          const baseName = this.extractBaseName(message);
          return await this.handleListTables(message, baseName, context);
        }
        // Otherwise it's about bases
        return await this.handleListBases(message, context);
      }

      // Handle "get tables from base X" or "list tables from base X"
      if (lowerMessage.includes('tables') && lowerMessage.includes('base')) {
        const baseName = this.extractBaseName(message);
        return await this.handleListTables(message, baseName, context);
      }

      // Handle "get data from table X"
      if (lowerMessage.includes('data') && lowerMessage.includes('table')) {
        const { baseName, tableName } = this.extractBaseAndTableNames(message);
        return await this.handleGetTableData(message, baseName, tableName, context);
      }

      // Handle filtering
      if (lowerMessage.includes('filter') || lowerMessage.includes('where')) {
        const { baseName, tableName, filterCondition } = this.extractFilterInfo(message);
        return await this.handleFilterData(message, baseName, tableName, filterCondition, context);
      }

      return 'I understand you want to query the database. Try commands like:\n• "get all bases"\n• "get tables from base [name]"\n• "get data from table [name]"\n• "filter [table] where [condition]"';
    } catch (error) {
      console.error('Database query error:', error);
      return `❌ Database query failed: ${(error as Error).message}`;
    }
  }

  // Direct database access methods
  private async handleListBases(message: string, context?: NcContext): Promise<string> {
    try {
      console.log('Getting all bases directly from database');
      
      // Get all bases directly from the database
      const bases = await Base.list();
      
      if (!bases || bases.length === 0) {
        return 'No bases found in your workspace.';
      }

      let result = '**Available Bases:**\n\n';
      for (const base of bases) {
        result += `• **${base.title}** (ID: ${base.id})\n`;
        if (base.description) {
          result += `  Description: ${base.description}\n`;
        }
        result += '\n';
      }

      return result;
    } catch (error) {
      console.error('Error listing bases:', error);
      return `❌ Failed to list bases: ${(error as Error).message}`;
    }
  }

  private async handleListTables(message: string, baseName: string, context?: NcContext): Promise<string> {
    try {
      console.log(`Getting tables for base: ${baseName}`);
      console.log(`Original message: ${message}`);
      console.log(`Extracted base name: ${baseName}`);
      
      // Get all bases to find the target base
      const bases = await Base.list();
      const base = bases.find((b) => 
        b.title.toLowerCase() === baseName.toLowerCase() || 
        b.id.toLowerCase() === baseName.toLowerCase()
      );

      if (!base) {
        return `❌ Base "${baseName}" not found. Available bases: ${bases.map((b) => b.title).join(', ')}`;
      }

      // Get tables for the specific base
      const defaultContext: NcContext = {
        workspace_id: base.fk_workspace_id,
        base_id: base.id
      };
      console.log('Debug - Context:', defaultContext);
      console.log('Debug - Base:', { id: base.id, title: base.title, fk_workspace_id: base.fk_workspace_id });
      
      // Get sources for the base
      const sources = await base.getSources();
      console.log('Debug - Sources found:', sources?.length || 0);
      
      if (!sources || sources.length === 0) {
        return `No data sources found in base "${base.title}".`;
      }
      
      // Try to get tables directly from the database without visibility restrictions
      const Noco = await import('~/Noco');
      const ncMeta = Noco.default.ncMeta;
      
             // Query the nc_models_v2 table directly
       const tables = await ncMeta.knex('nc_models_v2')
         .where('base_id', base.id)
         .select('id', 'title', 'table_name', 'type');
      
      console.log('Debug - Tables found:', tables?.length || 0);
      console.log('Debug - Tables:', tables?.map(t => ({ id: t.id, title: t.title })));

      if (!tables || tables.length === 0) {
        return `No tables found in base "${base.title}".`;
      }

      let result = `**Tables in Base "${base.title}":**\n\n`;
      for (const table of tables) {
        result += `• **${table.title}** (ID: ${table.id})\n`;
        if (table.table_name) {
          result += `  Table Name: ${table.table_name}\n`;
        }
        if (table.type) {
          result += `  Type: ${table.type}\n`;
        }
        result += '\n';
      }

      return result;
    } catch (error) {
      console.error('Error listing tables:', error);
      return `❌ Failed to list tables: ${(error as Error).message}`;
    }
  }

  private async handleGetTableData(message: string, baseName: string, tableName: string, context?: NcContext): Promise<string> {
    try {
      console.log(`Getting data from table: ${tableName} in base: ${baseName}`);
      console.log(`Original message: ${message}`);
      console.log(`Extracted tableName: "${tableName}", baseName: "${baseName}"`);
      
      if (!tableName) {
        return '❌ Please specify a table name. Example: "get data from table users"';
      }

      // Get all bases first
      const bases = await Base.list();
      
      // If no base specified, try to find the table in all bases
      let base: typeof bases[0] | undefined;
      if (!baseName) {
        console.log('No base specified, searching for table in all bases...');
        
        // Search for the table in all bases
        for (const b of bases) {
          const Noco = await import('~/Noco');
          const ncMeta = Noco.default.ncMeta;
          
          const tables = await ncMeta.knex('nc_models_v2')
            .where('base_id', b.id)
            .select('id', 'title', 'table_name', 'type');
          
          const foundTable = tables.find((t) => 
            t.title.toLowerCase() === tableName.toLowerCase() || 
            t.id.toLowerCase() === tableName.toLowerCase()
          );
          
          if (foundTable) {
            base = b;
            console.log(`Found table "${tableName}" in base "${b.title}"`);
            break;
          }
        }
        
        if (!base) {
          return `❌ Table "${tableName}" not found in any base. Available bases: ${bases.map((b) => b.title).join(', ')}`;
        }
      } else {
        // Base was specified, find it
        base = bases.find((b) => 
          b.title.toLowerCase() === baseName.toLowerCase() || 
          b.id.toLowerCase() === baseName.toLowerCase()
        );

        if (!base) {
          return `❌ Base "${baseName}" not found. Available bases: ${bases.map((b) => b.title).join(', ')}`;
        }
      }

             // Get table directly from database like we did for listing tables
       const Noco = await import('~/Noco');
       const ncMeta = Noco.default.ncMeta;
       
       // Query the nc_models_v2 table directly to find the table
       const tables = await ncMeta.knex('nc_models_v2')
         .where('base_id', base.id)
         .select('id', 'title', 'table_name', 'type');
       
       const table = tables.find((t) => 
         t.title.toLowerCase() === tableName.toLowerCase() || 
         t.id.toLowerCase() === tableName.toLowerCase()
       );

       if (!table) {
         return `❌ Table "${tableName}" not found in base "${base.title}".`;
       }

       // Get the table model directly from database
       const baseModel = await ncMeta.knex('nc_models_v2')
         .where('id', table.id)
         .first();
      
      // Get sources for the base to get the database connection
      const sources = await base.getSources();
      if (!sources || sources.length === 0) {
        return `No data sources found in base "${base.title}".`;
      }
      const source = sources[0];
      const dbDriver = await NcConnectionMgrv2.get(source);
      
      // Execute query with limit
      const query = dbDriver(baseModel.table_name).limit(10);
      const data = await query;

      if (!data || data.length === 0) {
        return `No data found in table "${tableName}".`;
      }

      let response = `**Data from Table "${tableName}":**\n\n`;
      response += `Total records shown: ${data.length} (limited to 10)\n\n`;

      // Show first few records
      const recordsToShow = data.slice(0, 5);
      for (let i = 0; i < recordsToShow.length; i++) {
        const record = recordsToShow[i];
        response += `**Record ${i + 1}:**\n`;
        for (const [key, value] of Object.entries(record)) {
          response += `  ${key}: ${value}\n`;
        }
        response += '\n';
      }

      if (data.length > 5) {
        response += `... and ${data.length - 5} more records.`;
      }

      return response;
    } catch (error) {
      console.error('Error getting table data:', error);
      return `❌ Failed to get table data: ${(error as Error).message}`;
    }
  }

  private async handleFilterData(message: string, baseName: string, tableName: string, filterCondition: string, context?: NcContext): Promise<string> {
    try {
      console.log(`Filtering data from table: ${tableName} with condition: ${filterCondition}`);
      
      if (!tableName || !filterCondition) {
        return '❌ Please specify both table name and filter condition. Example: "filter users where name contains John"';
      }

      // Get all bases first
      const bases = await Base.list();
      
      // If no base specified, try to find the table in all bases
      let base: typeof bases[0] | undefined;
      if (!baseName) {
        console.log('No base specified, searching for table in all bases...');
        
        // Search for the table in all bases
        for (const b of bases) {
          const Noco = await import('~/Noco');
          const ncMeta = Noco.default.ncMeta;
          
          const tables = await ncMeta.knex('nc_models_v2')
            .where('base_id', b.id)
            .select('id', 'title', 'table_name', 'type');
          
          const foundTable = tables.find((t) => 
            t.title.toLowerCase() === tableName.toLowerCase() || 
            t.id.toLowerCase() === tableName.toLowerCase()
          );
          
          if (foundTable) {
            base = b;
            console.log(`Found table "${tableName}" in base "${b.title}"`);
            break;
          }
        }
        
        if (!base) {
          return `❌ Table "${tableName}" not found in any base. Available bases: ${bases.map((b) => b.title).join(', ')}`;
        }
      } else {
        // Base was specified, find it
        base = bases.find((b) => 
          b.title.toLowerCase() === baseName.toLowerCase() || 
          b.id.toLowerCase() === baseName.toLowerCase()
        );

        if (!base) {
          return `❌ Base "${baseName}" not found. Available bases: ${bases.map((b) => b.title).join(', ')}`;
        }
      }

             // Get table directly from database like we did for listing tables
       const Noco = await import('~/Noco');
       const ncMeta = Noco.default.ncMeta;
       
       // Query the nc_models_v2 table directly to find the table
       const tables = await ncMeta.knex('nc_models_v2')
         .where('base_id', base.id)
         .select('id', 'title', 'table_name', 'type');
       
       const table = tables.find((t) => 
         t.title.toLowerCase() === tableName.toLowerCase() || 
         t.id.toLowerCase() === tableName.toLowerCase()
       );

       if (!table) {
         return `❌ Table "${tableName}" not found in base "${base.title}".`;
       }

       // Get the table model directly from database
       const baseModel = await ncMeta.knex('nc_models_v2')
         .where('id', table.id)
         .first();
      
      // Get sources for the base to get the database connection
      const sources = await base.getSources();
      if (!sources || sources.length === 0) {
        return `No data sources found in base "${base.title}".`;
      }
      const source = sources[0];
      const dbDriver = await NcConnectionMgrv2.get(source);
      
      // Build and execute filtered query
      let query = dbDriver(baseModel.table_name).limit(10);
      
      // Simple filter parsing
      if (filterCondition.toLowerCase().includes('contains')) {
        const match = filterCondition.match(/(\w+)\s+contains\s+["']?([^"']+)["']?/i);
        if (match) {
          query = query.where(match[1], 'like', `%${match[2]}%`);
        }
      } else if (filterCondition.toLowerCase().includes('equals') || filterCondition.includes('=')) {
        const match = filterCondition.match(/(\w+)\s*(?:equals|=)\s*["']?([^"']+)["']?/i);
        if (match) {
          query = query.where(match[1], match[2]);
        }
      }

      const data = await query;

      if (!data || data.length === 0) {
        return `No data found in table "${tableName}" matching the filter condition.`;
      }

      let response = `**Filtered Data from Table "${tableName}":**\n\n`;
      response += `Filter condition: ${filterCondition}\n`;
      response += `Total records found: ${data.length}\n\n`;

      // Show first few records
      const recordsToShow = data.slice(0, 5);
      for (let i = 0; i < recordsToShow.length; i++) {
        const record = recordsToShow[i];
        response += `**Record ${i + 1}:**\n`;
        for (const [key, value] of Object.entries(record)) {
          response += `  ${key}: ${value}\n`;
        }
        response += '\n';
      }

      if (data.length > 5) {
        response += `... and ${data.length - 5} more records.`;
      }

      return response;
    } catch (error) {
      console.error('Error filtering data:', error);
      return `❌ Failed to filter data: ${(error as Error).message}`;
    }
  }

  // Helper methods for parsing natural language
  private extractBaseName(message: string): string {
    // Try different patterns to extract base name
    const patterns = [
      /(?:from|in)\s+base\s+["']?([^"'\s]+)["']?/i,
      /base\s+["']?([^"'\s]+)["']?/i,
      /["']?([^"'\s]+)["']?\s+base/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return 'default';
  }

  private extractBaseAndTableNames(message: string): { baseName: string; tableName: string } {
    // Look for patterns like "from table Test001" or "table Test001"
    const tableMatch = message.match(/(?:from\s+)?table\s+["']?([^"'\s]+)["']?/i);
    const baseMatch = message.match(/(?:base|in)\s+["']?([^"'\s]+)["']?/i);
    
    return {
      tableName: tableMatch ? tableMatch[1] : '',
      baseName: baseMatch ? baseMatch[1] : '', // Don't default to 'default'
    };
  }

  private extractFilterInfo(message: string): { baseName: string; tableName: string; filterCondition: string } {
    // Look for patterns like "filter Test001" or "filter table Test001"
    const tableMatch = message.match(/filter\s+(?:table\s+)?["']?([^"'\s]+)["']?/i);
    const whereMatch = message.match(/where\s+(.+?)(?:\s+(?:in|from)\s+|$)/i);
    const baseMatch = message.match(/(?:base|in)\s+["']?([^"'\s]+)["']?/i);
    
    return {
      tableName: tableMatch ? tableMatch[1] : '',
      baseName: baseMatch ? baseMatch[1] : '', // Don't default to 'default'
      filterCondition: whereMatch ? whereMatch[1] : ''
    };
  }

  private async handleGeneralQuery(message: string): Promise<string> {
    try {
      if (!this.openai) {
        return 'Hello! How can I assist you today? If you have any questions about databases, SQL queries, or anything else, feel free to ask!';
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for NocoDB, a no-code database platform. Help users with database queries, data management, and general questions. Be concise and helpful.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      return 'Hello! How can I assist you today? If you have any questions about databases, SQL queries, or anything else, feel free to ask!';
    }
  }

  async healthCheck(): Promise<{ status: string; details?: Record<string, unknown> }> {
    try {
      // Check if OpenAI is configured
      const hasOpenAI = !!this.openai;
      
      // Check if we can make a simple API call
      let apiStatus = 'unknown';
      if (hasOpenAI) {
        try {
          // Make a simple test call
          await this.openai.models.list();
          apiStatus = 'healthy';
        } catch (error) {
          apiStatus = 'unhealthy';
          console.error('OpenAI API health check failed:', error);
        }
      }

      return {
        status: hasOpenAI ? apiStatus : 'not_configured',
        details: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          hasApiKey: hasOpenAI,
          apiStatus
        }
      };
    } catch (error) {
      console.error('Health check error:', error);
      return {
        status: 'unhealthy',
        details: {
          error: error.message
        }
      };
    }
  }
}