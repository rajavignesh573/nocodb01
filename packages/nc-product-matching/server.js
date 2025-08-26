const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool(config.database);

// Mock NocoDB metadata service
const mockNcMeta = {
  metaInsert2: async (workspaceId, baseId, table, data) => {
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
  
  metaUpdate: async (workspaceId, baseId, table, data, id) => {
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
  
  metaGet2: async (workspaceId, baseId, table, id) => {
    const client = await pool.connect();
    try {
      const query = `SELECT * FROM ${table} WHERE id = $1`;
      const result = await client.query(query, [id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  },
  
  metaList2: async (workspaceId, baseId, table, options = {}) => {
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
          orderClauses.push(`${key} ${direction.toUpperCase()}`);
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
      
      console.log('Generated SQL Query:', query);
      console.log('Query Values:', values);
      
      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('SQL Error:', error);
      console.error('Query:', query);
      console.error('Values:', values);
      throw error;
    } finally {
      client.release();
    }
  },
  
  metaDelete: async (workspaceId, baseId, table, id) => {
    const client = await pool.connect();
    try {
      const query = `DELETE FROM ${table} WHERE id = $1`;
      await client.query(query, [id]);
    } finally {
      client.release();
    }
  }
};

// Import the ProductMatchingService
const { ProductMatchingService } = require('./dist/services/ProductMatchingService');

// Create service instance
const productMatchingService = new ProductMatchingService(mockNcMeta);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    time: new Date().toISOString(),
    service: 'nc-product-matching'
  });
});

// Get info endpoint
app.get('/info', (req, res) => {
  res.json({
    tenant_id: req.headers['x-tenant-id'] || 'default',
    sources: ['AMZ', 'TGT', 'WMT'],
    rules: ['rule-default-001', 'rule-strict-001']
  });
});

// Get products endpoint
app.get('/products', async (req, res) => {
  try {
    console.log('🔍 GET /products called');
    const context = {
      workspace_id: req.headers['x-tenant-id'] || 'default',
      base_id: req.headers['x-base-id'] || 'default'
    };
    
    console.log('📋 Context:', context);
    
    const filter = {
      q: req.query.q,
      categoryId: req.query.categoryId,
      brand: req.query.brand,
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'title',
      sortDir: req.query.sortDir || 'asc'
    };
    
    console.log('🔍 Filter:', filter);
    console.log('🔧 Calling productMatchingService.getProducts...');
    
    const result = await productMatchingService.getProducts(context, filter);
    console.log('✅ Result:', result);
    res.json(result);
  } catch (error) {
    console.error('❌ Error getting products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get candidates endpoint
app.get('/products/:productId/candidates', async (req, res) => {
  try {
    const context = {
      workspace_id: req.headers['x-tenant-id'] || 'default',
      base_id: req.headers['x-base-id'] || 'default'
    };
    
    const productId = req.params.productId;
    const localProduct = await productMatchingService.getProductById(context, productId);
    
    if (!localProduct) {
      // Create a mock product for testing
      const mockProduct = {
        id: productId,
        title: `Product ${productId}`,
        brand: 'Test Brand',
        price: 100,
        category_id: 'test-category'
      };
      
      const filter = {
        sources: req.query.sources ? req.query.sources.split(',') : undefined,
        brand: req.query.brand,
        categoryId: req.query.categoryId,
        priceBandPct: parseFloat(req.query.priceBandPct) || 15,
        ruleId: req.query.ruleId,
        limit: parseInt(req.query.limit) || 25
      };
      
      const result = await productMatchingService.getExternalCandidates(context, mockProduct, filter);
      res.json(result);
    } else {
      const filter = {
        sources: req.query.sources ? req.query.sources.split(',') : undefined,
        brand: req.query.brand,
        categoryId: req.query.categoryId,
        priceBandPct: parseFloat(req.query.priceBandPct) || 15,
        ruleId: req.query.ruleId,
        limit: parseInt(req.query.limit) || 25
      };
      
      const result = await productMatchingService.getExternalCandidates(context, localProduct, filter);
      res.json(result);
    }
  } catch (error) {
    console.error('Error getting candidates:', error);
    res.status(500).json({ error: error.message });
  }
});

// Confirm match endpoint
app.post('/matches', async (req, res) => {
  try {
    const context = {
      workspace_id: req.headers['x-tenant-id'] || 'default',
      base_id: req.headers['x-base-id'] || 'default'
    };
    
    const userId = req.headers['x-user-id'] || 'test-user';
    const matchData = req.body;
    
    const result = await productMatchingService.confirmMatch(context, matchData, userId);
    res.json(result);
  } catch (error) {
    console.error('Error confirming match:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get matches endpoint
app.get('/matches', async (req, res) => {
  try {
    const context = {
      workspace_id: req.headers['x-tenant-id'] || 'default',
      base_id: req.headers['x-base-id'] || 'default'
    };
    
    const filters = {
      localProductId: req.query.localProductId,
      externalProductKey: req.query.externalProductKey,
      source: req.query.source,
      reviewedBy: req.query.reviewedBy,
      status: req.query.status
    };
    
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    
    const result = await productMatchingService.getMatches(context, filters, limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Error getting matches:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete match endpoint
app.delete('/matches/:matchId', async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Product Matching API Server running on port ${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   GET  /health`);
  console.log(`   GET  /info`);
  console.log(`   GET  /products`);
  console.log(`   GET  /products/:productId/candidates`);
  console.log(`   POST /matches`);
  console.log(`   GET  /matches`);
  console.log(`   DELETE /matches/:matchId`);
  console.log(`\n🔧 Test with Postman using base URL: http://localhost:${PORT}`);
});
