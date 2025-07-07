# API Key Testing Guide

คู่มือทดสอบการใช้งาน API Key Authentication

## 1. เข้าสู่ระบบเพื่อรับ JWT Token

```bash
curl -X 'POST' \
  'http://localhost:3000/api/v1/auth/login' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "identifier": "admin@aegisx.com",
  "password": "admin123"
}'
```

**ผลลัพธ์ที่ได้:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "34f8b2f9-9506-453d-876e-d9c4f7fa94ea",
    "name": "Admin User",
    "email": "admin@aegisx.com"
  }
}
```

## 2. สร้าง API Key

### ตัวอย่าง 1: API Key พื้นฐาน (ไม่มีข้อจำกัด)

```bash
# ใช้ JWT Token จากขั้นตอนที่ 1
JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X 'POST' \
  'http://localhost:3000/api/v1/auth/api-keys' \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "My First API Key",
  "description": "API key for testing basic operations"
}'
```

### ตัวอย่าง 2: API Key พร้อม Permissions

```bash
curl -X 'POST' \
  'http://localhost:3000/api/v1/auth/api-keys' \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Limited Access Key",
  "description": "API key with specific permissions",
  "permissions": {
    "resources": ["users", "files"],
    "actions": ["read"],
    "scopes": ["own"]
  },
  "rateLimit": 1000
}'
```

### ตัวอย่าง 3: API Key พร้อมวันหมดอายุ

```bash
curl -X 'POST' \
  'http://localhost:3000/api/v1/auth/api-keys' \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Temporary API Key",
  "description": "API key that expires in 30 days",
  "expiresAt": "2025-08-06T23:59:59.000Z",
  "rateLimit": 5000
}'
```

### ตัวอย่าง 4: API Key พร้อม IP Whitelist

```bash
curl -X 'POST' \
  'http://localhost:3000/api/v1/auth/api-keys' \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "Secure API Key",
  "description": "API key restricted to specific IPs",
  "permissions": {
    "resources": ["users", "files", "reports"],
    "actions": ["read", "write"],
    "scopes": ["own", "department"]
  },
  "ipWhitelist": ["127.0.0.1", "::1", "192.168.1.100"],
  "rateLimit": 2000
}'
```

**ผลลัพธ์ที่ได้:**
```json
{
  "success": true,
  "data": {
    "id": "4c6b78dd-5197-4b6b-a72b-2514bd63b68a",
    "key": "sk_test_YOUR_ACTUAL_API_KEY_WILL_BE_HERE",
    "name": "My First API Key",
    "prefix": "sk_test_YOUR...",
    "createdAt": "2025-07-07T09:00:16.674Z"
  },
  "message": "API key created successfully. Store it securely - it will not be shown again."
}
```

**⚠️ สำคัญ: บันทึก `key` ไว้ทันที เพราะจะไม่แสดงอีกครั้ง!**

## 3. ดูรายการ API Keys ทั้งหมด

```bash
curl -X 'GET' \
  'http://localhost:3000/api/v1/auth/api-keys' \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 4. ดูรายละเอียด API Key

```bash
# ใช้ API Key ID จากขั้นตอนที่ 2
API_KEY_ID="4c6b78dd-5197-4b6b-a72b-2514bd63b68a"

curl -X 'GET' \
  "http://localhost:3000/api/v1/auth/api-keys/$API_KEY_ID" \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## 5. ทดสอบใช้งาน API Key

### ตัวอย่าง 1: เรียกใช้ API ด้วย API Key

```bash
# ใช้ API Key จากขั้นตอนที่ 2
API_KEY="sk_test_YOUR_ACTUAL_API_KEY_HERE"

# ทดสอบกับ Storage API
curl -X 'GET' \
  'http://localhost:3000/api/v1/storage/files?limit=10' \
  -H 'accept: application/json' \
  -H "X-API-Key: $API_KEY"

# ทดสอบกับ User API
curl -X 'GET' \
  'http://localhost:3000/api/v1/users/me' \
  -H 'accept: application/json' \
  -H "X-API-Key: $API_KEY"
```

### ตัวอย่าง 2: ทดสอบ Validation ของ API Key

```bash
curl -X 'GET' \
  'http://localhost:3000/api/v1/auth/api-keys/test/validate' \
  -H 'accept: application/json' \
  -H "X-API-Key: $API_KEY"
