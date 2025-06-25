# 📝 Structured Logging Usage Guide

## 🚀 วิธีใช้งาน Structured Logging + APM ที่เพิ่งสร้าง

### 🔧 **การเปิดใช้งาน**

#### 1. **Environment Variables**
```bash
# .env ไฟล์
STRUCTURED_LOGGING_ENABLED=true
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=false
LOG_CORRELATION_HEADER=x-correlation-id

# APM Monitoring (เปิดใน production)
APM_ENABLED=false
APM_METRICS_PORT=9090
```

#### 2. **Start Server**
```bash
npx nx serve api
```

---

## 📊 **การใช้งานใน Code**

### **1. Basic Logging**
```typescript
// ใน Route Handler
export const getUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string }
  
  // Auto correlation ID tracking
  request.server.structuredLogger.info('Getting user profile', {
    userId: id,
    operation: 'user.get',
    correlationId: request.correlationId  // Auto-generated
  })
  
  try {
    const user = await userService.findById(id)
    
    request.server.structuredLogger.info('User profile retrieved successfully', {
      userId: id,
      operation: 'user.get',
      duration: 150
    })
    
    return reply.send(user)
  } catch (error) {
    request.server.structuredLogger.error('Failed to get user profile', error, {
      userId: id,
      operation: 'user.get'
    })
    throw error
  }
}
```

### **2. Healthcare Audit Logging**
```typescript
// HIPAA Compliant Audit
export const updatePatientHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId } = request.params as { patientId: string }
  const updates = request.body as PatientUpdate
  
  // Healthcare audit logging
  request.server.structuredLogger.audit('patient.update', {
    userId: request.user.id,
    patientId,
    operation: 'patient.update',
    metadata: {
      fieldsUpdated: Object.keys(updates),
      complianceLevel: 'HIPAA',
      department: request.user.department
    }
  })
  
  const updatedPatient = await patientService.update(patientId, updates)
  
  return reply.send(updatedPatient)
}
```

### **3. Performance Metrics**
```typescript
// Business metrics tracking
export const createAppointmentHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const startTime = Date.now()
  const appointmentData = request.body as CreateAppointmentRequest
  
  try {
    const appointment = await appointmentService.create(appointmentData)
    
    // Track business metrics
    request.server.structuredLogger.metrics('appointment.created', {
      duration: Date.now() - startTime,
      department: appointmentData.department,
      appointmentType: appointmentData.type
    }, {
      userId: request.user.id,
      operation: 'appointment.create'
    })
    
    return reply.send(appointment)
  } catch (error) {
    request.server.structuredLogger.error('Failed to create appointment', error, {
      operation: 'appointment.create',
      duration: Date.now() - startTime
    })
    throw error
  }
}
```

### **4. Security Event Logging**
```typescript
// Security monitoring
export const loginHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password } = request.body as LoginRequest
  
  try {
    const user = await authService.login(email, password)
    
    // Log successful login
    request.server.structuredLogger.business('user.login.success', {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: request.ip
    })
    
    return reply.send({ token: user.token })
  } catch (error) {
    // Security event - failed login
    request.server.structuredLogger.security('login.failed', {
      email,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      reason: 'invalid_credentials'
    })
    
    throw error
  }
}
```

### **5. Health Check Integration**
```typescript
// Health monitoring
export const healthCheckHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const dbHealth = await checkDatabaseHealth()
  const redisHealth = await checkRedisHealth()
  
  if (dbHealth.status === 'healthy' && redisHealth.status === 'healthy') {
    request.server.structuredLogger.health('system', 'healthy', {
      database: dbHealth.responseTime,
      redis: redisHealth.responseTime
    })
    
    return reply.send({ status: 'healthy' })
  } else {
    request.server.structuredLogger.health('system', 'unhealthy', {
      database: dbHealth.status,
      redis: redisHealth.status
    })
    
    return reply.status(503).send({ status: 'unhealthy' })
  }
}
```

---

## 🔍 **การดู Logs**

### **1. Console Logs (Development)**
```bash
# Logs จะแสดงใน terminal พร้อม correlation ID
2024-06-26 10:30:15 info: [abc-123-def] HTTP Request Started {
  "method": "POST",
  "url": "/api/v1/patients",
  "userAgent": "Mozilla/5.0...",
  "ip": "127.0.0.1",
  "correlationId": "abc-123-def"
}

2024-06-26 10:30:15 info: [abc-123-def] AUDIT: patient.create {
  "userId": "doc-456",
  "operation": "patient.create",
  "complianceLevel": "HIPAA",
  "correlationId": "abc-123-def"
}
```

### **2. JSON Logs (Production)**
```json
{
  "level": "info",
  "message": "AUDIT: patient.view",
  "correlationId": "req-789-xyz",
  "userId": "doc-123",
  "operation": "patient.view",
  "patientId": "patient-456",
  "complianceLevel": "HIPAA",
  "timestamp": "2024-06-26T10:30:15.123Z",
  "service": "aegisx-api",
  "environment": "production"
}
```

