const { ProductMatchingService } = require('./dist/services/ProductMatchingService');

// Mock NocoDB metadata service
const mockNcMeta = {
  metaInsert2: async (workspaceId, baseId, table, data) => {
    console.log(`Inserting into ${table}:`, data);
    return { id: 'mock-id-' + Date.now() };
  },
  metaUpdate: async (workspaceId, baseId, table, data, id) => {
    console.log(`Updating ${table} with id ${id}:`, data);
  },
  metaGet2: async (workspaceId, baseId, table, id) => {
    console.log(`Getting from ${table} with id ${id}`);
    return { id, name: 'Mock Product', brand: 'Mock Brand' };
  },
  metaList2: async (workspaceId, baseId, table, options) => {
    console.log(`Listing from ${table} with options:`, options);
    return [
      { id: 'source-1', name: 'Amazon', code: 'AMZ' },
      { id: 'source-2', name: 'Target', code: 'TGT' }
    ];
  },
  metaDelete: async (workspaceId, baseId, table, id) => {
    console.log(`Deleting from ${table} with id ${id}`);
  }
};

async function testProductMatching() {
  console.log('🚀 Testing nc-product-matching package...\n');

  // Create service instance
  const service = new ProductMatchingService(mockNcMeta);
  console.log('✅ Service created successfully\n');

  // Test context
  const mockContext = {
    workspace_id: 'test-workspace',
    base_id: 'test-base'
  };

  // Test 1: Get Products
  console.log('📦 Test 1: Getting products...');
  try {
    const products = await service.getProducts(mockContext, {
      q: 'test product',
      limit: 10
    });
    console.log('✅ Products result:', products);
  } catch (error) {
    console.log('❌ Error getting products:', error.message);
  }
  console.log('');

  // Test 2: Get Product by ID
  console.log('🔍 Test 2: Getting product by ID...');
  try {
    const product = await service.getProductById(mockContext, 'test-product-id');
    console.log('✅ Product result:', product);
  } catch (error) {
    console.log('❌ Error getting product:', error.message);
  }
  console.log('');

  // Test 3: Get External Candidates
  console.log('🎯 Test 3: Getting external candidates...');
  try {
    const localProduct = {
      id: 'test-product',
      title: 'Test Product',
      brand: 'Test Brand',
      price: 100
    };

    const candidates = await service.getExternalCandidates(mockContext, localProduct, {
      sources: ['AMZ'],
      limit: 5
    });
    console.log('✅ Candidates result:', candidates);
  } catch (error) {
    console.log('❌ Error getting candidates:', error.message);
  }
  console.log('');

  // Test 4: Confirm Match
  console.log('✅ Test 4: Confirming match...');
  try {
    const matchResult = await service.confirmMatch(mockContext, {
      local_product_id: 'local-1',
      external_product_key: 'external-1',
      source_code: 'AMZ',
      score: 0.95,
      price_delta_pct: -5.2,
      rule_id: 'rule-1',
      status: 'confirmed',
      notes: 'Test match'
    }, 'user-1');
    console.log('✅ Match result:', matchResult);
  } catch (error) {
    console.log('❌ Error confirming match:', error.message);
  }
  console.log('');

  // Test 5: Get Matches
  console.log('📋 Test 5: Getting matches...');
  try {
    const matches = await service.getMatches(mockContext, {
      status: 'confirmed',
      limit: 10
    });
    console.log('✅ Matches result:', matches);
  } catch (error) {
    console.log('❌ Error getting matches:', error.message);
  }
  console.log('');

  console.log('🎉 Integration test completed!');
}

// Run the test
testProductMatching().catch(console.error);
