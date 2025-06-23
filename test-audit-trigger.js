const axios = require('axios');

async function triggerAuditLog() {
  try {
    console.log('🚀 Testing audit log creation by making API requests...\n');
    
    const baseURL = 'http://localhost:3000';
    
    // Test 1: Try to access a protected endpoint without auth (should create audit log)
    console.log('📝 Test 1: Unauthorized access attempt...');
    try {
      await axios.get(`${baseURL}/api/v1/users/profile`, {
        timeout: 5000
      });
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Got expected 401 - should create audit log');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server not running - please start the API server first');
        return;
      } else {
        console.log(`🔍 Unexpected response: ${error.message}`);
      }
    }
    
    // Test 2: Try login attempt
    console.log('\n📝 Test 2: Login attempt...');
    try {
      await axios.post(`${baseURL}/api/v1/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      }, {
        timeout: 5000
      });
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 400) {
        console.log('✅ Got expected error - should create audit log');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server not running');
        return;
      } else {
        console.log(`🔍 Unexpected response: ${error.message}`);
      }
    }
    
    // Test 3: Try to access documentation (should be excluded from audit)
    console.log('\n📝 Test 3: Accessing documentation (should be excluded)...');
    try {
      await axios.get(`${baseURL}/docs`, {
        timeout: 5000
      });
      console.log('✅ Documentation accessed - should NOT create audit log (excluded route)');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server not running');
        return;
      } else {
        console.log(`🔍 Response: ${error.message}`);
      }
    }
    
    console.log('\n⏳ Wait a few seconds then check the database for new audit logs...');
    console.log('💡 Run: node db-query.js');
    
  } catch (error) {
    console.error('❌ Error triggering audit log:', error.message);
  }
}

triggerAuditLog().then(() => {
  console.log('\n✅ Audit trigger test complete');
}).catch(console.error);