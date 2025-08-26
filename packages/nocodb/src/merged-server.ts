import cors from 'cors';
import express from 'express';
import type { Server as HttpServer } from 'node:http';
import path from 'path';
import Noco from '~/Noco';
import { NcConfig } from '~/utils/nc-config/NcConfig';
import type { DriverClient } from '~/utils/nc-config/interfaces';

// Import product matching service
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

interface ServerConfig {
  nocodb: {
    port: number;
    database: {
      client: string;
      connection: {
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
        filename?: string;
      };
    };
    dashboardPath?: string;
    publicUrl?: string;
  };
  productMatching: {
    port: number;
    database: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    };
  };
}

export class MergedServer {
  private nocodbServer: { server: express.Application; httpServer: HttpServer } | null = null;
  private productMatchingServer: { server: express.Application; httpServer: HttpServer } | null = null;
  private nocodbConfig: NcConfig | null = null;

  constructor(private config: ServerConfig) {}

  async start() {
    console.log('🚀 Starting Merged NocoDB + Product Matching Server...');
    console.log(`📊 NocoDB will run on port ${this.config.nocodb.port}`);
    console.log(`🔍 Product Matching will run on port ${this.config.productMatching.port}`);

    // Start both servers
    await Promise.all([
      this.startNocoDB(),
      this.startProductMatching()
    ]);

    console.log('✅ Both servers started successfully!');
    console.log(`🌐 NocoDB Dashboard: http://localhost:${this.config.nocodb.port}${this.config.nocodb.dashboardPath || '/dashboard'}`);
    console.log(`🔍 Product Matching API: http://localhost:${this.config.productMatching.port}`);
  }

  private async startNocoDB() {
    const { port, database, dashboardPath, publicUrl } = this.config.nocodb;

    const dbName = 'connection' in database && 'database' in database.connection 
      ? database.connection.database 
      : 'connection' in database && 'filename' in database.connection 
        ? database.connection.filename 
        : 'unknown';
    console.log(`🔧 Starting NocoDB on port ${port} with database: ${dbName}`);

    // Create Express server for NocoDB
    const server = express();
    server.enable('trust proxy');
    server.disable('etag');
    server.disable('x-powered-by');
    server.use(
      cors({
        exposedHeaders: 'xc-db-response',
      }),
    );

    server.set('view engine', 'ejs');

    // Create NocoDB configuration
    const ncConfig = await NcConfig.createByEnv();
    ncConfig.port = port;
    ncConfig.meta = {
      db: {
        client: database.client as DriverClient,
        connection: database.connection,
      },
    };
    ncConfig.auth = {
      jwt: {
        secret: `nocodb-${port}-${Date.now()}`,
      },
    };
    ncConfig.toolDir = process.cwd();
    ncConfig.worker = false;
    ncConfig.env = '_noco';
    ncConfig.workingEnv = '_noco';
    ncConfig.baseType = 'rest';
    ncConfig.version = '0258003';

    if (publicUrl) {
      ncConfig.publicUrl = publicUrl;
    }

    if (dashboardPath) {
      ncConfig.dashboardPath = dashboardPath;
    }

    // Set environment variables for dashboard path
    if (dashboardPath) {
      process.env.NC_DASHBOARD_URL = dashboardPath;
    }

    this.nocodbConfig = ncConfig;

    // Create HTTP server
    const httpServer = server.listen(port, async () => {
      console.log(`✅ NocoDB listening on port ${port}`);

      try {
        // Set environment variables for NocoDB
        const originalPort = process.env.PORT;
        const originalDb = process.env.NC_DB;
        const originalDashboardUrl = process.env.NC_DASHBOARD_URL;
        
        process.env.PORT = port.toString();
        
        // Set dashboard path environment variable
        if (dashboardPath) {
          process.env.NC_DASHBOARD_URL = dashboardPath;
        }
        
        // Set database URL for NocoDB
        if (database.client === 'sqlite3') {
          process.env.NC_DB = `sqlite3://${database.connection.filename}`;
        } else if (database.client === 'pg') {
          const conn = database.connection;
          process.env.NC_DB = `pg://${conn.host}:${conn.port}?u=${conn.user}&p=${conn.password}&d=${conn.database}`;
        } else if (database.client === 'mysql2') {
          const conn = database.connection;
          process.env.NC_DB = `mysql2://${conn.host}:${conn.port}?u=${conn.user}&p=${conn.password}&d=${conn.database}`;
        }

        // Initialize NocoDB
        server.use(await Noco.init({}, httpServer, server));
        
        this.nocodbServer = { server, httpServer };

        console.log(`✅ NocoDB initialized successfully`);
        console.log(`🌐 Dashboard available at: http://localhost:${port}${dashboardPath || '/dashboard'}`);

        // Restore original environment variables
        if (originalPort) {
          process.env.PORT = originalPort;
        } else {
          process.env.PORT = undefined;
        }
        
        if (originalDb) {
          process.env.NC_DB = originalDb;
        } else {
          process.env.NC_DB = undefined;
        }
        
        if (originalDashboardUrl) {
          process.env.NC_DASHBOARD_URL = originalDashboardUrl;
        } else {
          process.env.NC_DASHBOARD_URL = undefined;
        }
      } catch (error) {
        console.error(`❌ Failed to initialize NocoDB on port ${port}:`, error);
        httpServer.close();
        throw error;
      }
    });

    httpServer.on('error', (error) => {
      console.error(`❌ NocoDB server error on port ${port}:`, error);
    });
  }

