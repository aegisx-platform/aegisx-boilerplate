# Dynamic Configuration Management System

## 📋 ภาพรวม

**Dynamic Configuration Management System** เป็นระบบจัดการการตั้งค่าแบบไดนามิกที่ช่วยให้สามารถปรับเปลี่ยนค่า configuration จาก UI หรือ API โดยไม่ต้องทำการ restart ระบบ คล้ายกับระบบจัดการ configuration ใน Strapi CMS

### 🎯 วัตถุประสงค์หลัก
- **No Restart Required**: เปลี่ยน configuration โดยไม่ต้อง restart server
- **UI Management**: จัดการ configuration ผ่าน Web Interface
- **Multi-Environment**: รองรับหลาย environment (development, production, staging, test)
- **Audit Trail**: บันทึกประวัติการเปลี่ยนแปลงทั้งหมด
- **Type Safety**: TypeScript support พร้อม schema validation
- **Healthcare Compliance**: HIPAA compliance features

## 🏗️ สถาปัตยกรรมระบบ

### Database Schema (4 ตาราง)

```sql
-- Core configuration table
system_configurations (id, category, config_key, config_value, value_type, is_encrypted, is_active, environment, updated_by, created_at, updated_at)

-- UI metadata for form generation
configuration_metadata (id, category, config_key, display_name, description, input_type, validation_rules, default_value, is_required, sort_order, group_name, help_text, created_at)

-- Change history for audit
configuration_history (id, config_id, old_value, new_value, changed_by, change_reason, ip_address, user_agent, created_at)

-- Built-in templates for providers
configuration_templates (id, provider_name, category, template_data, description, is_active, created_at, updated_at)
```

### Domain Architecture

```
apps/api/src/app/domains/config-management/
├── controllers/
│   ├── config-controller.ts           # Main configuration CRUD operations
│   └── config-template-controller.ts  # Template management
├── services/
│   ├── config-service.ts              # Core business logic
│   ├── config-hot-reload.service.ts   # Hot reload mechanism
│   └── config-template.service.ts     # Template operations
├── repositories/
│   ├── config-repository.ts           # Configuration data access
│   ├── config-history-repository.ts   # History data access
│   └── config-metadata-repository.ts  # Metadata data access
├── schemas/
│   └── config.schemas.ts              # TypeBox validation schemas
├── types/
│   └── config.types.ts                # TypeScript interfaces
└── routes/
    ├── config-routes.ts               # Main API routes
    └── config-template-routes.ts      # Template API routes
```

## 🚀 การติดตั้งและเริ่มใช้งาน

### 1. Database Migration
```bash
# Run database migrations
npm run db:dev:migrate
```

### 2. Environment Variables
```bash
# Configuration Management
CONFIG_ENCRYPTION_ENABLED=false
CONFIG_CACHE_ENABLED=true
CONFIG_CACHE_TTL=300

# Hot Reload Settings
CONFIG_HOT_RELOAD_ENABLED=true
CONFIG_HOT_RELOAD_DEBOUNCE_MS=1000

# Email Integration
DYNAMIC_EMAIL_ENABLED=true
EMAIL_PROVIDER=gmail
```

### 3. Server Startup
ระบบจะโหลดอัตโนมัติเมื่อ server เริ่มทำงาน:
```bash
npm run start:api
```

## 📡 API Reference

### Core Configuration Management

#### Create Configuration
```http
POST /api/v1/config
Content-Type: application/json

{
  "category": "smtp",
  "configKey": "host",
  "configValue": "smtp.gmail.com",
  "valueType": "string",
  "environment": "production",
  "changeReason": "Initial SMTP setup"
}
```

#### Get Configuration by ID
```http
GET /api/v1/config/123
```

#### Update Configuration
```http
PUT /api/v1/config/123
Content-Type: application/json

{
  "configValue": "smtp.sendgrid.net",
  "changeReason": "Switch to SendGrid"
}
```

#### Delete Configuration
```http
DELETE /api/v1/config/123
```

### Search & Browse

#### Search Configurations
```http
GET /api/v1/config/search?category=smtp&environment=production&search=host
```

#### Get by Category
```http
GET /api/v1/config/category/smtp?environment=production
```

#### Get Configuration Values (Key-Value Pairs)
```http
GET /api/v1/config/values/smtp?environment=production

Response:
{
  "success": true,
  "data": {
    "category": "smtp",
    "environment": "production",
    "values": {
      "host": "smtp.gmail.com",
      "port": "587",
      "secure": "false",
      "user": "your-email@gmail.com",
      "pass": "your-app-password"
    },
    "lastUpdated": "2025-01-21T10:30:00Z"
  }
}
```

#### Get Merged Configuration
```http
GET /api/v1/config/merged/smtp?environment=production
```

