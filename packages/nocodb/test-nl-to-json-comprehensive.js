const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test results storage
const testResults = [];

async function testNlToJsonComprehensive() {
  console.log('=== Comprehensive NLtoJSON Testing ===');
  console.log('');

  // Use a valid auth token (you'll need to replace this with a real token)
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJhamF2aWduZXNoNTczQGdtYWlsLmNvbSIsImlkIjoidXNhNm43Nnh6bWFrbTZpNCIsInJvbGVzIjp7Im9yZy1sZXZlbC1jcmVhdG9yIjp0cnVlLCJzdXBlciI6dHJ1ZX0sInRva2VuX3ZlcnNpb24iOiI5MzFhZjMxZWViYWZlNmMxN2Q1MWQ0ZDc3YzNiYTQ5ZmVlYTc0MTBlYjZhOWY2ZmRhNTg1ZmRmZjE5NzZmMzE3MTJjYmI3YzlkODFmNTk3ZiIsImlhdCI6MTc1NTQ5MjU5MiwiZXhwIjoxNzU1NTI4NTkyfQ.N1A7ZFM0xdbBWbhyjoYTZysxN3Kbb3NVxHs4FZhMudU';

  const testCases = [
    // Clear Database Queries
    {
      category: 'Clear Database Queries',
      name: 'List Products',
      message: 'Show me all products from the Ecommerce project',
      expectedBehavior: 'Should detect as database query, convert to JSON, and execute'
    },
    {
      category: 'Clear Database Queries',
      name: 'Find Users',
      message: 'Find all users where status is active in the HRMS project',
      expectedBehavior: 'Should detect as database query, convert to JSON, and execute'
    },
    {
      category: 'Clear Database Queries',
      name: 'Create Record',
      message: 'Create a new product in the Inventory table of Ecommerce project',
      expectedBehavior: 'Should detect as database query, convert to JSON, and execute'
    },

    // Partially Clear Questions
    {
      category: 'Partially Clear Questions',
      name: 'Missing Project',
      message: 'Show me all products',
      expectedBehavior: 'Should ask for project name clarification'
    },
    {
      category: 'Partially Clear Questions',
      name: 'Missing Table',
      message: 'List all records from Ecommerce project',
      expectedBehavior: 'Should ask for table name clarification'
    },
    {
      category: 'Partially Clear Questions',
      name: 'Vague Query',
      message: 'Get data from the database',
      expectedBehavior: 'Should ask for project and table clarification'
    },

    // General Discussion
    {
      category: 'General Discussion',
      name: 'Hello',
      message: 'Hello, how are you?',
      expectedBehavior: 'Should use general AI response'
    },
    {
      category: 'General Discussion',
      name: 'Help Request',
      message: 'Can you help me with NocoDB?',
      expectedBehavior: 'Should use general AI response'
    },
    {
      category: 'General Discussion',
      name: 'Feature Question',
      message: 'What features does NocoDB have?',
      expectedBehavior: 'Should use general AI response'
    },

    // Edge Cases
    {
      category: 'Edge Cases',
      name: 'Mixed Query',
      message: 'Show me products and also tell me about NocoDB features',
      expectedBehavior: 'Should detect as database query (first part)'
    },
    {
      category: 'Edge Cases',
      name: 'Complex Filter',
      message: 'Find users where age > 25 and status is active in HRMS project',
      expectedBehavior: 'Should detect as database query with complex filters'
    },
    {
      category: 'Edge Cases',
      name: 'Update Query',
      message: 'Update the price of product ID 123 to $99.99 in Ecommerce project',
      expectedBehavior: 'Should detect as database update query'
    },

    // Ambiguous Cases
    {
      category: 'Ambiguous Cases',
      name: 'Show Data',
      message: 'Show me the data',
      expectedBehavior: 'Should ask for clarification (which data?)'
    },
    {
      category: 'Ambiguous Cases',
      name: 'Get Records',
      message: 'Get records',
      expectedBehavior: 'Should ask for clarification (which records?)'
    },
    {
      category: 'Ambiguous Cases',
      name: 'Database Help',
      message: 'I need help with my database',
      expectedBehavior: 'Should use general AI response (not specific enough)'
    }
  ];

  console.log(`Running ${testCases.length} test cases...\n`);

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`🧪 Test ${i + 1}/${testCases.length}: ${testCase.category} - ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    
    const result = {
      testNumber: i + 1,
      category: testCase.category,
      testName: testCase.name,
      userText: testCase.message,
      expectedBehavior: testCase.expectedBehavior,
      timestamp: new Date().toISOString(),
      status: 'pending',
      response: null,
      error: null,
      detectedAsDatabaseQuery: null,
      llmResponse: null,
      jsonRequest: null,
      apiCalled: null
    };
    
    try {
      const response = await axios.post('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/chat', {
        message: testCase.message,
        model: 'gpt-4o-mini'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'xc-auth': authToken
        },
        timeout: 15000
      });

      result.status = 'success';
      result.response = response.data;
      console.log('✅ Response received successfully');
      console.log('Status:', response.status);
      
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
      console.log('❌ Error:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', error.response.data);
      }
    }
    
    testResults.push(result);
    console.log('');
  }

  // Generate CSV report
  generateCSVReport();
  
  console.log('=== Test Complete ===');
  console.log('');
  console.log('📊 Results Summary:');
  console.log(`- Total Tests: ${testResults.length}`);
  console.log(`- Successful: ${testResults.filter(r => r.status === 'success').length}`);
  console.log(`- Errors: ${testResults.filter(r => r.status === 'error').length}`);
  console.log('');
  console.log('📄 Check NLJSONtestresults.csv for detailed results');
}

function generateCSVReport() {
  const csvHeader = [
    'Test Number',
    'Category',
    'Test Name',
    'User Text',
    'Expected Behavior',
    'Status',
    'Response',
    'Error',
    'Detected as Database Query',
    'LLM Response',
    'JSON Request',
    'API Called',
    'Timestamp'
  ].join(',');

  const csvRows = testResults.map(result => [
    result.testNumber,
    `"${result.category}"`,
    `"${result.testName}"`,
    `"${result.userText}"`,
    `"${result.expectedBehavior}"`,
    result.status,
    `"${result.response || ''}"`,
    `"${result.error || ''}"`,
    result.detectedAsDatabaseQuery || '',
    `"${result.llmResponse || ''}"`,
    `"${result.jsonRequest || ''}"`,
    `"${result.apiCalled || ''}"`,
    result.timestamp
  ].join(','));

  const csvContent = [csvHeader, ...csvRows].join('\n');
  
  const csvPath = path.join(__dirname, 'NLJSONtestresults.csv');
  fs.writeFileSync(csvPath, csvContent);
  
  console.log(`📄 CSV report generated: ${csvPath}`);
}

// Sample output preview
function showSampleOutput() {
  console.log('=== Sample CSV Output Structure ===');
  console.log('');
  console.log('Test Number,Category,Test Name,User Text,Expected Behavior,Status,Response,Error,Detected as Database Query,LLM Response,JSON Request,API Called,Timestamp');
  console.log('1,Clear Database Queries,List Products,"Show me all products from the Ecommerce project","Should detect as database query, convert to JSON, and execute",success,"{...}",,true,"{...}","{...}","/api/v1/db/data/v1/ecommerce/inventory",2025-08-18T...');
  console.log('2,Partially Clear Questions,Missing Project,"Show me all products","Should ask for project name clarification",success,"{...}",,true,"Can you specify which project?","","",2025-08-18T...');
  console.log('3,General Discussion,Hello,"Hello, how are you?","Should use general AI response",success,"{...}",,false,"","","",2025-08-18T...');
  console.log('');
}

// Show sample output first
showSampleOutput();

// Run the tests
testNlToJsonComprehensive();
