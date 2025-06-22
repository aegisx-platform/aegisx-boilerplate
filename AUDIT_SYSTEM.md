# Audit System Documentation

## Overview

ระบบ Audit Logging ที่ออกแบบมาเพื่อติดตามและบันทึกการกระทำของผู้ใช้ในระบบ รองรับหลายรูปแบบการประมวลผล (Adapters) เพื่อให้เหมาะสมกับทุกขนาดของระบบ

## Architecture

```
API Request → Audit Middleware → Adapter Factory → Selected Adapter → Storage/Queue
```

## Available Adapters

### 1. Direct Database Adapter
**การทำงาน:** เขียนข้อมูล audit log ลงฐานข้อมูลทันที

**ข้อดี:**
- ไม่ซับซ้อน ติดตั้งง่าย
- ข้อมูลไม่สูญหาย เพราะเขียนทันที
- Latency ต่ำ
- Strong consistency

**ข้อเสีย:**
- อาจทำให้ฐานข้อมูลช้าเมื่อมี load สูง
- ไม่มี queue buffer

**เหมาะสำหรับ:** Development, ระบบขนาดเล็ก

### 2. Redis Queue Adapter
**การทำงาน:** ใช้ Redis Lists เป็น message queue พร้อม background worker

**คุณสมบัติ:**
- Batch processing (ประมวลผลเป็นกลุม)
- Retry mechanism with exponential backoff
- Dead letter queue สำหรับ message ที่ล้มเหลว
- Non-blocking สำหรับ main requests

**ข้อดี:**
- Throughput สูงเพราะมี batching
- Memory efficient
- มี retry mechanism
- Asynchronous processing

**ข้อเสีย:**
- ต้องการ Redis server
- ต้องจัดการ worker process

**เหมาะสำหรับ:** ระบบขนาดกลาง, High-traffic applications

### 3. RabbitMQ Adapter
**การทำงาน:** ใช้ RabbitMQ enterprise message queue พร้อม automatic fallback

**คุณสมบัติ:**
- Message persistence และ durability
- Priority queues
- Dead letter exchange
- Automatic fallback ไปใช้ Direct Adapter หาก RabbitMQ ล่ม
- Connection pooling และ retry logic

**โครงสร้าง RabbitMQ:**
```
Exchange: audit.logs (topic)
├── Queue: audit.logs.queue (main)
├── Queue: audit.logs.queue.priority (priority)
└── DLX: audit.dlx → audit.logs.dlq (dead letter)
```

**ข้อดี:**
- Enterprise-grade reliability
- รองรับ clustering และ horizontal scaling
- Advanced routing capabilities
- Built-in fallback mechanism

**ข้อเสีย:**
- Setup ซับซ้อน
- ต้องการ RabbitMQ infrastructure

**เหมาะสำหรับ:** Enterprise systems, Mission-critical applications

## Configuration

### Core Settings
```env
# เปิด/ปิดระบบ audit
AUDIT_ENABLED=true

# เลือก adapter: direct, redis, rabbitmq
AUDIT_ADAPTER=direct

# บันทึก request/response body
AUDIT_LOG_BODY=false

# บันทึกเฉพาะการทำงานที่สำเร็จ
AUDIT_SUCCESS_ONLY=false

# ขนาดสูงสุดของ body ที่จะบันทึก (bytes)
AUDIT_MAX_BODY_SIZE=5120
```

### Filtering Options
```env
# ยกเว้น routes เหล่านี้
AUDIT_EXCLUDE_ROUTES=/health,/ready,/docs,/docs/*

# ยกเว้น HTTP methods เหล่านี้
AUDIT_EXCLUDE_METHODS=GET,HEAD,OPTIONS

# บันทึกเฉพาะ domains เหล่านี้ (ว่าง = ทั้งหมด)
AUDIT_INCLUDE_DOMAINS=users,roles,reports

# ยกเว้น domains เหล่านี้
AUDIT_EXCLUDE_DOMAINS=logs,metrics
```

### Redis Configuration
```env
REDIS_HOST=localhost
REDIS_PORT=6379
AUDIT_BATCH_SIZE=100
AUDIT_BATCH_TIMEOUT=5000
AUDIT_MAX_RETRIES=3
AUDIT_RETRY_DELAY=1000
```

### RabbitMQ Configuration
```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
AUDIT_RABBITMQ_QUEUE=audit_logs_simple
AUDIT_WORKER_PREFETCH=10
AUDIT_MESSAGE_TTL=86400000
AUDIT_WORKER_CONCURRENCY=3
```

## Database Schema

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR NOT NULL,           -- CREATE, READ, UPDATE, DELETE
  resource_type VARCHAR NOT NULL,    -- users, roles, reports
  resource_id VARCHAR,               -- UUID/ID ของ resource
  ip_address VARCHAR,
  user_agent VARCHAR,
  session_id VARCHAR,
  metadata JSONB,                    -- ข้อมูลเพิ่มเติม (method, url, headers, etc.)
  status VARCHAR DEFAULT 'success',   -- success, failed, error
  error_message VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

## Monitoring & Health Checks

### API Endpoints
```
GET /audit/adapter/stats     # สถิติการทำงาน
GET /audit/adapter/health    # สุขภาพระบบ
GET /audit/adapter/info      # ข้อมูลการตั้งค่า
GET /audit/adapter/queue     # สถานะ queue (Redis/RabbitMQ เท่านั้น)
```

### Example Response - Health Check
```json
{
  "adapter_type": "rabbitmq",
  "healthy": true,
  "capabilities": [
    "message_queuing",
    "priority_queues",
    "dead_letter_exchange",
    "automatic_fallback"
  ],
  "fallback_active": false,
  "connection_status": "connected"
}
```

