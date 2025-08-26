const axios = require('axios');

async function testAiHealth() {
  console.log('=== Testing AI Health Endpoint ===');
  console.log('');

  try {
    const response = await axios.get('http://localhost:8080/api/v1/db/data/v1/noco/default/ai/health', {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('✅ Health Check Response:');
    console.log('- Status:', response.status);
    console.log('- Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Health Check Failed:');
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

testAiHealth();
