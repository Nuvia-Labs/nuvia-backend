const request = require('supertest');
const app = require('../src/server');

// Test data
const testUser = {
  email: 'test@example.com',
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
};

console.log('Starting API tests...\n');

// Test 1: Health check
console.log('Test 1: Health Check');
fetch('http://localhost:3000/health')
  .then(res => res.json())
  .then(data => console.log('✓ Health check passed:', data))
  .catch(err => console.error('✗ Health check failed:', err.message));

// Test 2: Join waitlist
console.log('\nTest 2: Join Waitlist');
fetch('http://localhost:3000/api/waitlist/join', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testUser)
})
  .then(res => res.json())
  .then(data => {
    console.log('✓ Join waitlist response:', data);
    return data.data.referralCode;
  })
  .catch(err => console.error('✗ Join waitlist failed:', err.message));

// Test 3: Get position
setTimeout(() => {
  console.log('\nTest 3: Get Position');
  fetch(`http://localhost:3000/api/waitlist/position/${testUser.email}`)
    .then(res => res.json())
    .then(data => console.log('✓ Get position response:', data))
    .catch(err => console.error('✗ Get position failed:', err.message));
}, 1000);

// Test 4: Get stats
setTimeout(() => {
  console.log('\nTest 4: Get Statistics');
  fetch('http://localhost:3000/api/waitlist/stats')
    .then(res => res.json())
    .then(data => console.log('✓ Get stats response:', data))
    .catch(err => console.error('✗ Get stats failed:', err.message));
}, 2000);

// Test 5: Duplicate email (should fail)
setTimeout(() => {
  console.log('\nTest 5: Duplicate Email (should fail)');
  fetch('http://localhost:3000/api/waitlist/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testUser)
  })
    .then(res => res.json())
    .then(data => console.log('✓ Duplicate check working:', data))
    .catch(err => console.error('✗ Duplicate check failed:', err.message));
}, 3000);
