const axios = require('axios');

async function testBaseApi() {
  console.log('=== Testing Base NocoDB API ===');
  console.log('');

  try {
    // Test the version endpoint
    const response = await axios.get('http://localhost:8080/api/v1/version', {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('✅ Version Endpoint Response:');
    console.log('- Status:', response.status);
    console.log('- Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Version Endpoint Failed:');
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

testBaseApi();
