const axios = require('axios');

async function testChatEndpoint() {
  console.log('=== Testing Chat Endpoint ===');
  console.log('');

  try {
    // Test the chat endpoint
    const response = await axios.post('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/chat', {
      message: 'Hello, can you help me?',
      model: 'gpt-4o-mini'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'xc-auth': 'test-auth-header' // This might need to be a valid auth token
      },
      timeout: 10000,
      responseType: 'stream'
    });

    console.log('✅ Chat Endpoint Response:');
    console.log('- Status:', response.status);
    console.log('- Headers:', response.headers);
    
    // Process the stream
    let data = '';
    response.data.on('data', (chunk) => {
      data += chunk.toString();
      console.log('Chunk received:', chunk.toString());
    });
    
    response.data.on('end', () => {
      console.log('Full response:', data);
    });
    
  } catch (error) {
    console.log('❌ Chat Endpoint Failed:');
    if (error.response) {
      console.log('- Status:', error.response.status);
      console.log('- Data:', error.response.data);
    } else {
      console.log('- Error:', error.message);
    }
  }

  console.log('');
  console.log('=== Test Complete ===');
}

testChatEndpoint();