### Example Response - Stats
```json
{
  "adapter_type": "redis",
  "processed_count": 15420,
  "error_count": 12,
  "success_rate": 99.92,
  "queue_length": 23,
  "worker_status": "running",
  "last_processed": "2024-01-15T10:30:45Z"
}
```

## Data Flow

### Direct Adapter
```
Request → setImmediate → Direct DB Write → Response
```

### Redis Adapter
```
Request → Redis LPUSH → Background Worker (RPOP) → Batch Process → DB Write
```

### RabbitMQ Adapter
```
Request → RabbitMQ Publish → Worker Consumer → DB Write
          ↓ (if RabbitMQ fails)
      Fallback Adapter → Direct DB Write
```

## Error Handling & Fallback

### Error Handling Layers
1. **Adapter Level:** แต่ละ adapter จัดการ error ของตัวเอง
2. **Middleware Level:** ใช้ `setImmediate` ป้องกันการบล็อก request
3. **Worker Level:** retry mechanism with exponential backoff
4. **Fallback Level:** RabbitMQ สามารถ fallback เป็น Direct Adapter

### Failure Scenarios

**Redis Failure:**
- Items คงอยู่ใน queue เพื่อรอประมวลผลในภายหลัง
- Dead letter queue สำหรับ items ที่ล้มเหลวถาวร
- Worker ทำงานต่อเมื่อ Redis กลับมาใช้งานได้

**RabbitMQ Failure:**
- Automatic fallback ไป direct database writes
- Connection retry with exponential backoff
- Message persistence ทำให้ไม่สูญเสียข้อมูล

**Database Failure:**
- Direct adapter แจ้ง error ทันที
- Queue adapters สามารถ buffer จนกว่า database จะกลับมา
- Health checks ตรวจจับปัญหา database

## Performance Comparison

| Adapter | Latency | Throughput | Setup Complexity | Reliability | Resource Usage |
|---------|---------|------------|------------------|-------------|----------------|
| Direct | ต่ำสุด | ปานกลาง | ง่ายสุด | ปานกลาง | ต่ำ |
| Redis | ต่ำ | สูง | ปานกลาง | สูง | ปานกลาง |
| RabbitMQ | ต่ำ | สูงสุด | ยากสุด | สูงสุด | สูง |

## Usage Recommendations

### Development Environment
```env
AUDIT_ADAPTER=direct
AUDIT_ENABLED=true
AUDIT_LOG_BODY=true  # สำหรับ debugging
```

### Staging/Testing Environment
```env
AUDIT_ADAPTER=redis
AUDIT_ENABLED=true
AUDIT_BATCH_SIZE=50
AUDIT_LOG_BODY=false
```

### Production Environment (Small to Medium)
```env
AUDIT_ADAPTER=redis
AUDIT_ENABLED=true
AUDIT_SUCCESS_ONLY=true
AUDIT_BATCH_SIZE=200
AUDIT_LOG_BODY=false
```

### Production Environment (Enterprise)
```env
AUDIT_ADAPTER=rabbitmq
AUDIT_ENABLED=true
AUDIT_SUCCESS_ONLY=true
AUDIT_WORKER_CONCURRENCY=5
AUDIT_LOG_BODY=false
```

## Security Considerations

### Data Sanitization
ระบบจะ sanitize ข้อมูลดังนี้:

**Sensitive Headers (จะถูกเปลี่ยนเป็น [REDACTED]):**
- authorization
- cookie
- x-api-key
- x-auth-token
- x-session-id

**Sensitive Body Fields (จะถูกเปลี่ยนเป็น [REDACTED]):**
- password
- password_hash
- token
- secret
- key
- credit_card
- ssn
- social_security_number

## Troubleshooting

### Common Issues

**1. Audit logs ไม่ถูกบันทึก**
- ตรวจสอบ `AUDIT_ENABLED=true`
- ตรวจสอบ route/method filtering
- ดู health check endpoint

**2. Redis adapter ทำงานช้า**
- เพิ่ม `AUDIT_BATCH_SIZE`
- ลด `AUDIT_BATCH_TIMEOUT`
- ตรวจสอบ Redis memory

**3. RabbitMQ connection ล้มเหลว**
- ตรวจสอบ `RABBITMQ_URL`
- ดู RabbitMQ management UI
- ตรวจสอบ fallback logs

### Monitoring Commands

```bash
# ตรวจสอบ Redis queue length
redis-cli LLEN audit_logs_queue

# ตรวจสอบ RabbitMQ queues
rabbitmqctl list_queues name messages

# ตรวจสอบ audit logs ใน database
SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour';
```

## Migration Guide

### จาก Direct เป็น Redis
1. เพิ่ม Redis configuration
2. เปลี่ยน `AUDIT_ADAPTER=redis`
3. Restart application
4. Monitor queue length

### จาก Redis เป็น RabbitMQ
1. Setup RabbitMQ server
2. เพิ่ม RabbitMQ configuration
3. เปลี่ยน `AUDIT_ADAPTER=rabbitmq`
4. Restart application
5. Monitor RabbitMQ management UI

## Conclusion

ระบบ Audit นี้ให้ความยืดหยุ่นสูงในการเลือกใช้ adapter ตามความต้องการและขนาดของระบบ พร้อมกับการจัดการ error และ fallback ที่แข็งแกร่ง เหมาะสำหรับการใช้งานตั้งแต่ระดับ development จนถึง enterprise production systems