  private async startProductMatching() {
    const { port, database } = this.config.productMatching;

    console.log(`🔍 Starting Product Matching on port ${port} with database: ${database.database}`);

    // Create Express server for Product Matching
    const server = express();
    server.use(cors());
    server.use(express.json());

    // Database connection for Product Matching
    const pool = new Pool(database);

    // Mock NocoDB metadata service for Product Matching
    const mockNcMeta = {
      metaInsert2: async (workspaceId: string, baseId: string, table: string, data: any) => {
        const client = await pool.connect();
        try {
          const columns = Object.keys(data).join(', ');
          const values = Object.values(data);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
          const result = await client.query(query, values);
          return result.rows[0];
        } finally {
          client.release();
        }
      },
      
      metaUpdate: async (workspaceId: string, baseId: string, table: string, data: any, id: string) => {
        const client = await pool.connect();
        try {
          const setClause = Object.keys(data).map((key, i) => `${key} = $${i + 2}`).join(', ');
          const values = [id, ...Object.values(data)];
          
          const query = `UPDATE ${table} SET ${setClause} WHERE id = $1 RETURNING *`;
          const result = await client.query(query, values);
          return result.rows[0];
        } finally {
          client.release();
        }
      },
      
      metaGet2: async (workspaceId: string, baseId: string, table: string, id: string) => {
        const client = await pool.connect();
        try {
          const query = `SELECT * FROM ${table} WHERE id = $1`;
          const result = await client.query(query, [id]);
          return result.rows[0];
        } finally {
          client.release();
        }
      },
      
      metaList2: async (workspaceId: string, baseId: string, table: string, options: any = {}) => {
        const client = await pool.connect();
        let query = `SELECT * FROM ${table}`;
        const values = [];
        let paramCount = 0;
        
        try {
          if (options.condition) {
            const conditions = [];
            for (const [key, value] of Object.entries(options.condition)) {
              paramCount++;
              conditions.push(`${key} = $${paramCount}`);
              values.push(value);
            }
            if (conditions.length > 0) {
              query += ` WHERE ${conditions.join(' AND ')}`;
            }
          }
          
          if (options.orderBy && Object.keys(options.orderBy).length > 0) {
            const orderClauses = [];
            for (const [key, direction] of Object.entries(options.orderBy)) {
              orderClauses.push(`${key} ${String(direction).toUpperCase()}`);
            }
            query += ` ORDER BY ${orderClauses.join(', ')}`;
          }
          
          if (options.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(options.limit);
          }
          
          if (options.offset) {
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            values.push(options.offset);
          }
          
          const result = await client.query(query, values);
          return result.rows;
        } finally {
          client.release();
        }
      }
    };

    // Create a simple mock product matching service
    const productMatchingService = {
      getProducts: async (context: any, filters: any, limit: number, offset: number) => {
        return {
          products: [],
          total: 0,
          limit,
          offset
        };
      },
      
      getProduct: async (context: any, productId: string) => {
        return null; // Product not found
      },
      
      getExternalCandidates: async (context: any, localProduct: any, filter: any) => {
        return {
          candidates: [],
          total: 0,
          filter
        };
      },
      
      confirmMatch: async (context: any, matchData: any, userId: string) => {
        return {
          id: 'mock-match-id',
          ...matchData,
          userId,
          createdAt: new Date().toISOString()
        };
      },
      
      getMatches: async (context: any, filters: any, limit: number, offset: number) => {
        return {
          matches: [],
          total: 0,
          limit,
          offset
        };
      },
      
      deleteMatch: async (context: any, matchId: string) => {
        return true; // Successfully deleted
      }
    };

    // Health check endpoint
    server.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'product-matching',
        timestamp: new Date().toISOString(),
        port: port
      });
    });

    // Info endpoint
    server.get('/info', (req, res) => {
      res.json({
        service: 'Product Matching API',
        version: '1.0.0',
        description: 'Product matching service for NocoDB',
        endpoints: [
          'GET /health',
          'GET /info',
          'GET /products',
          'GET /products/:productId/candidates',
          'POST /matches',
          'GET /matches',
          'DELETE /matches/:matchId'
        ]
      });
    });

    // Products endpoint
    server.get('/products', async (req, res) => {
      try {
        const context = {
          workspace_id: req.headers['x-tenant-id'] || 'default',
          base_id: req.headers['x-base-id'] || 'default'
        };
        
        const filters = {
          brand: req.query.brand,
          categoryId: req.query.categoryId,
          status: req.query.status
        };
        
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        const result = await productMatchingService.getProducts(context, filters, limit, offset);
        res.json(result);
      } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Get candidates endpoint
    server.get('/products/:productId/candidates', async (req, res) => {
      try {
        const context = {
          workspace_id: req.headers['x-tenant-id'] || 'default',
          base_id: req.headers['x-base-id'] || 'default'
        };
        
        const productId = req.params.productId;
        const localProduct = await productMatchingService.getProduct(context, productId);
        
        if (!localProduct) {
          return res.status(404).json({ error: 'Product not found' });
        }
        
        const filter = {
          sources: req.query.sources ? (Array.isArray(req.query.sources) ? req.query.sources : [req.query.sources as string]) : undefined,
          brand: req.query.brand as string,
          categoryId: req.query.categoryId as string,
          priceBandPct: parseFloat(req.query.priceBandPct as string) || 15,
          ruleId: req.query.ruleId as string,
          limit: parseInt(req.query.limit as string) || 25
        };
        
        const result = await productMatchingService.getExternalCandidates(context, localProduct, filter);
        res.json(result);
      } catch (error) {
        console.error('Error getting candidates:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Confirm match endpoint
    server.post('/matches', async (req, res) => {
      try {
        const context = {
          workspace_id: req.headers['x-tenant-id'] || 'default',
          base_id: req.headers['x-base-id'] || 'default'
        };
        
        const userId = Array.isArray(req.headers['x-user-id']) ? req.headers['x-user-id'][0] : req.headers['x-user-id'] || 'test-user';
        const matchData = req.body;
        
        const result = await productMatchingService.confirmMatch(context, matchData, userId);
        res.json(result);
      } catch (error) {
        console.error('Error confirming match:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Get matches endpoint
    server.get('/matches', async (req, res) => {
      try {
        const context = {
          workspace_id: req.headers['x-tenant-id'] || 'default',
          base_id: req.headers['x-base-id'] || 'default'
        };
        
        const filters = {
          localProductId: req.query.localProductId as string,
          externalProductKey: req.query.externalProductKey as string,
          source: req.query.source as string,
          reviewedBy: req.query.reviewedBy as string,
          status: req.query.status as string
        };
        
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        
        const result = await productMatchingService.getMatches(context, filters, limit, offset);
        res.json(result);
      } catch (error) {
        console.error('Error getting matches:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Delete match endpoint
    server.delete('/matches/:matchId', async (req, res) => {
      try {
        const context = {
          workspace_id: req.headers['x-tenant-id'] || 'default',
          base_id: req.headers['x-base-id'] || 'default'
        };
        
        const matchId = req.params.matchId;
        await productMatchingService.deleteMatch(context, matchId);
        res.status(204).send();
      } catch (error) {
        console.error('Error deleting match:', error);
        res.status(500).json({ error: (error as Error).message });
      }
    });

    // Create HTTP server
    const httpServer = server.listen(port, () => {
      console.log(`✅ Product Matching API listening on port ${port}`);
      this.productMatchingServer = { server, httpServer };
    });

    httpServer.on('error', (error) => {
      console.error(`❌ Product Matching server error on port ${port}:`, error);
    });
  }

  async stop() {
    console.log('🛑 Stopping merged server...');
    
    if (this.nocodbServer) {
      console.log('🛑 Stopping NocoDB server...');
      this.nocodbServer.httpServer.close();
    }
    
    if (this.productMatchingServer) {
      console.log('🛑 Stopping Product Matching server...');
      this.productMatchingServer.httpServer.close();
    }
    
    this.nocodbServer = null;
    this.productMatchingServer = null;
    this.nocodbConfig = null;
    
    console.log('✅ All servers stopped');
  }

  getNocoDBServer() {
    return this.nocodbServer;
  }

  getProductMatchingServer() {
    return this.productMatchingServer;
  }
}

// Default configuration
export const defaultConfig: ServerConfig = {
  nocodb: {
    port: 8080,
    database: {
      client: 'pg',
      connection: {
        host: 'localhost',
        port: 5432,
        user: 'postgres',
        password: 'password',
        database: 'nocodb',
      },
    },
    dashboardPath: '/dashboard',
    publicUrl: 'http://localhost:8080',
  },
  productMatching: {
    port: 3001,
    database: {
      host: 'localhost',
      port: 5432,
      database: 'product_matching',
      user: 'postgres',
      password: 'password',
    },
  },
};

// Helper function to load configuration from environment variables
export function loadConfigFromEnv(): ServerConfig {
  const config = { ...defaultConfig };

  // NocoDB configuration
  if (process.env.NOCODB_PORT) {
    config.nocodb.port = parseInt(process.env.NOCODB_PORT, 10);
  }

  if (process.env.NOCODB_DB_TYPE === 'postgres') {
    config.nocodb.database = {
      client: 'pg',
      connection: {
        host: process.env.NOCODB_DB_HOST || 'localhost',
        port: parseInt(process.env.NOCODB_DB_PORT || '5432', 10),
        user: process.env.NOCODB_DB_USER || 'postgres',
        password: process.env.NOCODB_DB_PASSWORD || 'password',
        database: process.env.NOCODB_DB_NAME || 'nocodb',
      },
    };
  } else if (process.env.NOCODB_DB_TYPE === 'mysql') {
    config.nocodb.database = {
      client: 'mysql2',
      connection: {
        host: process.env.NOCODB_DB_HOST || 'localhost',
        port: parseInt(process.env.NOCODB_DB_PORT || '3306', 10),
        user: process.env.NOCODB_DB_USER || 'root',
        password: process.env.NOCODB_DB_PASSWORD || 'password',
        database: process.env.NOCODB_DB_NAME || 'nocodb',
      },
    };
  } else {
    // Default to SQLite
    config.nocodb.database = {
      client: 'sqlite3',
      connection: {
        filename: process.env.NOCODB_DB_FILE || './nocodb.db',
      },
    };
  }

  // Product Matching configuration
  if (process.env.PM_PORT) {
    config.productMatching.port = parseInt(process.env.PM_PORT, 10);
  }

  if (process.env.PM_DB_HOST) {
    config.productMatching.database.host = process.env.PM_DB_HOST;
  }

  if (process.env.PM_DB_PORT) {
    config.productMatching.database.port = parseInt(process.env.PM_DB_PORT, 10);
  }

  if (process.env.PM_DB_NAME) {
    config.productMatching.database.database = process.env.PM_DB_NAME;
  }

  if (process.env.PM_DB_USER) {
    config.productMatching.database.user = process.env.PM_DB_USER;
  }

  if (process.env.PM_DB_PASSWORD) {
    config.productMatching.database.password = process.env.PM_DB_PASSWORD;
  }

  return config;
}

// Main function to start the merged server
export async function startMergedServer() {
  const config = loadConfigFromEnv();
  const mergedServer = new MergedServer(config);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await mergedServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await mergedServer.stop();
    process.exit(0);
  });

  try {
    await mergedServer.start();
  } catch (error) {
    console.error('❌ Failed to start merged server:', error);
    process.exit(1);
  }
}

// Export types
export type { ServerConfig };
