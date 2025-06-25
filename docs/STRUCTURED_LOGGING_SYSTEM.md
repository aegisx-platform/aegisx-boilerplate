# 📝 Structured Logging System - Documentation

## 📋 ภาพรวมระบบ

AegisX Boilerplate ได้เพิ่มระบบ **Structured Logging** ที่ครอบคลุมสำหรับ Healthcare Applications พร้อม **APM (Application Performance Monitoring)** และ **Correlation ID Tracking** เพื่อใช้งานใน production environment

---

## 🎯 จุดประสงค์และประโยชน์

### **เหตุผลที่ต้องเพิ่ม Structured Logging:**

**ปัญหาของ Pino เพียงอย่างเดียว:**
- ❌ ไม่มี **Correlation ID** tracking
- ❌ ไม่มี **Structured metadata** ที่เชื่อมโยง
- ❌ ไม่มี **APM/Tracing** integration  
- ❌ ไม่มี **Business metrics** collection
- ❌ ไม่เป็นมาตรฐาน **HIPAA compliance**

**ประโยชน์ที่ได้รับ:**
- 🔍 **Debug ง่าย** - ติดตาม request ตั้งแต่เริ่มจนจบ
- 📋 **HIPAA Compliance** - audit trail ที่สมบูรณ์
- 🏥 **Healthcare Critical** - ติดตาม patient data access
- ⚡ **Performance Monitoring** - หา bottlenecks
- 🔗 **Service Dependencies** - เห็น service calls
- 📈 **Production Debugging** - real-time insights

---

## 🏗️ สถาปัตยกรรมระบบ

### **1. Core Components**

```
apps/api/src/app/core/plugins/logging/
├── index.ts                    # หลัก Plugin + Correlation ID middleware
├── structured-logger.ts        # Winston-based structured logger
└── apm-integration.ts         # OpenTelemetry APM integration
```

### **2. Plugin Architecture**

```typescript
// Core Plugin Pipeline
const corePlugins = async (fastify) => {
  await fastify.register(env)                    // 1. Environment variables
  await fastify.register(sensible)               // 2. Sensible defaults
  await fastify.register(structuredLogging)      // 3. ✨ Structured Logging
  await fastify.register(apmIntegration)         // 4. ✨ APM Integration
  await fastify.register(redis)                  // 5. Redis connection
  await fastify.register(knex)                   // 6. Database connection
  // ... other plugins
  await fastify.register(audit)                  // 🔗 Integrated with logging
}
```

### **3. Correlation ID Flow**

```
Client Request → Fastify → Correlation Middleware → Structured Logger → Audit System
     ↓              ↓              ↓                      ↓                ↓
x-correlation-id → Auto-generate → Set context → Log with ID → HIPAA audit
```

---

## 📊 Technical Implementation

### **1. Environment Configuration**

**ใหม่ที่เพิ่มเข้ามา:**
```bash
# Structured Logging
STRUCTURED_LOGGING_ENABLED=true
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=false
LOG_CORRELATION_HEADER=x-correlation-id

# Service Information
SERVICE_NAME=aegisx-api
SERVICE_VERSION=1.0.0

# APM (Application Performance Monitoring)
APM_ENABLED=false
APM_SERVICE_NAME=aegisx-api
APM_SERVICE_VERSION=1.0.0
APM_METRICS_PORT=9090
```

### **2. Dependencies เพิ่มเติม**

```json
{
  "dependencies": {
    "winston": "^3.17.0",
    "correlation-id": "^5.2.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/auto-instrumentations-node": "^0.60.1",
    "@opentelemetry/exporter-prometheus": "^0.202.0",
    "@opentelemetry/sdk-node": "^0.202.0",
    "@opentelemetry/semantic-conventions": "^1.34.0"
  }
}
```

### **3. Logger Interface**

