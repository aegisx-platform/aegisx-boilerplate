const WebSocket = require('ws');

// Test WebSocket connection
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', function open() {
  console.log('✅ WebSocket connected');
  
  // Subscribe to notifications channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'system:notifications'
  }));
  
  console.log('📡 Subscribed to system:notifications channel');
});

ws.on('message', function message(data) {
  const parsed = JSON.parse(data);
  console.log('📨 Received message:', parsed);
});

ws.on('close', function close() {
  console.log('❌ WebSocket disconnected');
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

// Keep the script running
console.log('🔄 Connecting to WebSocket...');
setTimeout(() => {
  ws.close();
  console.log('🔚 Test completed');
  process.exit(0);
}, 5000);