### **3. APM Metrics**
```bash
# เมื่อเปิด APM_ENABLED=true
# Prometheus metrics จะพร้อมใช้งานที่:
curl http://localhost:9090/metrics
```

---

## 🏥 **Healthcare Use Cases**

### **1. Patient Data Access Tracking**
```typescript
// ติดตามการเข้าถึงข้อมูลผู้ป่วย
export const getPatientRecordHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId } = request.params as { patientId: string }
  
  // HIPAA audit requirement
  request.server.structuredLogger.audit('patient.record.access', {
    userId: request.user.id,
    patientId,
    accessType: 'full_record',
    department: request.user.department,
    sessionId: request.headers['x-session-id'],
    metadata: {
      doctorName: request.user.name,
      accessReason: request.query.reason || 'medical_review'
    }
  })
  
  const record = await patientService.getFullRecord(patientId)
  return reply.send(record)
}
```

### **2. Medical Procedure Logging**
```typescript
// การบันทึกหัตถการทางการแพทย์
export const performProcedureHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId, procedureType } = request.body as ProcedureRequest
  
  request.server.structuredLogger.audit('medical.procedure.start', {
    userId: request.user.id,
    patientId,
    procedureType,
    metadata: {
      startTime: new Date().toISOString(),
      doctor: request.user.name,
      room: request.body.roomNumber
    }
  })
  
  // Perform procedure...
  
  request.server.structuredLogger.audit('medical.procedure.complete', {
    userId: request.user.id,
    patientId,
    procedureType,
    duration: Date.now() - startTime,
    outcome: 'successful'
  })
}
```

### **3. Medication Administration**
```typescript
// การบันทึกการให้ยา
export const administerMedicationHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId, medicationId, dosage } = request.body as MedicationRequest
  
  request.server.structuredLogger.audit('medication.administered', {
    userId: request.user.id,
    patientId,
    medicationId,
    dosage,
    metadata: {
      nurseName: request.user.name,
      adminTime: new Date().toISOString(),
      route: request.body.route, // oral, IV, etc.
      witnessNurse: request.body.witnessId
    }
  })
}
```

---

## 🔍 **Correlation ID Tracking**

### **1. Client-Side (ส่ง Correlation ID)**
```typescript
// Frontend request
const response = await fetch('/api/v1/patients', {
  headers: {
    'Content-Type': 'application/json',
    'x-correlation-id': 'frontend-req-12345', // Optional custom ID
    'Authorization': `Bearer ${token}`
  },
  method: 'POST',
  body: JSON.stringify(patientData)
})
```

### **2. Automatic Correlation ID**
```typescript
// หาก client ไม่ส่ง correlation ID มา system จะสร้างให้อัตโนมัติ
// และส่งกลับใน response header

// Response headers:
// x-correlation-id: auto-generated-uuid-12345
```

---

## 📊 **Production Monitoring**

### **1. เปิดใช้งาน APM**
```bash
# .env สำหรับ production
APM_ENABLED=true
APM_SERVICE_NAME=aegisx-api
APM_SERVICE_VERSION=1.0.0
APM_METRICS_PORT=9090
```

### **2. Metrics Endpoints**
```bash
# Prometheus metrics
curl http://localhost:9090/metrics

# Application health with structured logging
curl http://localhost:3000/health
```

### **3. Log Aggregation**
```bash
# สำหรับ production ให้เปิด file logging
LOG_FILE_ENABLED=true

# Logs จะถูกเขียนไปที่:
# logs/app.log - Application logs
# logs/error.log - Error logs
# logs/exceptions.log - Unhandled exceptions
# logs/rejections.log - Promise rejections
```

---

## 🎯 **Best Practices**

### **1. เมื่อไหร่ควรใช้ .audit()**
- การเข้าถึงข้อมูลผู้ป่วย
- การแก้ไขข้อมูลสำคัญ
- การให้ยาหรือหัตถการทางการแพทย์
- การ login/logout ของเจ้าหน้าที่

### **2. เมื่อไหร่ควรใช้ .metrics()**
- เวลาประมวลผลที่สำคัญ
- จำนวน appointments ต่อวัน
- การใช้งาน resources
- Performance bottlenecks

### **3. เมื่อไหร่ควรใช้ .security()**
- Login attempts ที่ล้มเหลว
- การเข้าถึงข้อมูลที่ไม่ได้รับอนุญาต
- Suspicious activities
- Rate limiting events

### **4. Correlation ID Guidelines**
- ใช้ header เดียวกัน: `x-correlation-id`
- ส่งต่อไปยัง external services
- Include ใน error messages
- Use เพื่อติดตาม request ตั้งแต่เริ่มจนจบ

---

**ระบบ Structured Logging พร้อมใช้งานแล้ว พร้อม HIPAA compliance และ production-grade monitoring!** 🚀