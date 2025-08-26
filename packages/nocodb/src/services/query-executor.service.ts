import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NcContext } from '~/interface/config';
import type { QueryPlan, QueryStep } from './llm-planner.service';
import { SchemaCatalogService } from './schema-catalog.service';
import { DataV3Service } from '~/services/v3/data-v3.service';
import { BasesV3Service } from '~/services/v3/bases-v3.service';
import { TablesV3Service } from '~/services/v3/tables-v3.service';
import { ViewsV3Service } from '~/services/v3/views-v3.service';

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    baseId?: string;
    tableId?: string;
    viewId?: string;
    rowCount?: number;
    executionTime?: number;
  };
}

export interface ResolvedStep {
  action: string;
  endpoint: string;
  params?: Record<string, unknown>;
  resolvedEndpoint: string;
  resolvedParams?: Record<string, unknown>;
}

@Injectable()
export class QueryExecutorService {
  private readonly logger = new Logger(QueryExecutorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schemaCatalogService: SchemaCatalogService,
    private readonly dataV3Service: DataV3Service,
    private readonly basesV3Service: BasesV3Service,
    private readonly tablesV3Service: TablesV3Service,
    private readonly viewsV3Service: ViewsV3Service,
  ) {}

  /**
   * Execute a query plan step by step
   */
  async executePlan(context: NcContext, plan: QueryPlan): Promise<ExecutionResult> {
    this.logger.log(`Executing plan with intent: ${plan.intent}`);
    const startTime = Date.now();

    try {
      const catalog = await this.schemaCatalogService.getCatalogWithRefresh(context);
      let currentResult: ExecutionResult | null = null;

      for (const step of plan.steps) {
        this.logger.log(`Executing step: ${step.action}`);
        
        const resolvedStep = await this.resolveStep(step, plan.entities, catalog);
        currentResult = await this.executeStep(context, resolvedStep);
        
        if (!currentResult.success) {
          return currentResult;
        }
      }

      const executionTime = Date.now() - startTime;
      return {
        ...currentResult,
        metadata: {
          ...currentResult?.metadata,
          executionTime,
        },
      };
    } catch (error) {
      this.logger.error('Error executing plan:', error);
      return {
        success: false,
        error: `Execution failed: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Resolve placeholders in a step using the schema catalog
   */
  private async resolveStep(
    step: QueryStep,
    entities: QueryPlan['entities'],
    catalog: any,
  ): Promise<ResolvedStep> {
    let resolvedEndpoint = step.endpoint;
    const resolvedParams = { ...step.params };

    // Resolve baseId placeholder
    if (resolvedEndpoint.includes('{baseId}')) {
      const baseId = await this.resolveBaseId(entities.base, catalog);
      resolvedEndpoint = resolvedEndpoint.replace(/{baseId}/g, baseId);
    }

    // Resolve tableId placeholder
    if (resolvedEndpoint.includes('{tableId}')) {
      const tableId = await this.resolveTableId(entities.table, entities.base, catalog);
      resolvedEndpoint = resolvedEndpoint.replace(/{tableId}/g, tableId);
    }

    // Resolve viewId placeholder
    if (resolvedEndpoint.includes('{viewId}')) {
      const viewId = await this.resolveViewId(entities.view, entities.base, catalog);
      resolvedEndpoint = resolvedEndpoint.replace(/{viewId}/g, viewId);
    }

    return {
      action: step.action,
      endpoint: step.endpoint,
      params: step.params,
      resolvedEndpoint,
      resolvedParams,
    };
  }

  /**
   * Execute a single resolved step
   */
  private async executeStep(context: NcContext, step: ResolvedStep): Promise<ExecutionResult> {
    this.logger.log(`Executing resolved step: ${step.action} -> ${step.resolvedEndpoint}`);

    try {
      // Check for exact match first
      if (step.resolvedEndpoint === '/api/v2/meta/bases') {
        return await this.executeListBases(context);
      }

      // Check for tables endpoint
      const tablesMatch = step.resolvedEndpoint.match(/\/api\/v2\/meta\/bases\/([^\/]+)\/tables$/);
      if (tablesMatch) {
        const baseId = tablesMatch[1];
        return await this.executeListTables(context, baseId);
      }

      // Check for views endpoint
      const viewsMatch = step.resolvedEndpoint.match(/\/api\/v2\/meta\/bases\/([^\/]+)\/views$/);
      if (viewsMatch) {
        const baseId = viewsMatch[1];
        return await this.executeListViews(context, baseId);
      }

      // Check for table rows endpoint
      const tableRowsMatch = step.resolvedEndpoint.match(/\/api\/v2\/meta\/bases\/([^\/]+)\/tables\/([^\/]+)\/rows$/);
      if (tableRowsMatch) {
        const [, baseId, tableId] = tableRowsMatch;
        return await this.executeFetchRows(context, baseId, tableId, step.resolvedParams);
      }

      // Check for view rows endpoint
      const viewRowsMatch = step.resolvedEndpoint.match(/\/api\/v2\/meta\/bases\/([^\/]+)\/views\/([^\/]+)\/rows$/);
      if (viewRowsMatch) {
        const [, baseId, viewId] = viewRowsMatch;
        return await this.executeFetchViewRows(context, baseId, viewId, step.resolvedParams);
      }

      // Unknown endpoint
      return {
        success: false,
        error: `Unknown endpoint: ${step.resolvedEndpoint}`,
      };
    } catch (error) {
      this.logger.error(`Error executing step ${step.action}:`, error);
      return {
        success: false,
        error: `Step execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Resolve base ID from name or use default
   */
  private async resolveBaseId(baseName: string | undefined, catalog: Record<string, unknown>): Promise<string> {
    const bases = catalog.bases as Array<Record<string, unknown>>;
    if (baseName) {
      const base = bases.find((b) => 
        (b.title as string)?.toLowerCase() === baseName.toLowerCase() ||
        (b.id as string)?.toLowerCase() === baseName.toLowerCase()
      );
      if (base) {
        return base.id as string;
      }
    }
    
    // Use first available base or default
    return (bases[0]?.id as string) || 'default';
  }

  /**
   * Resolve table ID from name
   */
  private async resolveTableId(tableName: string | undefined, baseName: string | undefined, catalog: Record<string, unknown>): Promise<string> {
    if (!tableName) {
      throw new Error('Table name is required');
    }

    const normalizedTableName = tableName.toLowerCase();
    const bases = catalog.bases as Array<Record<string, unknown>>;
    
    // Search in specified base first
    if (baseName) {
      const base = bases.find((b) => 
        (b.title as string)?.toLowerCase() === baseName.toLowerCase() ||
        (b.id as string)?.toLowerCase() === baseName.toLowerCase()
      );
      
      if (base) {
        const tables = base.tables as Array<Record<string, unknown>>;
        const table = tables.find((t) => 
          (t.title as string)?.toLowerCase() === normalizedTableName ||
          (t.id as string)?.toLowerCase() === normalizedTableName
        );
        if (table) {
          return table.id as string;
        }
      }
    }

    // Search in all bases
    for (const base of bases) {
      const tables = base.tables as Array<Record<string, unknown>>;
      const table = tables.find((t) => 
        (t.title as string)?.toLowerCase() === normalizedTableName ||
        (t.id as string)?.toLowerCase() === normalizedTableName
      );
      if (table) {
        return table.id as string;
      }
    }

    throw new Error(`Table '${tableName}' not found`);
  }

  /**
   * Resolve view ID from name
   */
  private async resolveViewId(viewName: string | undefined, baseName: string | undefined, catalog: Record<string, unknown>): Promise<string> {
    if (!viewName) {
      throw new Error('View name is required');
    }

    const normalizedViewName = viewName.toLowerCase();
    const bases = catalog.bases as Array<Record<string, unknown>>;
    
    // Search in specified base first
    if (baseName) {
      const base = bases.find((b) => 
        (b.title as string)?.toLowerCase() === baseName.toLowerCase() ||
        (b.id as string)?.toLowerCase() === baseName.toLowerCase()
      );
      
      if (base) {
        const views = base.views as Array<Record<string, unknown>>;
        const view = views.find((v) => 
          (v.title as string)?.toLowerCase() === normalizedViewName ||
          (v.id as string)?.toLowerCase() === normalizedViewName
        );
        if (view) {
          return view.id as string;
        }
      }
    }

    // Search in all bases
    for (const base of bases) {
      const views = base.views as Array<Record<string, unknown>>;
      const view = views.find((v) => 
        (v.title as string)?.toLowerCase() === normalizedViewName ||
        (v.id as string)?.toLowerCase() === normalizedViewName
      );
      if (view) {
        return view.id as string;
      }
    }

    throw new Error(`View '${viewName}' not found`);
  }

  /**
   * Execute list bases operation
   */
  private async executeListBases(context: NcContext): Promise<ExecutionResult> {
    try {
      this.logger.log('Executing list bases operation...');
      
      const user = context.user;
      if (!user) {
        throw new Error('User context not available');
      }

      const bases = await this.basesV3Service.baseList(context, {
        user: {
          id: user.id,
          roles: user.roles,
        },
        workspaceId: 'default',
      });

      const formattedBases = bases.map(base => ({
        id: base.id,
        title: base.title,
        description: (base as any).meta?.description || base.title,
      }));

      return {
        success: true,
        data: formattedBases,
        metadata: {
          rowCount: formattedBases.length,
        },
      };
    } catch (error) {
      this.logger.error('Error listing bases:', error);
      return {
        success: false,
        error: `Failed to list bases: ${error.message}`,
      };
    }
  }

  /**
   * Execute list tables operation
   */
  private async executeListTables(context: NcContext, baseId: string): Promise<ExecutionResult> {
    try {
      this.logger.log(`Executing list tables operation for base ${baseId}...`);
      
      const user = context.user;
      if (!user) {
        throw new Error('User context not available');
      }

      // Get the base to access its sources
      const { Base } = await import('~/models');
      const base = await Base.get(context, baseId);
      const sources = await base.getSources();
      
      const tables = [];
      
      for (const source of sources) {
        if (source.isMeta()) continue; // Skip meta sources
        
        const sourceTables = await this.tablesV3Service.getAccessibleTables(context, {
          baseId,
          sourceId: source.id,
          roles: typeof user.roles === 'string' ? {} : (user.roles || {}),
        });

        for (const table of sourceTables) {
          tables.push({
            id: table.id,
            title: table.title,
            type: 'table',
          });
        }
      }

      return {
        success: true,
        data: tables,
        metadata: {
          baseId,
          rowCount: tables.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error listing tables for base ${baseId}:`, error);
      return {
        success: false,
        error: `Failed to list tables: ${error.message}`,
      };
    }
  }

  /**
   * Execute list views operation
   */
  private async executeListViews(context: NcContext, baseId: string): Promise<ExecutionResult> {
    try {
      this.logger.log(`Executing list views operation for base ${baseId}...`);
      
      const user = context.user;
      if (!user) {
        throw new Error('User context not available');
      }

      // Get the base to access its sources
      const { Base } = await import('~/models');
      const base = await Base.get(context, baseId);
      const sources = await base.getSources();
      
      const views = [];
      
      for (const source of sources) {
        if (source.isMeta()) continue; // Skip meta sources
        
        const sourceTables = await this.tablesV3Service.getAccessibleTables(context, {
          baseId,
          sourceId: source.id,
          roles: typeof user.roles === 'string' ? {} : (user.roles || {}),
        });

        for (const table of sourceTables) {
          const tableViews = await this.viewsV3Service.getViews(context, {
            tableId: table.id,
            req: (context as any).req,
          });

          for (const view of tableViews) {
            views.push({
              id: view.id,
              title: view.title,
              type: 'view',
            });
          }
        }
      }

      return {
        success: true,
        data: views,
        metadata: {
          baseId,
          rowCount: views.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error listing views for base ${baseId}:`, error);
      return {
        success: false,
        error: `Failed to list views: ${error.message}`,
      };
    }
  }

  /**
   * Execute fetch rows operation
   */
  private async executeFetchRows(
    context: NcContext,
    baseId: string,
    tableId: string,
    params?: Record<string, unknown>,
  ): Promise<ExecutionResult> {
    try {
      this.logger.log(`Executing fetch rows operation for table ${tableId} in base ${baseId}...`);
      
      const user = context.user;
      if (!user) {
        throw new Error('User context not available');
      }

      // Build query parameters
      const query: Record<string, unknown> = {};
      
      if (params?.where) {
        query.where = params.where;
      }
      
      if (params?.limit) {
        query.limit = params.limit;
      }
      
      if (params?.offset) {
        query.offset = params.offset;
      }
      
      if (params?.sort) {
        query.sort = params.sort;
      }

      // Use DataV3Service to fetch actual data
      const result = await this.dataV3Service.dataList(context, {
        modelId: tableId,
        query,
        req: (context as any).req,
      });

      return {
        success: true,
        data: result.records.map(record => record.fields),
        metadata: {
          baseId,
          tableId,
          rowCount: result.records.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching rows for table ${tableId}:`, error);
      return {
        success: false,
        error: `Failed to fetch rows: ${error.message}`,
      };
    }
  }

  /**
   * Execute fetch view rows operation
   */
  private async executeFetchViewRows(
    context: NcContext,
    baseId: string,
    viewId: string,
    params?: Record<string, unknown>,
  ): Promise<ExecutionResult> {
    try {
      this.logger.log(`Executing fetch view rows operation for view ${viewId} in base ${baseId}...`);
      
      const user = context.user;
      if (!user) {
        throw new Error('User context not available');
      }

      // Build query parameters
      const query: Record<string, unknown> = {};
      
      if (params?.where) {
        query.where = params.where;
      }
      
      if (params?.limit) {
        query.limit = params.limit;
      }
      
      if (params?.offset) {
        query.offset = params.offset;
      }
      
      if (params?.sort) {
        query.sort = params.sort;
      }

      // Use DataV3Service to fetch actual data from view
      const result = await this.dataV3Service.dataList(context, {
        modelId: viewId,
        query,
        req: (context as any).req,
      });

      return {
        success: true,
        data: result.records.map(record => record.fields),
        metadata: {
          baseId,
          viewId,
          rowCount: result.records.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching view rows for view ${viewId}:`, error);
      return {
        success: false,
        error: `Failed to fetch view rows: ${error.message}`,
      };
    }
  }
}
