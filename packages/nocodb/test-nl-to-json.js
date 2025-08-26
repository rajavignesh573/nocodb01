const axios = require('axios');

async function testNlToJson() {
  console.log('=== Testing NLtoJSON Implementation ===');
  console.log('');

  const testCases = [
    {
      name: 'Database Query - List Products',
      message: 'Show me all products from the Ecommerce project',
      expected: 'Should detect as database query and use NLtoJSON'
    },
    {
      name: 'General Chat - Hello',
      message: 'Hello, how are you?',
      expected: 'Should use general AI response'
    },
    {
      name: 'Database Query - Find Records',
      message: 'Find all users where status is active',
      expected: 'Should detect as database query and use NLtoJSON'
    },
    {
      name: 'General Chat - Help',
      message: 'Can you help me with NocoDB?',
      expected: 'Should use general AI response'
    }
  ];

  for (const testCase of testCases) {
    console.log(`🧪 Testing: ${testCase.name}`);
    console.log(`Message: "${testCase.message}"`);
    console.log(`Expected: ${testCase.expected}`);
    
    try {
      const response = await axios.post('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/chat', {
        message: testCase.message,
        model: 'gpt-4o-mini'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'xc-auth': 'test-auth-header'
        },
        timeout: 10000
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
  console.log('- "AI Service: Detected database query, using NLtoJSON" or "AI Service: Using general AI response"');
  console.log('- "NLtoJSON: Converting NL to JSON:" (for database queries)');
  console.log('- "NLtoJSON: LLM Response:" (for database queries)');
  console.log('- "NLtoJSON: Parsed JSON Request:" (for database queries)');
}

testNlToJson();
