import { Injectable, Logger } from '@nestjs/common';
import type { NcContext } from '~/interface/config';
import { LlmPlannerService, QueryPlan } from './llm-planner.service';
import { QueryExecutorService, ExecutionResult } from './query-executor.service';
import { ResponseFormatterService, FormattedResponse } from './response-formatter.service';
import { SchemaCatalogService } from './schema-catalog.service';

export interface OrchestrationResult {
  success: boolean;
  content: string;
  format: 'table' | 'json' | 'chart';
  metadata?: {
    intent?: string;
    executionTime?: number;
    rowCount?: number;
    columnCount?: number;
    plan?: QueryPlan;
  };
  error?: string;
}

@Injectable()
export class NlOrchestratorService {
  private readonly logger = new Logger(NlOrchestratorService.name);

  constructor(
    private readonly llmPlannerService: LlmPlannerService,
    private readonly queryExecutorService: QueryExecutorService,
    private readonly responseFormatterService: ResponseFormatterService,
    private readonly schemaCatalogService: SchemaCatalogService,
  ) {}

  /**
   * Main entry point for natural language query processing
   */
  async processQuery(
    context: NcContext,
    userQuery: string,
    requestedFormat: 'table' | 'json' | 'chart' = 'table',
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    this.logger.log(`Processing query: ${userQuery}`);

    try {
      // Step 1: Initialize schema catalog if needed
      await this.ensureSchemaCatalogInitialized(context);

      // Step 2: Create query plan using LLM
      const plan = await this.createQueryPlan(userQuery);
      this.logger.log(`Created plan with intent: ${plan.intent}`);

      // Step 3: Execute the plan
      const executionResult = await this.executeQueryPlan(context, plan);
      this.logger.log(`Execution completed: ${executionResult.success}`);

      // Step 4: Format the response
      const format = plan.entities.format || requestedFormat;
      const formattedResponse = await this.formatResponse(executionResult, format);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        content: formattedResponse.content,
        format: formattedResponse.format,
        metadata: {
          intent: plan.intent,
          executionTime,
          rowCount: formattedResponse.metadata?.rowCount,
          columnCount: formattedResponse.metadata?.columnCount,
          plan,
        },
      };
    } catch (error) {
      this.logger.error('Error processing query:', error);
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        content: `Error processing query: ${error.message}`,
        format: requestedFormat,
        error: error.message,
        metadata: {
          executionTime,
        },
      };
    }
  }

  /**
   * Ensure schema catalog is initialized
   */
  private async ensureSchemaCatalogInitialized(context: NcContext): Promise<void> {
    try {
      const catalog = this.schemaCatalogService.getCatalog();
      if (catalog.bases.length === 0) {
        this.logger.log('Schema catalog is empty, initializing...');
        await this.schemaCatalogService.initialize(context);
      }
    } catch (error) {
      this.logger.warn('Failed to initialize schema catalog:', error);
      // Continue without catalog - will use fallback logic
    }
  }

  /**
   * Create query plan using LLM
   */
  private async createQueryPlan(userQuery: string): Promise<QueryPlan> {
    try {
      const plan = await this.llmPlannerService.createPlan(userQuery);
      
      // Validate the plan
      const validation = this.llmPlannerService.validatePlan(plan);
      if (!validation.isValid) {
        throw new Error(`Invalid plan: ${validation.errors.join(', ')}`);
      }

      return plan;
    } catch (error) {
      this.logger.error('Error creating query plan:', error);
      throw new Error(`Failed to create query plan: ${error.message}`);
    }
  }

  /**
   * Execute the query plan
   */
  private async executeQueryPlan(context: NcContext, plan: QueryPlan): Promise<ExecutionResult> {
    try {
      const result = await this.queryExecutorService.executePlan(context, plan);
      
      if (!result.success) {
        this.logger.error('Query execution failed:', result.error);
      }

      return result;
    } catch (error) {
      this.logger.error('Error executing query plan:', error);
      throw new Error(`Failed to execute query plan: ${error.message}`);
    }
  }

  /**
   * Format the execution result
   */
  private async formatResponse(
    result: ExecutionResult,
    format: 'table' | 'json' | 'chart',
  ): Promise<FormattedResponse> {
    try {
      return await this.responseFormatterService.formatResponse(result, format);
    } catch (error) {
      this.logger.error('Error formatting response:', error);
      return this.responseFormatterService.formatError(
        `Failed to format response: ${error.message}`,
        result.metadata?.executionTime,
      );
    }
  }

  /**
   * Handle ambiguous entity names
   */
  async handleAmbiguousEntity(
    context: NcContext,
    entityType: 'table' | 'view' | 'base',
    entityName: string,
  ): Promise<OrchestrationResult> {
    try {
      const catalog = await this.schemaCatalogService.getCatalogWithRefresh(context);
      const matches: Array<{ id: string; title: string; baseId: string; baseTitle: string }> = [];

      for (const base of catalog.bases) {
        if (entityType === 'table') {
          for (const table of base.tables) {
            if (table.title.toLowerCase().includes(entityName.toLowerCase())) {
              matches.push({
                id: table.id,
                title: table.title,
                baseId: base.id,
                baseTitle: base.title,
              });
            }
          }
        } else if (entityType === 'view') {
          for (const view of base.views) {
            if (view.title.toLowerCase().includes(entityName.toLowerCase())) {
              matches.push({
                id: view.id,
                title: view.title,
                baseId: base.id,
                baseTitle: base.title,
              });
            }
          }
        } else if (entityType === 'base') {
          if (base.title.toLowerCase().includes(entityName.toLowerCase())) {
            matches.push({
              id: base.id,
              title: base.title,
              baseId: base.id,
              baseTitle: base.title,
            });
          }
        }
      }

      if (matches.length === 0) {
        return {
          success: false,
          content: `No ${entityType} found matching "${entityName}"`,
          format: 'table',
          error: 'Entity not found',
        };
      }

      if (matches.length === 1) {
        return {
          success: true,
          content: `Found ${entityType}: "${matches[0].title}" in base "${matches[0].baseTitle}"`,
          format: 'table',
          metadata: {
            intent: 'entity_resolution',
          },
        };
      }

      // Multiple matches - return list
      let content = `Multiple ${entityType}s found matching "${entityName}":\n\n`;
      for (const match of matches) {
        content += `• ${match.title} (in base: ${match.baseTitle})\n`;
      }
      content += '\nPlease be more specific by including the base name.';

      return {
        success: false,
        content,
        format: 'table',
        error: 'Ambiguous entity name',
        metadata: {
          intent: 'entity_resolution',
        },
      };
    } catch (error) {
      this.logger.error('Error handling ambiguous entity:', error);
      return {
        success: false,
        content: `Error resolving ${entityType}: ${error.message}`,
        format: 'table',
        error: error.message,
      };
    }
  }

  /**
   * Refresh schema catalog
   */
  async refreshSchemaCatalog(context: NcContext): Promise<OrchestrationResult> {
    try {
      await this.schemaCatalogService.refreshCatalog(context);
      const catalog = this.schemaCatalogService.getCatalog();
      
      return {
        success: true,
        content: `Schema catalog refreshed successfully. Found ${catalog.bases.length} bases.`,
        format: 'table',
        metadata: {
          intent: 'schema_refresh',
          rowCount: catalog.bases.length,
        },
      };
    } catch (error) {
      this.logger.error('Error refreshing schema catalog:', error);
      return {
        success: false,
        content: `Failed to refresh schema catalog: ${error.message}`,
        format: 'table',
        error: error.message,
      };
    }
  }

  /**
   * Get schema information
   */
  async getSchemaInfo(context: NcContext): Promise<OrchestrationResult> {
    try {
      const catalog = await this.schemaCatalogService.getCatalogWithRefresh(context);
      
      let content = '**Available Schema Information:**\n\n';
      
      for (const base of catalog.bases) {
        content += `**Base: ${base.title}** (${base.id})\n`;
        if (base.description) {
          content += `Description: ${base.description}\n`;
        }
        
        content += `\nTables (${base.tables.length}):\n`;
        for (const table of base.tables) {
          content += `• ${table.title} (${table.columns.length} columns)\n`;
        }
        
        content += `\nViews (${base.views.length}):\n`;
        for (const view of base.views) {
          content += `• ${view.title}\n`;
        }
        
        content += '\n---\n\n';
      }

      return {
        success: true,
        content,
        format: 'table',
        metadata: {
          intent: 'schema_info',
          rowCount: catalog.bases.length,
        },
      };
    } catch (error) {
      this.logger.error('Error getting schema info:', error);
      return {
        success: false,
        content: `Failed to get schema information: ${error.message}`,
        format: 'table',
        error: error.message,
      };
    }
  }
}
