const WebSocket = require('ws');

async function testEventBusIntegration() {
  const { default: fetch } = await import('node-fetch');
  // Connect to WebSocket first
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
    console.log('📨 Received real-time notification:', parsed);
  });

  // Wait for WebSocket connection
  await new Promise(resolve => {
    ws.on('open', resolve);
  });

  // Test creating a notification via API
  console.log('\n🔄 Testing notification creation...');
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'welcome',
        channel: 'email',
        recipient: {
          id: 'test-user-123',
          email: 'test@example.com'
        },
        content: {
          text: 'Welcome to our system!',
          template: 'welcome-email',
          templateData: {
            name: 'Test User',
            email: 'test@example.com'
          }
        },
        priority: 'normal',
        tags: ['welcome', 'test'],
        metadata: {
          source: 'api-test',
          userId: 'test-user-123'
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Notification created successfully:', result);
    } else {
      const error = await response.json();
      console.error('❌ Failed to create notification:', error);
    }
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }

  // Wait a bit to see WebSocket messages
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  ws.close();
  console.log('\n🔚 Event Bus integration test completed');
}

// Run the test
testEventBusIntegration().catch(console.error);