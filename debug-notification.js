async function debugNotification() {
  const { default: fetch } = await import('node-fetch');

  console.log('🔍 Debugging notification creation...');

  try {
    const response = await fetch('http://localhost:3000/api/v1/notifications', {
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

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('📋 Response Body:', result);

    if (response.ok) {
      console.log('✅ Notification created successfully');

      // Try to get the notification
      if (result.data && result.data.notificationId) {
        console.log('\n🔍 Fetching created notification...');
        const getResponse = await fetch(`http://localhost:3000/api/v1/notifications/${result.data.notificationId}`);
        const getResult = await getResponse.json();
        console.log('📋 Retrieved notification:', JSON.stringify(getResult, null, 2));
      }
    } else {
      console.error('❌ Failed to create notification');
    }
  } catch (error) {
    console.error('❌ API call failed:', error.message);
  }
}

debugNotification().catch(console.error);
