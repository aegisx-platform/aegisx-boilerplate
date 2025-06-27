# Database Schema สำหรับ Notification Service

## 📊 ภาพรวมตารางทั้งหมด

### ตารางหลัก (Core Tables)
1. **`notifications`** - เก็บข้อมูลการแจ้งเตือนหลัก
2. **`notification_templates`** - เก็บ template การแจ้งเตือน
3. **`notification_preferences`** - ตั้งค่าการแจ้งเตือนของผู้ใช้
4. **`notification_batches`** - จัดการการส่งแบบกลุ่ม

### ตารางเสริม (Supporting Tables)
5. **`notification_errors`** - เก็บข้อมูลข้อผิดพลาด
6. **`notification_batch_items`** - เชื่อมโยง batch กับ notifications
7. **`notification_statistics`** - เก็บสถิติการใช้งาน
8. **`healthcare_notifications`** - ข้อมูลเฉพาะทางการแพทย์

---

## 📋 รายละเอียดตาราง

### 1. 🎯 `notifications` - ตารางหลัก

```sql
CREATE TABLE notifications (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,           -- ประเภท: appointment-reminder, lab-results
    channel VARCHAR(20) NOT NULL,       -- ช่องทาง: email, sms, push, slack
    status VARCHAR(20) DEFAULT 'queued', -- สถานะ: queued, sent, delivered, failed
    priority VARCHAR(20) DEFAULT 'normal', -- ความสำคัญ: critical, urgent, high, normal, low
    
    -- ข้อมูลผู้รับ
    recipient_id VARCHAR(50),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    recipient_device_token VARCHAR(255),
    recipient_slack_user_id VARCHAR(50),
    recipient_slack_channel VARCHAR(100),
    recipient_webhook_url VARCHAR(500),
    
    -- เนื้อหา
    subject VARCHAR(255),
    content_text TEXT,
    content_html TEXT,
    template_name VARCHAR(100),
    template_data JSON,
    
    -- ข้อมูลเพิ่มเติม
    metadata JSON,                       -- เก็บ healthcare metadata
    tags JSON,                          -- แท็กสำหรับจัดหมวดหมู่
    
    -- การติดตาม
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    scheduled_at TIMESTAMP,             -- เวลาที่กำหนดส่ง
    sent_at TIMESTAMP,                  -- เวลาที่ส่งจริง
    delivered_at TIMESTAMP,             -- เวลาที่ส่งถึง
    failed_at TIMESTAMP,                -- เวลาที่ส่งไม่สำเร็จ
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);
```

**ตัวอย่างข้อมูล:**
```json
{
  "id": "notif_001",
  "type": "appointment-reminder",
  "channel": "email",
  "status": "sent",
  "priority": "high",
  "recipient_email": "patient@example.com",
  "subject": "เตือนนัดหมายแพทย์",
  "template_name": "appointment-reminder",
  "template_data": {
    "patientName": "คุณสมชาย",
    "doctorName": "นพ.สมหญิง",
    "appointmentDate": "15 มกราคม 2024"
  },
  "metadata": {
    "healthcare": {
      "patientId": "P12345",
      "providerId": "DR001",
      "hipaaCompliant": true
    }
  }
}
```

### 2. 📝 `notification_templates` - Template

```sql
CREATE TABLE notification_templates (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,  -- ชื่อ template
    type VARCHAR(50) NOT NULL,          -- ประเภทการแจ้งเตือน
    channels JSON NOT NULL,             -- array ของ channels ที่รองรับ
    subject VARCHAR(255) NOT NULL,      -- หัวข้อ
    content_text TEXT NOT NULL,         -- เนื้อหาแบบข้อความ
    content_html TEXT,                  -- เนื้อหาแบบ HTML
    variables JSON,                     -- รายการตัวแปรที่ใช้
    version VARCHAR(10) DEFAULT '1.0',
    active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(50)
);
```

**ตัวอย่าง Template:**
```json
{
  "id": "tmpl_appointment_reminder",
  "name": "appointment-reminder",
  "type": "appointment-reminder",
  "channels": ["email", "sms"],
  "subject": "เตือนนัดหมายแพทย์ - {{appointmentDate}}",
  "content_html": "<h2>เรียน {{patientName}}</h2><p>คุณมีนัดกับ {{doctorName}}</p>",
  "variables": [
    {"name": "patientName", "type": "string", "required": true},
    {"name": "doctorName", "type": "string", "required": true},
    {"name": "appointmentDate", "type": "string", "required": true}
  ]
}
```

### 3. ⚙️ `notification_preferences` - ตั้งค่าผู้ใช้