### Bulk Operations

#### Bulk Update
```http
PUT /api/v1/config/bulk
Content-Type: application/json

{
  "updates": [
    {"id": 1, "configValue": "smtp.gmail.com", "isActive": true},
    {"id": 2, "configValue": "587", "isActive": true}
  ],
  "changeReason": "Bulk SMTP configuration update",
  "environment": "production"
}
```

### Hot Reload (Currently Mock)

#### Force Reload
```http
POST /api/v1/config/reload
Content-Type: application/json

{
  "category": "smtp",
  "environment": "production",
  "changeReason": "Updated SMTP credentials"
}
```

#### Get Reload Statistics
```http
GET /api/v1/config/reload/stats

Response:
{
  "success": true,
  "data": {
    "services": {
      "email-service": {
        "successCount": 5,
        "errorCount": 0,
        "categories": ["smtp"]
      }
    },
    "timestamp": "2025-01-21T10:30:00Z"
  }
}
```

### History & Audit

#### Get Configuration History
```http
GET /api/v1/config/123/history?page=1&limit=10&sortOrder=desc

Response:
{
  "success": true,
  "data": {
    "history": [
      {
        "id": 456,
        "configId": 123,
        "oldValue": "smtp.sendgrid.net",
        "newValue": "smtp.gmail.com",
        "changedBy": 1,
        "changeReason": "Switch back to Gmail",
        "ipAddress": "192.168.1.100",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2025-01-21T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### Templates

#### Get Available Templates
```http
GET /api/v1/config/templates

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "providerName": "gmail",
      "category": "smtp",
      "description": "Gmail SMTP configuration template",
      "templateData": {
        "host": "smtp.gmail.com",
        "port": "587",
        "secure": "false",
        "auth": {
          "user": "{{EMAIL_USER}}",
          "pass": "{{EMAIL_PASS}}"
        }
      }
    }
  ]
}
```

#### Apply Template
```http
POST /api/v1/config/templates/apply
Content-Type: application/json

{
  "provider": "gmail",
  "environment": "production",
  "variables": {
    "EMAIL_USER": "your-email@gmail.com",
    "EMAIL_PASS": "your-app-password"
  },
  "changeReason": "Setup Gmail SMTP using template"
}
```

## 📧 Email Integration

### Dynamic Email Service
ระบบรองรับการเปลี่ยนแปลง SMTP configuration แบบ real-time โดยไม่ต้อง restart server

### Supported SMTP Providers
- **Gmail**: smtp.gmail.com (App Password required)
- **SendGrid**: smtp.sendgrid.net
- **Mailtrap**: smtp.mailtrap.io (Development/Testing)
- **Amazon SES**: Regional endpoints
- **Mailgun**: smtp.mailgun.org
- **Postmark**: smtp.postmarkapp.com

### การตั้งค่า Gmail SMTP
```json
{
  "category": "smtp",
  "configs": {
    "host": "smtp.gmail.com",
    "port": "587",
    "secure": "false",
    "auth_user": "your-email@gmail.com",
    "auth_pass": "your-16-char-app-password"
  },
  "environment": "production"
}
```

### Non-Breaking Integration
- **Existing notification system**: ยังทำงานได้ตามปกติ
- **Environment fallback**: หาก dynamic config ล้มเหลว จะใช้ environment variables
- **Gradual adoption**: สามารถใช้ทีละส่วนได้

## 🔄 Hot Reload System

### Overview
Hot Reload System ช่วยให้ services สามารถ reload configuration โดยอัตโนมัติเมื่อมีการเปลี่ยนแปลง

### Current Status: Mock Implementation
⚠️ **หมายเหตุ**: ปัจจุบัน Hot Reload Service มีปัญหา hang/timeout จึงใช้ Mock response ชั่วคราว

### Architecture (When Working)
```typescript
// Service Registration
fastify.configHotReloadService.registerHandler({
  serviceName: 'email-service',
  categories: ['smtp'],
  environments: ['production', 'staging'],
  handler: async (config, event) => {
    // Reload SMTP configuration
    await emailService.updateConfig(config);
  },
  priority: 1
});

