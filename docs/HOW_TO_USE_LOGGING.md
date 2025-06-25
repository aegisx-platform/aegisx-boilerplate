# 🚀 วิธีใช้งาน Structured Logging - คู่มือเริ่มต้น

## 📋 ภาพรวม: ตอนนี้มีอะไรพร้อมใช้แล้ว

### ✅ **สิ่งที่เปิดใช้งานแล้ว (ไม่ต้องติดตั้งอะไรเพิ่ม):**

1. **Structured Logging** - Winston logger พร้อม correlation ID
2. **Auto HTTP Logging** - ทุก request/response จะ log อัตโนมัติ  
3. **Healthcare Audit Integration** - เชื่อมกับระบบ audit เดิม
4. **OpenTelemetry Tracing** - auto-instrument HTTP/database calls

---

## 🎯 ตอนนี้ใช้งานได้เลย (ไม่ต้องติดตั้งอะไร)

### **1. เริ่มใช้งานทันที - ใน Route Handler**

```typescript
// apps/api/src/features/patients/routes/patients.routes.ts
export const getPatientsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  // 🆕 ใช้ structured logger ได้เลย
  request.server.structuredLogger.info('Getting patients list', {
    userId: request.user?.id,
    operation: 'patients.list',
    correlationId: request.correlationId  // Auto-generated!
  })

  try {
    const patients = await patientService.getAll()
    
    // Log successful operation
    request.server.structuredLogger.info('Patients retrieved successfully', {
      userId: request.user?.id,
      operation: 'patients.list',
      count: patients.length,
      duration: Date.now() - startTime
    })
    
    return reply.send(patients)
  } catch (error) {
    // Log error with full context
    request.server.structuredLogger.error('Failed to get patients', error, {
      userId: request.user?.id,
      operation: 'patients.list',
      correlationId: request.correlationId
    })
    
    throw error
  }
}
```

### **2. Healthcare Audit Logging**

```typescript
// ตัวอย่าง: อัพเดตข้อมูลผู้ป่วย
export const updatePatientHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId } = request.params
  const updates = request.body
  
  // 🏥 HIPAA Audit Log (เชื่อมกับ audit system เดิม)
  request.server.structuredLogger.audit('patient.update', {
    correlationId: request.correlationId,
    userId: request.user.id,
    patientId,
    operation: 'patient.update',
    metadata: {
      fieldsUpdated: Object.keys(updates),
      department: request.user.department,
      complianceLevel: 'HIPAA'
    }
  })
  
  const updatedPatient = await patientService.update(patientId, updates)
  return reply.send(updatedPatient)
}
```

### **3. Performance Metrics**

```typescript
// ตัวอย่าง: การสร้าง appointment
export const createAppointmentHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const startTime = Date.now()
  
  try {
    const appointment = await appointmentService.create(request.body)
    
    // 📊 Track business metrics
    request.server.structuredLogger.metrics('appointment.created', {
      duration: Date.now() - startTime,
      department: appointment.department,
      type: appointment.type
    }, {
      correlationId: request.correlationId,
      userId: request.user.id
    })
    
    return reply.send(appointment)
  } catch (error) {
    request.server.structuredLogger.error('Appointment creation failed', error, {
      correlationId: request.correlationId,
      duration: Date.now() - startTime
    })
    throw error
  }
}
```

---

## 📊 ดู Logs ยังไง?

### **1. Development (ตอนพัฒนา)**

```bash
# Start server
npx nx serve api

# Logs จะแสดงใน terminal แบบนี้:
2024-06-26 10:30:15 info: [abc-123-def] HTTP Request Started {
  "method": "GET",
  "url": "/api/v1/patients",
  "correlationId": "abc-123-def"
}

2024-06-26 10:30:15 info: [abc-123-def] Getting patients list {
  "userId": "doc-456",
  "operation": "patients.list",
  "correlationId": "abc-123-def"
}

2024-06-26 10:30:15 info: [abc-123-def] AUDIT: patient.update {
  "userId": "doc-456",
  "patientId": "patient-789",
  "complianceLevel": "HIPAA"
}
```

### **2. Production (ตอนใช้งานจริง)**

```bash
# เปิด file logging
LOG_FILE_ENABLED=true

# Logs จะถูกเขียนไปที่:
logs/app.log          # All logs
logs/error.log        # Error logs only
logs/exceptions.log   # System errors

# ดู logs แบบ JSON
tail -f logs/app.log | jq .
```

---

## 🔍 การติดตาม Request ด้วย Correlation ID

### **Client ส่ง Request:**

```bash
# ส่ง custom correlation ID
curl -H "x-correlation-id: my-request-123" \
     -H "Authorization: Bearer your-token" \
     http://localhost:3000/api/v1/patients/patient-456

# หรือปล่อยให้ระบบสร้างให้อัตโนมัติ
curl -H "Authorization: Bearer your-token" \
     http://localhost:3000/api/v1/patients/patient-456
```

### **ใน Logs จะเห็น:**

```json
{
  "level": "info",
  "message": "HTTP Request Started",
  "correlationId": "my-request-123",
  "method": "GET",
  "url": "/api/v1/patients/patient-456"
}

{
  "level": "info", 
  "message": "AUDIT: patient.view",
  "correlationId": "my-request-123",
  "userId": "doc-789",
  "patientId": "patient-456",
  "complianceLevel": "HIPAA"
}

{
  "level": "info",
  "message": "HTTP Request Completed", 
  "correlationId": "my-request-123",
  "statusCode": 200,
  "responseTime": 85
}
```

