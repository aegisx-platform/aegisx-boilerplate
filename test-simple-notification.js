const WebSocket = require('ws');

async function testSimpleNotification() {
  const { default: fetch } = await import('node-fetch');
  
  console.log('🔄 Testing simple notification creation...');
  
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
          email: 'test@example.com'
        },
        content: {
          text: 'Welcome to our system!'
        }
      })
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', result);
    
    if (response.ok) {
      console.log('✅ Notification created successfully');
    } else {
      console.error('❌ Failed to create notification');
    }
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

testSimpleNotification().catch(console.error);