const { v4: uuidv4 } = require('uuid');

console.log('=== Testing Conversation ID Generation ===');
console.log('');

// Test UUID generation
const testId = uuidv4();
console.log('Generated UUID:', testId);
console.log('UUID length:', testId.length);
console.log('UUID format valid:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testId));

console.log('');
console.log('=== Test Complete ===');