```sql
CREATE TABLE notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    channels JSON NOT NULL,             -- ช่องทางที่ต้องการรับ
    quiet_hours_start VARCHAR(5),       -- เวลาเริ่มห้ามรบกวน (HH:mm)
    quiet_hours_end VARCHAR(5),         -- เวลาสิ้นสุดห้ามรบกวน
    timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
    immediate BOOLEAN DEFAULT TRUE,     -- รับทันทีหรือไม่
    digest BOOLEAN DEFAULT FALSE,       -- รับแบบสรุปหรือไม่
    digest_interval VARCHAR(20) DEFAULT 'daily', -- ความถี่สรุป
    type_preferences JSON,              -- ตั้งค่าตามประเภท
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**ตัวอย่างการตั้งค่า:**
```json
{
  "user_id": "user123",
  "channels": ["email", "sms"],
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "08:00",
  "type_preferences": {
    "appointment-reminder": {
      "enabled": true,
      "channels": ["email", "sms"]
    },
    "lab-results": {
      "enabled": true,
      "channels": ["email"]
    }
  }
}
```

### 4. 📦 `notification_batches` - การส่งแบบกลุ่ม

```sql
CREATE TABLE notification_batches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255),                  -- ชื่อ batch
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    total_count INT DEFAULT 0,          -- จำนวนทั้งหมด
    success_count INT DEFAULT 0,        -- จำนวนที่สำเร็จ
    failure_count INT DEFAULT 0,        -- จำนวนที่ไม่สำเร็จ
    errors JSON,                        -- รายการข้อผิดพลาด
    
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_by VARCHAR(50)
);
```

### 5. 🏥 `healthcare_notifications` - ข้อมูลทางการแพทย์

```sql
CREATE TABLE healthcare_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50),             -- รหัสผู้ป่วย
    provider_id VARCHAR(50),            -- รหัสแพทย์/ผู้ให้บริการ
    appointment_id VARCHAR(50),         -- รหัสนัดหมาย
    facility_id VARCHAR(50),            -- รหัสสถานพยาบาล
    department VARCHAR(100),            -- แผนก
    urgency VARCHAR(20),                -- ความเร่งด่วน
    hipaa_compliant BOOLEAN DEFAULT TRUE,
    encryption_enabled BOOLEAN DEFAULT FALSE,
    encryption_algorithm VARCHAR(50),
    encryption_key_id VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
);
```

### 6. ❌ `notification_errors` - ข้อผิดพลาด

```sql
CREATE TABLE notification_errors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id VARCHAR(50) NOT NULL,
    channel VARCHAR(20) NOT NULL,
    error_message TEXT NOT NULL,
    error_code VARCHAR(50),
    retryable BOOLEAN DEFAULT TRUE,     -- ลองใหม่ได้หรือไม่
    occurred_at TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
);
```

### 7. 📊 `notification_statistics` - สถิติ

```sql
CREATE TABLE notification_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,  -- ชื่อ metric: sent, delivered, failed
    channel VARCHAR(20),                -- ช่องทาง
    type VARCHAR(50),                   -- ประเภท
    priority VARCHAR(20),               -- ความสำคัญ
    count INT DEFAULT 0,                -- จำนวน
    average_delivery_time DECIMAL(10,2), -- เวลาส่งเฉลี่ย (ms)
    error_rate DECIMAL(5,2),            -- อัตราข้อผิดพลาด (%)
    date DATE NOT NULL,                 -- วันที่
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔍 การ Query ตัวอย่าง

### ดูสถานะการแจ้งเตือน
```sql
SELECT 
    n.id,
    n.type,
    n.channel,
    n.status,
    n.priority,
    n.recipient_email,
    n.subject,
    n.attempts,
    n.created_at,
    n.sent_at,
    hn.patient_id,
    hn.provider_id,
    hn.urgency
FROM notifications n
LEFT JOIN healthcare_notifications hn ON n.id = hn.notification_id
WHERE n.recipient_email = 'patient@example.com'
ORDER BY n.created_at DESC;
```

### สถิติการส่งแจ้งเตือนรายวัน
```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
    ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM notifications
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### การแจ้งเตือนที่ค้างส่ง
```sql
SELECT 
    n.id,
    n.type,
    n.priority,
    n.attempts,
    n.max_attempts,
    n.scheduled_at,
    n.created_at,
    hn.patient_id,
    hn.urgency
FROM notifications n
LEFT JOIN healthcare_notifications hn ON n.id = hn.notification_id
WHERE n.status = 'queued'
    AND (n.scheduled_at IS NULL OR n.scheduled_at <= NOW())
    AND n.attempts < n.max_attempts
ORDER BY 
    CASE n.priority 
        WHEN 'critical' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'high' THEN 3
        WHEN 'normal' THEN 4
        WHEN 'low' THEN 5
    END,
    n.created_at ASC;
```

### Template ที่ใช้บ่อยที่สุด
```sql
SELECT 
    template_name,
    COUNT(*) as usage_count,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as success_count,
    ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*), 2) as success_rate
FROM notifications
WHERE template_name IS NOT NULL
    AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY template_name
ORDER BY usage_count DESC;
```

---

## 🚀 การรัน Migration และ Seed

```bash
# รัน migration
npm run db:migrate

# รัน seed (ข้อมูลตัวอย่าง)
npm run db:seed

# หรือรันแยก
npx knex migrate:latest
npx knex seed:run --specific=007_notification_seeds.ts
```

---

## 📈 Index และ Performance

### Index ที่สำคัญ:
- `notifications(status, priority, created_at)` - สำหรับ queue processing
- `notifications(recipient_email, created_at)` - ค้นหาตาม email
- `notifications(type, created_at)` - ค้นหาตามประเภท
- `healthcare_notifications(patient_id, created_at)` - ค้นหาตามผู้ป่วย
- `notification_statistics(metric_name, date)` - สถิติรายวัน

### การ Monitor Performance:
- ใช้ `EXPLAIN` กับ query ที่ใช้บ่อย
- ตรวจสอบ slow query log
- Monitor ขนาดตารางและ disk usage
- ตั้ง alerting สำหรับ failed notifications

นี่คือโครงสร้างฐานข้อมูลครับ พร้อมใช้งานสำหรับ Notification Service! 🎉