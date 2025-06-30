const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testUpload() {
  try {
    // First, get auth token
    const loginResponse = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@aegisx.com',
      password: 'Admin123!@#'
    });
    
    const token = loginResponse.data.data.accessToken;
    
    // Create form data
    const form = new FormData();
    form.append('file', 'Test file content', 'test.txt');
    form.append('path', 'test-folder');
    form.append('dataClassification', 'internal');
    form.append('tags', '["test", "demo"]');
    form.append('customMetadata', '{"key": "value"}');
    form.append('encrypt', 'false');
    form.append('overwrite', 'false');
    
    // Upload file
    const uploadResponse = await axios.post('http://localhost:3000/api/v1/storage/upload', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Upload successful:', uploadResponse.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run test
testUpload();