```

## 6. ยกเลิก API Key

```bash
curl -X 'DELETE' \
  "http://localhost:3000/api/v1/auth/api-keys/$API_KEY_ID" \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
  "reason": "No longer needed"
}'
```

## 7. Regenerate API Key

```bash
curl -X 'POST' \
  "http://localhost:3000/api/v1/auth/api-keys/$API_KEY_ID/regenerate" \
  -H 'accept: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## การแก้ไขปัญหาที่พบบ่อย

### 1. Error: "You do not have permission to create API keys"
**สาเหตุ**: User ไม่มี permission `api_keys:create:own`
**แก้ไข**: 
- ตรวจสอบว่า user มี role ที่ถูกต้อง (admin, manager, หรือ user)
- รีเซ็ตฐานข้อมูลและ seed ใหม่: `npm run db:reset`

### 2. Error: "Invalid or inactive API key"
**สาเหตุ**: API key ไม่ถูกต้องหรือถูกยกเลิกแล้ว
**แก้ไข**: สร้าง API key ใหม่

### 3. Error: "IP address not whitelisted"
**สาเหตุ**: IP ที่ใช้เรียก API ไม่อยู่ใน whitelist
**แก้ไข**: 
- ไม่ใส่ ipWhitelist เมื่อสร้าง API key
- หรือเพิ่ม IP ที่ถูกต้องใน whitelist

### 4. Error: "API key rate limit exceeded"
**สาเหตุ**: เรียกใช้ API เกิน rate limit ที่กำหนด
**แก้ไข**: รอให้ rate limit reset หรือเพิ่ม rate limit

## ตัวอย่าง Script สำหรับทดสอบอัตโนมัติ

```bash
#!/bin/bash

# 1. Login
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X 'POST' \
  'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "identifier": "admin@aegisx.com",
    "password": "admin123"
  }')

JWT_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
echo "✅ Got JWT Token"

# 2. Create API Key
echo "🔑 Creating API Key..."
API_KEY_RESPONSE=$(curl -s -X 'POST' \
  'http://localhost:3000/api/v1/auth/api-keys' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Test API Key",
    "description": "Created by script"
  }')

API_KEY=$(echo $API_KEY_RESPONSE | jq -r '.data.key')
API_KEY_ID=$(echo $API_KEY_RESPONSE | jq -r '.data.id')
echo "✅ Created API Key: $API_KEY_ID"

# 3. Test API Key
echo "🧪 Testing API Key..."
TEST_RESPONSE=$(curl -s -X 'GET' \
  'http://localhost:3000/api/v1/users/me' \
  -H "X-API-Key: $API_KEY")

echo "✅ API Key Test Response:"
echo $TEST_RESPONSE | jq '.'

# 4. List API Keys
echo "📋 Listing API Keys..."
LIST_RESPONSE=$(curl -s -X 'GET' \
  'http://localhost:3000/api/v1/auth/api-keys' \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "✅ Found $(echo $LIST_RESPONSE | jq '.total') API Keys"

# 5. Clean up
echo "🧹 Cleaning up..."
curl -s -X 'DELETE' \
  "http://localhost:3000/api/v1/auth/api-keys/$API_KEY_ID" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"reason": "Test completed"}'

echo "✅ Test completed successfully!"
```

## Best Practices

1. **การตั้งชื่อ API Key**
   - ใช้ชื่อที่บอกวัตถุประสงค์ชัดเจน
   - ระบุ environment (production, staging, development)
   - ระบุ service หรือ application ที่ใช้

2. **การกำหนด Permissions**
   - ให้ permissions เท่าที่จำเป็นเท่านั้น (Principle of Least Privilege)
   - แยก API key สำหรับแต่ละ service/purpose

3. **การจัดการ Security**
   - ใช้ IP whitelist สำหรับ production API keys
   - ตั้ง expiration date สำหรับ temporary keys
   - Rotate API keys เป็นประจำ

4. **การ Monitor**
   - ตรวจสอบ usage statistics เป็นประจำ
   - ตั้ง alerts สำหรับ unusual activity
   - Review และ revoke unused keys

## Environment Variables ที่เกี่ยวข้อง

```bash
# API Key Configuration
API_KEY_EXPIRATION_STRATEGY=hybrid
API_KEY_CRONJOB_ENABLED=true
API_KEY_REDIS_TTL_ENABLED=true
API_KEY_CLEANUP_SCHEDULE="0 2 * * *"
API_KEY_MAX_PER_USER=10
API_KEY_DEFAULT_RATE_LIMIT=1000
```