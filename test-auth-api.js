#!/usr/bin/env node

/**
 * Simple Auth API Test Script
 * Tests all auth endpoints to ensure they work correctly
 */

const API_BASE = 'http://localhost:3000';

async function makeRequest(method, path, data = null, token = null) {
    const url = `${API_BASE}${path}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();

        console.log(`${method} ${path}:`);
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, JSON.stringify(result, null, 2));
        console.log('---');

        return { status: response.status, data: result };
    } catch (error) {
        console.error(`Error testing ${method} ${path}:`, error.message);
        return { status: 0, data: { error: error.message } };
    }
}

async function testAuthAPI() {
    console.log('🔐 Testing Auth API Endpoints\n');

    // Test data
    const testUser = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123'
    };

    let accessToken = null;
    let refreshToken = null;

    try {
        // 1. Test Register
        console.log('1️⃣ Testing User Registration...');
        const registerResult = await makeRequest('POST', '/auth/register', testUser);

        if (registerResult.status === 201) {
            console.log('✅ Registration successful!');
        } else if (registerResult.status === 409) {
            console.log('ℹ️ User already exists, continuing with login...');
        } else {
            console.log('❌ Registration failed');
            return;
        }

        // 2. Test Login
        console.log('2️⃣ Testing User Login...');
        const loginResult = await makeRequest('POST', '/auth/login', {
            email: testUser.email,
            password: testUser.password
        });

        if (loginResult.status === 200) {
            console.log('✅ Login successful!');
            accessToken = loginResult.data.access_token;
            refreshToken = loginResult.data.refresh_token;
        } else {
            console.log('❌ Login failed');
            return;
        }

        // 3. Test Get Profile (Protected)
        console.log('3️⃣ Testing Get Profile...');
        const profileResult = await makeRequest('GET', '/auth/profile', null, accessToken);

        if (profileResult.status === 200) {
            console.log('✅ Get profile successful!');
        } else {
            console.log('❌ Get profile failed');
        }

        // 4. Test Update Profile (Protected)
        console.log('4️⃣ Testing Update Profile...');
        const updateResult = await makeRequest('PUT', '/auth/profile', {
            name: 'John Doe Updated'
        }, accessToken);

        if (updateResult.status === 200) {
            console.log('✅ Update profile successful!');
        } else {
            console.log('❌ Update profile failed');
        }

        // 5. Test Refresh Token
        console.log('5️⃣ Testing Refresh Token...');
        const refreshResult = await makeRequest('POST', '/auth/refresh', {
            refresh_token: refreshToken
        });

        if (refreshResult.status === 200) {
            console.log('✅ Refresh token successful!');
            accessToken = refreshResult.data.access_token; // Use new token
        } else {
            console.log('❌ Refresh token failed');
        }

        // 6. Test Change Password (Protected)
        console.log('6️⃣ Testing Change Password...');
        const changePasswordResult = await makeRequest('PUT', '/auth/change-password', {
            current_password: testUser.password,
            new_password: 'NewSecurePass123'
        }, accessToken);

        if (changePasswordResult.status === 200) {
            console.log('✅ Change password successful!');
        } else {
            console.log('❌ Change password failed');
        }

        // 7. Test Logout (Protected)
        console.log('7️⃣ Testing Logout...');
        const logoutResult = await makeRequest('POST', '/auth/logout', {
            refresh_token: refreshToken
        }, accessToken);

        if (logoutResult.status === 200) {
            console.log('✅ Logout successful!');
        } else {
            console.log('❌ Logout failed');
        }

        // 8. Test using logged out token (should fail)
        console.log('8️⃣ Testing with revoked token (should fail)...');
        const revokedResult = await makeRequest('GET', '/auth/profile', null, accessToken);

        if (revokedResult.status === 401) {
            console.log('✅ Revoked token correctly rejected!');
        } else {
            console.log('❌ Revoked token should have been rejected');
        }

        console.log('\n🎉 Auth API Test Complete!');

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ This script requires Node.js 18+ with built-in fetch support');
    console.log('💡 Or install node-fetch: npm install node-fetch');
    process.exit(1);
}

// Run tests
testAuthAPI();