```typescript
export interface LogContext {
  correlationId?: string
  userId?: string
  operation?: string
  duration?: number
  statusCode?: number
  resource?: string
  // ... healthcare specific fields
  complianceLevel?: string
  auditAction?: string
  metadata?: Record<string, any>
}

export class StructuredLogger {
  info(message: string, context: LogContext): void
  error(message: string, error?: Error, context: LogContext): void
  audit(action: string, context: LogContext): void
  metrics(metricName: string, value: number | object, context: LogContext): void
  security(event: string, context: LogContext): void
  business(event: string, context: LogContext): void
  health(component: string, status: 'healthy' | 'unhealthy' | 'degraded', context: LogContext): void
}
```

---

## 🚀 การใช้งานในโค้ด

### **1. Basic HTTP Request Logging (อัตโนมัติ)**

```typescript
// Middleware จะ log อัตโนมัติ
// ✅ HTTP Request Started - พร้อม correlation ID
// ✅ HTTP Request Completed - พร้อม response time
// ✅ HTTP Request Error - พร้อม error details
```

### **2. Healthcare Audit Logging**

```typescript
export const updatePatientHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { patientId } = request.params as { patientId: string }
  
  // HIPAA compliant audit
  request.server.structuredLogger.audit('patient.update', {
    correlationId: request.correlationId,    // Auto-generated
    userId: request.user.id,
    patientId,
    operation: 'patient.update',
    metadata: {
      fieldsUpdated: ['phone', 'address'],
      complianceLevel: 'HIPAA',
      department: request.user.department
    }
  })
  
  // การทำงานปกติ...
}
```

### **3. Performance Metrics**

```typescript
export const createAppointmentHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const startTime = Date.now()
  
  try {
    const appointment = await appointmentService.create(appointmentData)
    
    // Track business metrics
    request.server.structuredLogger.metrics('appointment.created', {
      duration: Date.now() - startTime,
      department: appointmentData.department
    }, {
      correlationId: request.correlationId,
      userId: request.user.id
    })
    
    return reply.send(appointment)
  } catch (error) {
    request.server.structuredLogger.error('Appointment creation failed', error, {
      correlationId: request.correlationId,
      operation: 'appointment.create'
    })
    throw error
  }
}
```

### **4. Security Event Logging**

```typescript
export const loginHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const user = await authService.login(email, password)
    
    request.server.structuredLogger.business('user.login.success', {
      correlationId: request.correlationId,
      userId: user.id,
      role: user.role,
      ip: request.ip
    })
    
  } catch (error) {
    // Security event
    request.server.structuredLogger.security('login.failed', {
      correlationId: request.correlationId,
      email,
      ip: request.ip,
      reason: 'invalid_credentials'
    })
    throw error
  }
}
```

---

## 🔗 Integration กับ Audit System

### **ระบบเดิม + ระบบใหม่**

```typescript
// Audit Plugin Integration
await registerAuditMiddleware(fastify, {
  // การตั้งค่าเดิม...
  onAuditEvent: (auditData: any, request: any) => {
    // 🆕 Integration กับ Structured Logging
    if (fastify.structuredLogger) {
      fastify.structuredLogger.audit(auditData.action, {
        correlationId: request?.correlationId,
        userId: auditData.userId,
        operation: auditData.action,
        resource: auditData.resourceType,
        metadata: {
          auditId: auditData.id,
          complianceLevel: 'HIPAA'
        }
      })
    }
  }
})
```

**ผลลัพธ์:**
- ✅ Audit logs ยังไปที่ database ตามเดิม (Redis/RabbitMQ)
- ✅ **เพิ่มเติม** structured logs พร้อม correlation ID
- ✅ เชื่อมโยงระหว่าง audit events และ HTTP requests
- ✅ HIPAA compliance ที่สมบูรณ์ยิ่งขึ้น

---

## 📈 APM และ Monitoring

### **1. OpenTelemetry Integration**

