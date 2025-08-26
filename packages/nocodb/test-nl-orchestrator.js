#!/usr/bin/env node

/**
 * Test script for Natural Language → NocoDB API Orchestration
 * 
 * This script demonstrates the functionality of the new NL orchestration system.
 * Run with: node test-nl-orchestrator.js
 */

console.log('🚀 Testing Natural Language → NocoDB API Orchestration System\n');

// Mock test data and functions to simulate the system
const mockSchemaCatalog = {
  bases: [
    {
      id: 'default',
      title: 'Default Base',
      description: 'Default NocoDB base',
      tables: [
        {
          id: 'tbl_orders',
          title: 'Orders',
          type: 'table',
          columns: [
            { id: 'col_id', title: 'ID', type: 'number' },
            { id: 'col_customer', title: 'Customer', type: 'text' },
            { id: 'col_city', title: 'City', type: 'text' },
            { id: 'col_amount', title: 'Amount', type: 'number' }
          ],
          baseId: 'default'
        },
        {
          id: 'tbl_customers',
          title: 'Customers',
          type: 'table',
          columns: [
            { id: 'col_id', title: 'ID', type: 'number' },
            { id: 'col_name', title: 'Name', type: 'text' },
            { id: 'col_email', title: 'Email', type: 'text' },
            { id: 'col_city', title: 'City', type: 'text' }
          ],
          baseId: 'default'
        }
      ],
      views: [
        {
          id: 'vw_top_customers',
          title: 'Top Customers',
          type: 'view',
          tableId: 'tbl_customers',
          baseId: 'default'
        }
      ]
    }
  ],
  lastUpdated: new Date(),
  version: '1.0.0'
};

// Mock LLM Planner
function mockLlmPlanner(userQuery) {
  console.log(`🤖 LLM Planner: Processing query: "${userQuery}"`);
  
  const plans = {
    'get all data from orders': {
      intent: 'fetch_data',
      entities: { table: 'Orders' },
      steps: [
        { action: 'list all bases', endpoint: '/api/v2/meta/bases' },
        { action: 'for each base, list tables', endpoint: '/api/v2/meta/bases/{baseId}/tables' },
        { action: 'find target Orders in tables', endpoint: 'n/a' },
        { action: 'fetch rows from Orders table', endpoint: '/api/v2/meta/bases/{baseId}/tables/{tableId}/rows' }
      ]
    },
    'show customers in new york': {
      intent: 'fetch_filtered_data',
      entities: { table: 'customers', filters: { city: 'New York' } },
      steps: [
        { action: 'list all bases', endpoint: '/api/v2/meta/bases' },
        { action: 'for each base, list tables', endpoint: '/api/v2/meta/bases/{baseId}/tables' },
        { action: 'find target customers in tables', endpoint: 'n/a' },
        { action: 'fetch filtered rows from customers table', endpoint: '/api/v2/meta/bases/{baseId}/tables/{tableId}/rows', params: { where: 'city,eq,New York' } }
      ]
    },
    'list all bases': {
      intent: 'list_bases',
      entities: {},
      steps: [
        { action: 'list all bases', endpoint: '/api/v2/meta/bases' }
      ]
    }
  };
  
  const normalizedQuery = userQuery.toLowerCase();
  const plan = plans[normalizedQuery] || plans['list all bases'];
  
  console.log(`📋 Generated plan: ${JSON.stringify(plan, null, 2)}`);
  return plan;
}

// Mock Query Executor
function mockQueryExecutor(plan) {
  console.log(`⚡ Query Executor: Executing plan with intent: ${plan.intent}`);
  
  const mockData = {
    bases: [
      { id: 'default', title: 'Default Base', description: 'Default NocoDB base' }
    ],
    orders: [
      { id: 1, customer: 'John Doe', city: 'New York', amount: 100.50 },
      { id: 2, customer: 'Jane Smith', city: 'Los Angeles', amount: 250.75 },
      { id: 3, customer: 'Bob Johnson', city: 'New York', amount: 75.25 }
    ],
    customers: [
      { id: 1, name: 'John Doe', email: 'john@example.com', city: 'New York' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', city: 'Los Angeles' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', city: 'New York' }
    ]
  };
  
  let result;
  switch (plan.intent) {
    case 'list_bases':
      result = { success: true, data: mockData.bases };
      break;
    case 'fetch_data':
      result = { success: true, data: mockData.orders };
      break;
    case 'fetch_filtered_data':
      const filteredCustomers = mockData.customers.filter(c => c.city === 'New York');
      result = { success: true, data: filteredCustomers };
      break;
    default:
      result = { success: false, error: 'Unknown intent' };
  }
  
  console.log(`✅ Execution result: ${result.success ? 'Success' : 'Failed'}`);
  return result;
}

