const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/products',
  method: 'GET',
  headers: {
    'x-tenant-id': 'default',
    'x-base-id': 'default'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const jsonData = JSON.parse(data);
      console.log(`Products found: ${jsonData.items.length}`);
      if (jsonData.items.length > 0) {
        console.log('First product:', jsonData.items[0]);
      }
    } catch (e) {
      console.log('Could not parse JSON response');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