```typescript
// APM Configuration
export interface APMConfig {
  enabled: boolean
  serviceName: string
  serviceVersion: string
  environment: string
  metricsPort: number  // Prometheus metrics
}

// การใช้งาน
const apm = new APMIntegration({
  enabled: true,
  serviceName: 'aegisx-api',
  serviceVersion: '1.0.0',
  environment: 'production',
  metricsPort: 9090
})
```

### **2. Prometheus Metrics**

```bash
# Production deployment
APM_ENABLED=true
APM_METRICS_PORT=9090

# Metrics endpoint
curl http://localhost:9090/metrics
```

### **3. Health Check Integration**

```typescript
request.server.structuredLogger.health('database', 'healthy', {
  correlationId: request.correlationId,
  responseTime: dbResponseTime
})
```

---

## 🏥 Healthcare Use Cases

### **1. Patient Data Access Tracking**

```typescript
// HIPAA Requirement: ติดตามการเข้าถึงข้อมูลผู้ป่วย
request.server.structuredLogger.audit('patient.record.access', {
  correlationId: request.correlationId,
  userId: request.user.id,
  patientId,
  accessType: 'full_record',
  department: request.user.department,
  metadata: {
    doctorName: request.user.name,
    accessReason: 'medical_review'
  }
})
```

### **2. Medical Procedure Logging**

```typescript
// การบันทึกหัตถการทางการแพทย์
request.server.structuredLogger.audit('medical.procedure.complete', {
  correlationId: request.correlationId,
  userId: request.user.id,
  patientId,
  procedureType: 'surgery',
  duration: procedureDuration,
  outcome: 'successful'
})
```

### **3. Medication Administration**

```typescript
// การบันทึกการให้ยา
request.server.structuredLogger.audit('medication.administered', {
  correlationId: request.correlationId,
  userId: request.user.id,
  patientId,
  medicationId,
  dosage: '500mg',
  metadata: {
    nurseName: request.user.name,
    adminTime: new Date().toISOString(),
    route: 'oral',
    witnessNurse: witnessNurseId
  }
})
```

---

## 🔍 Log Output Examples

### **1. Development (Human Readable)**

```bash
2024-06-26 10:30:15 info: [abc-123-def] HTTP Request Started {
  "method": "POST",
  "url": "/api/v1/patients",
  "correlationId": "abc-123-def"
}

2024-06-26 10:30:15 info: [abc-123-def] AUDIT: patient.create {
  "userId": "doc-456",
  "operation": "patient.create",
  "complianceLevel": "HIPAA"
}
```

### **2. Production (JSON Structured)**

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

### **3. Error Tracking**

```json
{
  "level": "error",
  "message": "Failed to update patient record",
  "correlationId": "req-error-123",
  "error": {
    "name": "ValidationError",
    "message": "Invalid patient ID format",
    "stack": "ValidationError: Invalid..."
  },
  "userId": "doc-789",
  "operation": "patient.update",
  "timestamp": "2024-06-26T10:30:15.123Z"
}
```

---

## 🚀 Production Deployment

### **1. Environment Setup**

```bash
# Production .env
NODE_ENV=production
STRUCTURED_LOGGING_ENABLED=true
LOG_CONSOLE_ENABLED=false
LOG_FILE_ENABLED=true

# APM Monitoring
APM_ENABLED=true
APM_METRICS_PORT=9090

# Service Info
SERVICE_NAME=aegisx-api
SERVICE_VERSION=1.2.3
```

### **2. Log Files Location**

```bash
logs/
├── app.log          # All application logs
├── error.log        # Error logs only
├── exceptions.log   # Unhandled exceptions
└── rejections.log   # Promise rejections
```

### **3. Monitoring Endpoints**

```bash
# Health check with structured logging
GET /health

# Prometheus metrics (if APM enabled)
GET http://localhost:9090/metrics

# Swagger documentation
GET /docs
```

---

## 📊 Comparison: Before vs After

