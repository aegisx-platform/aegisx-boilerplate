const WebSocket = require('ws');

async function testNotificationSystem() {
  const { default: fetch } = await import('node-fetch');
  
  console.log('🔄 Testing Complete Notification System...\n');
  
  // 1. Connect to WebSocket
  const ws = new WebSocket('ws://localhost:3000');
  
  ws.on('open', function() {
    console.log('✅ WebSocket connected');
    
    // Subscribe to notifications channel
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'system:notifications'
    }));
    
    console.log('📡 Subscribed to system:notifications channel\n');
  });

  ws.on('message', function(data) {
    const message = JSON.parse(data);
    console.log('📨 Real-time notification received:', message);
  });

  // Wait for WebSocket connection
  await new Promise(resolve => {
    ws.on('open', resolve);
  });

  // 2. Test Create Notification
  console.log('🔍 Testing notification creation...');
  
  try {
    const createResponse = await fetch('http://localhost:3000/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'welcome',
        channel: 'email',
        recipient: {
          id: 'user-123',
          email: 'test@example.com'
        },
        content: {
          text: 'Welcome to our system! Your account has been created successfully.',
          html: '<h1>Welcome!</h1><p>Your account has been created successfully.</p>'
        },
        priority: 'normal',
        metadata: {
          source: 'api-test',
          userId: 'user-123',
          campaign: 'welcome-series'
        },
        tags: ['welcome', 'onboarding', 'test']
      })
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Notification created:', result);
      
      const notificationId = result.data.notificationId;
      
      // 3. Test Get Notification
      console.log('\n🔍 Testing get notification...');
      const getResponse = await fetch(`http://localhost:3000/api/v1/notifications/${notificationId}`);
      
      if (getResponse.ok) {
        const notification = await getResponse.json();
        console.log('✅ Retrieved notification:', notification);
      } else {
        console.log('❌ Failed to get notification');
      }
      
      // 4. Test List Notifications
      console.log('\n🔍 Testing list notifications...');
      const listResponse = await fetch('http://localhost:3000/api/v1/notifications?limit=5&status=queued');
      
      if (listResponse.ok) {
        const notifications = await listResponse.json();
        console.log('✅ Listed notifications:', notifications);
      } else {
        console.log('❌ Failed to list notifications');
      }
      
      // 5. Test Update Status
      console.log('\n🔍 Testing update notification status...');
      const updateResponse = await fetch(`http://localhost:3000/api/v1/notifications/${notificationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'sent',
          metadata: {
            sentAt: new Date().toISOString(),
            provider: 'test-provider'
          }
        })
      });
      
      if (updateResponse.ok) {
        const updateResult = await updateResponse.json();
        console.log('✅ Status updated:', updateResult);
      } else {
        console.log('❌ Failed to update status');
      }
      
    } else {
      const error = await createResponse.json();
      console.log('❌ Failed to create notification:', error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // 6. Test Healthcare Notification
  console.log('\n🔍 Testing healthcare notification...');
  
  try {
    const healthcareResponse = await fetch('http://localhost:3000/api/v1/notifications/healthcare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'appointment-reminder',
        channel: 'email',
        recipient: {
          id: 'patient-456',
          email: 'patient@example.com'
        },
        content: {
          text: 'Appointment reminder: You have an appointment tomorrow at 2 PM.',
          template: 'appointment-reminder'
        },
        healthcare: {
          patientId: 'patient-456',
          providerId: 'doctor-789',
          appointmentId: 'appt-123',
          facilityId: 'facility-001',
          department: 'Cardiology',
          urgency: 'medium',
          hipaaCompliant: true
        },
        priority: 'high',
        tags: ['appointment', 'reminder', 'healthcare']
      })
    });
    
    if (healthcareResponse.ok) {
      const result = await healthcareResponse.json();
      console.log('✅ Healthcare notification created:', result);
    } else {
      const error = await healthcareResponse.json();
      console.log('❌ Failed to create healthcare notification:', error);
    }
  } catch (error) {
    console.error('❌ Healthcare test failed:', error.message);
  }
  
  // Wait for any remaining WebSocket messages
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  ws.close();
  console.log('\n🔚 Test completed successfully!');
}

testNotificationSystem().catch(console.error);