**ประโยชน์:** ติดตาม request เดียวกันได้ตั้งแต่เริ่มจนจบ!

---

## 🏥 Healthcare Use Cases (ใช้ได้เลย)

### **1. การเข้าถึงข้อมูลผู้ป่วย**

```typescript
export const getPatientHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId } = request.params
  
  // HIPAA requirement: บันทึกการเข้าถึงข้อมูล
  request.server.structuredLogger.audit('patient.access', {
    correlationId: request.correlationId,
    userId: request.user.id,
    patientId,
    accessType: 'view_profile',
    metadata: {
      doctorName: request.user.name,
      department: request.user.department,
      accessReason: 'medical_review'
    }
  })
  
  const patient = await patientService.findById(patientId)
  return reply.send(patient)
}
```

### **2. การให้ยา**

```typescript
export const administerMedicationHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId, medicationId, dosage } = request.body
  
  // บันทึกการให้ยา
  request.server.structuredLogger.audit('medication.administered', {
    correlationId: request.correlationId,
    userId: request.user.id,
    patientId,
    medicationId,
    metadata: {
      dosage,
      route: 'oral',
      nurseName: request.user.name,
      adminTime: new Date().toISOString(),
      witnessNurse: request.body.witnessId
    }
  })
  
  await medicationService.administer(patientId, medicationId, dosage)
  return reply.send({ success: true })
}
```

### **3. Security Events**

```typescript
export const loginHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password } = request.body
  
  try {
    const user = await authService.login(email, password)
    
    // Log successful login
    request.server.structuredLogger.business('login.success', {
      correlationId: request.correlationId,
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: request.ip
    })
    
    return reply.send({ token: user.token })
  } catch (error) {
    // Log failed login attempt
    request.server.structuredLogger.security('login.failed', {
      correlationId: request.correlationId,
      email,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      reason: 'invalid_credentials'
    })
    
    throw error
  }
}
```

---

## 📈 สำหรับ Production: Log Aggregation

### **ถ้าต้องการ Advanced Monitoring (ติดตั้งเพิ่ม):**

#### **1. ELK Stack (Elasticsearch + Logstash + Kibana)**

```bash
# 1. เปิด JSON logging
LOG_FILE_ENABLED=true
STRUCTURED_LOGGING_ENABLED=true

# 2. ติดตั้ง ELK Stack
docker-compose -f docker-compose.elk.yml up -d

# 3. Logstash จะอ่าน logs/app.log และส่งไป Elasticsearch
# 4. ใช้ Kibana dashboard ดู logs
```

#### **2. Grafana + Loki**

```bash
# 1. ติดตั้ง Loki + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# 2. Grafana จะดึง logs จาก Loki
# 3. สร้าง dashboard สำหรับ correlation ID tracking
```

#### **3. Cloud Solutions**

```bash
# AWS CloudWatch
npm install aws-sdk
# ส่ง logs ไป CloudWatch Logs

# Google Cloud Logging  
npm install @google-cloud/logging
# ส่ง logs ไป Google Cloud

# Azure Monitor
npm install @azure/monitor-opentelemetry-exporter
# ส่ง logs ไป Azure Monitor
```

---

## ⚙️ Configuration ปัจจุบัน

### **ใน .env (ที่ตั้งค่าแล้ว):**

```bash
# Structured Logging - เปิดใช้งานแล้ว
STRUCTURED_LOGGING_ENABLED=true
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=false  # เปลี่ยนเป็น true สำหรับ production

# APM Tracing - เปิดใช้งานแล้ว
APM_ENABLED=true

# Service Info
SERVICE_NAME=aegisx-api
SERVICE_VERSION=1.0.0
```

### **สำหรับ Production:**

```bash
# เปิด file logging
LOG_FILE_ENABLED=true
LOG_CONSOLE_ENABLED=false

# Environment 
NODE_ENV=production
```

---

## 🎯 สรุป: ตอนนี้ใช้ได้เลย

### **✅ พร้อมใช้ทันที (ไม่ต้องติดตั้งเพิ่ม):**
1. `request.server.structuredLogger.info()` - Basic logging
2. `request.server.structuredLogger.audit()` - Healthcare audit  
3. `request.server.structuredLogger.metrics()` - Performance tracking
4. `request.server.structuredLogger.security()` - Security events
5. `request.correlationId` - Auto correlation tracking
6. Auto HTTP request/response logging

### **🔧 ต้องติดตั้งเพิ่ม (สำหรับ Advanced):**
- ELK Stack สำหรับ log search/visualization
- Grafana + Loki สำหรับ monitoring dashboard  
- Cloud logging services สำหรับ scale

### **🏁 เริ่มใช้งาน:**

```typescript
// เพิ่มใน route handler ใดก็ได้
request.server.structuredLogger.info('Your custom message', {
  correlationId: request.correlationId,
  userId: request.user?.id,
  operation: 'your.operation',
  customData: 'your data'
})
```

**ระบบพร้อมใช้งานแล้ว! เริ่มเพิ่ม logs ใน code ได้เลย** 🚀