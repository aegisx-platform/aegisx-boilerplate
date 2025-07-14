#!/usr/bin/env node

// Test notification functionality when API server is ready
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testNotification() {
  try {
    console.log('🧪 Testing AegisX API Notification System...\n');
    
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/health');
      console.log('✅ Health Check:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health Check failed:', error.message);
      return;
    }
    
    // Test 2: Login to get token
    console.log('\n2️⃣ Testing Authentication...');
    let authToken;
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
        email: 'admin@aegisx.com',
        password: 'admin123'
      });
      authToken = loginResponse.data.token;
      console.log('✅ Login successful, token received');
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data?.message || error.message);
      return;
    }
    
    // Test 3: Send Notification
    console.log('\n3️⃣ Testing Email Notification...');
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const notificationResponse = await axios.post(`${API_BASE}/notifications`, {
        recipients: ['test@example.com'],
        channel: 'email',
        title: 'Test Notification from AegisX',
        message: 'This is a test notification sent via the notification system.',
        priority: 'normal',
        data: {
          testData: 'Gmail SMTP Configuration Test',
          timestamp: new Date().toISOString()
        }
      }, { headers });
      
      console.log('✅ Notification sent successfully:', {
        id: notificationResponse.data.id,
        status: notificationResponse.data.status,
        channel: notificationResponse.data.channel
      });
    } catch (error) {
      console.log('❌ Notification failed:', error.response?.data?.message || error.message);
    }
    
    // Test 4: Check Queue Status
    console.log('\n4️⃣ Testing Queue Status...');
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const queueResponse = await axios.get(`${API_BASE}/queue/status`, { headers });
      console.log('✅ Queue Status:', queueResponse.data);
    } catch (error) {
      console.log('❌ Queue status check failed:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🎉 Test completed!\n');
    console.log('📧 SMTP Configuration:');
    console.log('   Host: smtp.gmail.com');
    console.log('   User: ikkdev@gmail.com');
    console.log('   From: noreply@aegisx.com');
    console.log('   Name: AegisX Healthcare System');
    console.log('\n⚙️  Queue Configuration:');
    console.log('   Broker: Redis');
    console.log('   Auto Processing: Enabled (30s interval)');
    console.log('   Rate Limiting: 100/minute');
    
  } catch (error) {
    console.log('💥 Unexpected error:', error.message);
  }
}

// Run test
if (require.main === module) {
  console.log('⏳ Waiting for API server to be ready...');
  setTimeout(testNotification, 5000);
}

module.exports = testNotification;