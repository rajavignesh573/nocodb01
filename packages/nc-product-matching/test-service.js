const { ProductMatchingService } = require('./dist/services/ProductMatchingService');
const { Pool } = require('pg');
const config = require('./config');

// Create mock NcMeta
const pool = new Pool(config.database);

const mockNcMeta = {
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
      
      console.log('🔍 Generated SQL Query:', query);
      console.log('🔍 Query Values:', values);
      
      const result = await client.query(query, values);
      console.log(`✅ Found ${result.rows.length} rows`);
      return result.rows;
    } catch (error) {
      console.error('❌ SQL Error:', error);
      throw error;
    } finally {
      client.release();
    }
  }
};

async function testService() {
  try {
    console.log('🧪 Testing ProductMatchingService...');
    
    const service = new ProductMatchingService(mockNcMeta);
    
    const context = {
      workspace_id: 'default',
      base_id: 'default'
    };
    
    const filter = {
      limit: 5,
      offset: 0
    };
    
    console.log('🔧 Calling getProducts...');
    const result = await service.getProducts(context, filter);
    console.log('✅ Result:', result);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testService();