| **Feature** | **Before (Pino only)** | **After (Structured + APM)** |
|-------------|-------------------------|------------------------------|
| **Request Tracking** | ❌ ไม่มี correlation | ✅ Full correlation ID tracking |
| **HIPAA Compliance** | ⚠️ Basic audit only | ✅ Comprehensive audit trail |
| **Production Debug** | ❌ ยาก ไม่เชื่อมโยง | ✅ Easy tracing with correlation |
| **Performance Monitor** | ❌ ไม่มี metrics | ✅ APM + Prometheus metrics |
| **Healthcare Specific** | ❌ ไม่มี | ✅ Patient data access tracking |
| **Error Tracking** | ⚠️ Basic error logs | ✅ Structured error with context |
| **Business Metrics** | ❌ ไม่มี | ✅ Appointment, procedure metrics |
| **Integration** | ❌ แยกส่วน | ✅ Integrated ทุกระบบ |

---

## 🎯 Best Practices

### **1. Correlation ID Guidelines**
- ✅ ใช้ header เดียวกัน: `x-correlation-id`
- ✅ Auto-generate หากไม่มี
- ✅ ส่งต่อไปยัง external services
- ✅ Include ใน error messages

### **2. Logging Levels**
- **audit()** - การเข้าถึงข้อมูลผู้ป่วย, การแก้ไขข้อมูลสำคัญ
- **metrics()** - เวลาประมวลผล, จำนวน appointments
- **security()** - Login failures, unauthorized access
- **business()** - สถิติการใช้งาน, workflow events
- **health()** - System component status

### **3. HIPAA Compliance**
- ✅ ทุก patient data access ต้องมี audit log
- ✅ Include user ID, timestamp, และ access reason
- ✅ Store audit logs แยกจาก application logs
- ✅ Correlation ID เพื่อ investigation

### **4. Performance Considerations**
- ✅ ใช้ async logging (Winston transports)
- ✅ Limit log file size ใน production
- ✅ Structured JSON สำหรับ log aggregation
- ✅ Enable APM เฉพาะใน production

---

## 🔧 Troubleshooting

### **1. Common Issues**

**Q: Correlation ID ไม่แสดง**
```typescript
// ตรวจสอบว่า plugin ถูก register ก่อน routes
await fastify.register(structuredLogging)  // ต้องมาก่อน
await fastify.register(routes)             // routes ที่ใช้ logger
```

**Q: APM metrics ไม่ทำงาน**
```bash
# ตรวจสอบ configuration
APM_ENABLED=true
APM_METRICS_PORT=9090

# ตรวจสอบ port ว่าง
lsof -i :9090
```

**Q: Logs ไม่เขียนไฟล์**
```bash
# สร้าง logs directory
mkdir -p logs
chmod 755 logs

# Enable file logging
LOG_FILE_ENABLED=true
```

### **2. Testing**

```bash
# Test correlation ID
curl -H "x-correlation-id: test-123" http://localhost:3000/health

# Test APM metrics  
curl http://localhost:9090/metrics

# Test structured logs
tail -f logs/app.log | jq .
```

---

## 📚 สรุป

### **สิ่งที่ได้รับ:**
1. ✅ **Production-Ready Logging** - พร้อม correlation tracking
2. ✅ **HIPAA Compliance** - สำหรับ healthcare applications  
3. ✅ **APM Integration** - performance monitoring
4. ✅ **Audit Enhancement** - เชื่อมโยงกับระบบ audit เดิม
5. ✅ **Healthcare Specific** - patient data access tracking
6. ✅ **Developer Experience** - easy debugging with correlation IDs

### **Ready for Production:**
- 🚀 Comprehensive logging system
- 📊 Performance monitoring
- 🏥 Healthcare compliance
- 🔗 Full request traceability
- 📈 Business metrics tracking

**ระบบ Structured Logging ขั้นสูงสำหรับ Healthcare Applications พร้อมใช้งานแล้ว!** 🎉