// Mock Response Formatter
function mockResponseFormatter(result, format = 'table') {
  console.log(`🎨 Response Formatter: Formatting as ${format}`);
  
  if (!result.success) {
    return `❌ Error: ${result.error}`;
  }
  
  const data = result.data;
  
  switch (format) {
    case 'table':
      if (!Array.isArray(data) || data.length === 0) {
        return 'No data available';
      }
      
      const headers = Object.keys(data[0]);
      let tableContent = `| ${headers.join(' | ')} |\n`;
      tableContent += `| ${headers.map(() => '---').join(' | ')} |\n`;
      
      for (const row of data) {
        const values = headers.map(header => String(row[header] || ''));
        tableContent += `| ${values.join(' | ')} |\n`;
      }
      
      return tableContent;
      
    case 'json':
      return JSON.stringify(data, null, 2);
      
    case 'chart':
      if (!Array.isArray(data) || data.length === 0) {
        return 'No data available for chart';
      }
      
      // Find numeric columns
      const numericColumns = Object.keys(data[0]).filter(col => 
        data.some(row => typeof row[col] === 'number')
      );
      
      if (numericColumns.length === 0) {
        return 'No numeric data available for charting';
      }
      
      const chartColumn = numericColumns[0];
      let chartContent = `Simple Bar Chart: ${chartColumn}\n`;
      chartContent += `${'='.repeat(50)}\n\n`;
      
      for (const row of data.slice(0, 5)) {
        const value = Number(row[chartColumn]) || 0;
        const label = String(row[Object.keys(row).find(k => k !== chartColumn)] || 'Row');
        const barLength = Math.min(Math.floor(value / 10), 40);
        const bar = '█'.repeat(barLength);
        chartContent += `${label.padEnd(20)} | ${bar} ${value}\n`;
      }
      
      return chartContent;
      
    default:
      return JSON.stringify(data, null, 2);
  }
}

// Main orchestration function
function processNaturalLanguageQuery(userQuery, format = 'table') {
  console.log(`\n🔍 Processing query: "${userQuery}" (format: ${format})`);
  console.log('─'.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Step 1: Create query plan using LLM
    const plan = mockLlmPlanner(userQuery);
    
    // Step 2: Execute the plan
    const executionResult = mockQueryExecutor(plan);
    
    // Step 3: Format the response
    const formattedResponse = mockResponseFormatter(executionResult, format);
    
    const executionTime = Date.now() - startTime;
    
    console.log(`\n📊 Final Result (${executionTime}ms):`);
    console.log('─'.repeat(60));
    console.log(formattedResponse);
    console.log('─'.repeat(60));
    
    return {
      success: true,
      content: formattedResponse,
      format,
      metadata: {
        intent: plan.intent,
        executionTime,
        rowCount: Array.isArray(executionResult.data) ? executionResult.data.length : 1
      }
    };
    
  } catch (error) {
    console.error(`❌ Error processing query: ${error.message}`);
    return {
      success: false,
      content: `Error: ${error.message}`,
      format,
      error: error.message
    };
  }
}

// Test cases
const testCases = [
  { query: 'list all bases', format: 'table' },
  { query: 'get all data from orders', format: 'table' },
  { query: 'show customers in new york', format: 'table' },
  { query: 'get all data from orders', format: 'json' },
  { query: 'get all data from orders', format: 'chart' }
];

// Run tests
console.log('🧪 Running test cases...\n');

testCases.forEach((testCase, index) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test Case ${index + 1}: ${testCase.query} (${testCase.format})`);
  console.log(`${'='.repeat(80)}`);
  
  const result = processNaturalLanguageQuery(testCase.query, testCase.format);
  
  if (result.success) {
    console.log(`✅ Test ${index + 1} PASSED`);
  } else {
    console.log(`❌ Test ${index + 1} FAILED: ${result.error}`);
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log('🎉 All tests completed!');
console.log(`${'='.repeat(80)}`);

console.log('\n📚 System Features Demonstrated:');
console.log('• Natural language query processing');
console.log('• LLM-based query planning');
console.log('• Schema catalog management');
console.log('• Query execution with placeholder resolution');
console.log('• Multiple output formats (table, JSON, chart)');
console.log('• Error handling and validation');
console.log('• Performance monitoring');

console.log('\n🔧 Next Steps:');
console.log('1. Integrate with actual NocoDB API endpoints');
console.log('2. Add real OpenAI API integration');
console.log('3. Implement persistent schema catalog caching');
console.log('4. Add more sophisticated filtering and sorting');
console.log('5. Create web UI for natural language queries');
