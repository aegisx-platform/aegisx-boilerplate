#!/bin/bash

# 🧪 Auth API Test Script
echo "🚀 Testing Auth API at http://localhost:3000"

BASE_URL="http://localhost:3000"

echo ""
echo "=== 1. Register New User ==="
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }')

echo "Response: $REGISTER_RESPONSE"

echo ""
echo "=== 2. Login User ==="
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }')

echo "Response: $LOGIN_RESPONSE"

# Extract access token from login response
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token // empty')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refresh_token // empty')

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
  echo "✅ Access Token: ${ACCESS_TOKEN:0:50}..."
  
  echo ""
  echo "=== 3. Get User Profile (Protected) ==="
  PROFILE_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  echo "Response: $PROFILE_RESPONSE"
  
  echo ""
  echo "=== 4. Update Profile (Protected) ==="
  UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/auth/profile" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d '{"name": "John Updated Doe"}')
  echo "Response: $UPDATE_RESPONSE"
  
  if [ -n "$REFRESH_TOKEN" ] && [ "$REFRESH_TOKEN" != "null" ]; then
    echo ""
    echo "=== 5. Refresh Token ==="
    REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
      -H "Content-Type: application/json" \
      -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}")
    echo "Response: $REFRESH_RESPONSE"
  fi
  
  echo ""
  echo "=== 6. Logout (Protected) ==="
  LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}")
  echo "Response: $LOGOUT_RESPONSE"
  
else
  echo "❌ Failed to get access token from login"
fi

echo ""
echo "=== 7. Test Invalid Login ==="
INVALID_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid@example.com",
    "password": "wrongpassword"
  }')
echo "Response: $INVALID_LOGIN"

echo ""
echo "=== 8. Test Protected Route without Token ==="
NO_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/profile")
echo "Response: $NO_TOKEN_RESPONSE"

echo ""
echo "✅ Auth API Test Complete!"