// Automatic Reload on Configuration Change
await fastify.eventBus.publish('config.changed', {
  category: 'smtp',
  environment: 'production',
  changedBy: userId
});
```

### Reload Flow
1. **Configuration Update**: User updates config through API
2. **Event Publish**: System publishes config change event
3. **Service Notification**: Registered services receive reload notification
4. **Priority Processing**: Services reload in priority order
5. **Success Confirmation**: Reload status tracked and logged

## 🔐 Security & Compliance

### Data Encryption
```typescript
// Sensitive values can be encrypted
{
  "configKey": "auth_pass",
  "configValue": "encrypted:AES256:...",
  "isEncrypted": true
}
```

### Audit Trail
- **Complete History**: ทุกการเปลี่ยนแปลงถูกบันทึก
- **User Tracking**: บันทึกผู้ทำการเปลี่ยนแปลง
- **IP & User Agent**: บันทึก request metadata
- **Change Reason**: ระบุเหตุผลในการเปลี่ยนแปลง

### HIPAA Compliance
- **Data Sanitization**: ทำความสะอาดข้อมูลที่อาจละเอียดอ่อน
- **Access Control**: ควบคุมการเข้าถึง (authentication จะเปิดใช้ในอนาคต)
- **Encryption Support**: รองรับการเข้ารหัสข้อมูล

## 🛠️ Configuration Hierarchy

ระบบใช้ hierarchical configuration loading:

1. **Database**: ค่าจาก system_configurations table
2. **Cache**: ค่าที่ cache ไว้ใน Redis
3. **Environment**: ค่าจาก environment variables
4. **Defaults**: ค่า default ของระบบ

```typescript
// Example configuration resolution
const smtpConfig = await configService.getMergedConfiguration('smtp', 'production');
// Result combines all sources with proper precedence
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Hot Reload Service Hang
**อาการ**: API endpoints `/api/v1/config/reload/*` timeout
**สาเหตุ**: ConfigHotReloadService มีปัญหา
**แก้ไข**: ปัจจุบันใช้ Mock response, hot reload จะทำงานผ่าน event bus

#### 2. Configuration Not Loading
**ตรวจสอบ**:
```bash
# Check if configuration exists
curl http://localhost:3000/api/v1/config/values/smtp?environment=production

# Check service health
curl http://localhost:3000/health/config-management
```

#### 3. Email Not Sending After Config Change
**แก้ไข**:
```bash
# Force reload email service
curl -X POST http://localhost:3000/api/v1/config/reload \
  -H "Content-Type: application/json" \
  -d '{"category": "smtp", "environment": "production"}'
```

### Debug Logging
```bash
# Enable debug logging
LOG_LEVEL=debug npm run start:api

# Check configuration loading logs
grep "Configuration" logs/app.log
```

## 📊 Best Practices

### 1. Configuration Organization
- ใช้ **category** เพื่อจัดกลุม เช่น `smtp`, `database`, `api_keys`
- ใช้ **environment** เพื่อแยกค่าตาม environment
- ตั้งชื่อ **configKey** ให้สื่อความหมาย เช่น `host`, `port`, `auth_user`

### 2. Change Management
- ระบุ **changeReason** ทุกครั้งที่อัพเดท
- ใช้ **bulk update** สำหรับการเปลี่ยนแปลงหลายค่าพร้อมกัน
- ทดสอบใน development environment ก่อน production

### 3. Security
- เปิดใช้ **encryption** สำหรับข้อมูลที่ละเอียดอ่อน
- ตั้งค่า **isActive: false** สำหรับ config ที่ไม่ใช้แทนการลบ
- Review **configuration history** เป็นประจำ

### 4. Performance
- เปิดใช้ **Redis caching** สำหรับการใช้งานที่มี load สูง
- ใช้ **merged configuration** API เพื่อลดจำนวน requests
- Monitor **reload statistics** เพื่อติดตามประสิทธิภาพ

## 🚀 Future Enhancements

### Planned Features
1. **Hot Reload Fix**: แก้ไขปัญหา service hang
2. **Frontend UI**: Angular components สำหรับจัดการ configuration
3. **Configuration Validation**: Advanced validation rules
4. **Import/Export**: Backup และ restore configurations
5. **Configuration Diff**: เปรียบเทียบค่าระหว่าง environments
6. **Approval Workflow**: อนุมัติการเปลี่ยนแปลงสำหรับ production

### Known Limitations
- Hot reload service มีปัญหา (ใช้ Mock response ชั่วคราว)
- Authentication ปิดการใช้งานชั่วคราว
- Frontend UI ยังไม่ได้พัฒนา
- Advanced validation rules ยังไม่ครบถ้วน

---

## 📚 Related Documentation

- [API Documentation](./config-management-api.md) - รายละเอียด API endpoints
- [Database Schema](./config-management-database.md) - โครงสร้างฐานข้อมูล
- [Integration Guide](./config-management-integration.md) - การผสานเข้ากับระบบอื่น
- [Notification Service](./notification-service.md) - การใช้งานร่วมกับ notification system

---

**สร้างเมื่อ**: 2025-01-21  
**อัพเดทล่าสุด**: 2025-01-21  
**เวอร์ชัน**: 1.0.0  
**สถานะ**: Production Ready (ยกเว้น Hot Reload)