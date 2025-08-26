const axios = require('axios');

async function testListBases() {
  console.log('=== Testing "List All Bases" Functionality ===');
  console.log('');

  // Use a valid auth token
  const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InJhamF2aWduZXNoNTczQGdtYWlsLmNvbSIsImlkIjoidXNhNm43Nnh6bWFrbTZpNCIsInJvbGVzIjp7Im9yZy1sZXZlbC1jcmVhdG9yIjp0cnVlLCJzdXBlciI6dHJ1ZX0sInRva2VuX3ZlcnNpb24iOiI5MzFhZjMxZWViYWZlNmMxN2Q1MWQ0ZDc3YzNiYTQ5ZmVlYTc0MTBlYjZhOWY2ZmRhNTg1ZmRmZjE5NzZmMzE3MTJjYmI3YzlkODFmNTk3ZiIsImlhdCI6MTc1NTQ5MjU5MiwiZXhwIjoxNzU1NTI4NTkyfQ.N1A7ZFM0xdbBWbhyjoYTZysxN3Kbb3NVxHs4FZhMudU';

  const testQueries = [
    {
      name: 'List All Bases',
      message: 'list all bases',
      expected: 'Should generate JSON with table_id: "bases", operation: "list"'
    },
    {
      name: 'Show Bases',
      message: 'show me all bases',
      expected: 'Should generate JSON with table_id: "bases", operation: "list"'
    },
    {
      name: 'Get Bases',
      message: 'get all bases',
      expected: 'Should generate JSON with table_id: "bases", operation: "list"'
    }
  ];

  for (const test of testQueries) {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`Message: "${test.message}"`);
    console.log(`Expected: ${test.expected}`);
    
    try {
      const response = await axios.post('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/chat', {
        message: test.message,
        model: 'gpt-4o-mini'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'xc-auth': authToken
        },
        timeout: 15000
      });

      console.log('✅ Response received successfully');
      console.log('Status:', response.status);
      console.log('');
      
    } catch (error) {
      console.log('❌ Error:', error.message);
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Data:', error.response.data);
      }
      console.log('');
    }
  }

  console.log('=== Test Complete ===');
  console.log('');
  console.log('Check the server logs to see:');
  console.log('- "AI Service: Processing message:"');
  console.log('- "AI Service: Detected database query, using NLtoJSON"');
  console.log('- "NLtoJSON: Converting NL to JSON:"');
  console.log('- "NLtoJSON: LLM Response:" (should contain JSON)');
  console.log('- "NLtoJSON: Parsed JSON Request:" (should show table_id: "bases")');
  console.log('- "NLtoJSON: Executing request:"');
  console.log('- "NLtoJSON: Calling bases API to list all bases"');
}

testListBases();
