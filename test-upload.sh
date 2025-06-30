#!/bin/bash

# Test file upload without schema validation

# First get auth token
echo "Getting auth token..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"admin123"}')

TOKEN=$(echo $AUTH_RESPONSE | jq -r '.access_token')

if [ "$TOKEN" == "null" ]; then
  echo "Failed to get auth token"
  echo $AUTH_RESPONSE
  exit 1
fi

echo "Token: $TOKEN"

# Create test file
echo "Test file content" > test.txt

# Upload file
echo "Uploading file..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/storage/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt" \
  -F "path=test-folder" \
  -F "dataClassification=internal" \
  -F 'tags=["test","demo"]' \
  -F 'customMetadata={"key":"value"}' \
  -F "encrypt=false" \
  -F "overwrite=false")

echo "Upload response:"
echo $UPLOAD_RESPONSE | jq .

# Clean up
rm test.txt
