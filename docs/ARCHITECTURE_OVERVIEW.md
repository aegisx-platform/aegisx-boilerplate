# 🏗️ AegisX Boilerplate - Architecture Overview

## 📋 ภาพรวมระบบ

AegisX Boilerplate เป็น **Production-Ready Fastify API** ที่ออกแบบสำหรับ **Healthcare Information Systems (HIS)** และ **ERP Applications** โดยใช้สถาปัตยกรรมแบบ **4-Layer Architecture** พร้อม **Enterprise-Grade Infrastructure**

---

## 🎯 เป้าหมายหลัก

### **Healthcare & ERP Ready**
- 🏥 **HIPAA Compliance** - audit trails, data encryption, access control
- 📊 **Enterprise Scale** - multi-tenant, high performance, scalability
- 🔒 **Security First** - JWT + RBAC, rate limiting, data sanitization
- 📈 **Production Ready** - monitoring, logging, error handling

### **Developer Experience**
- ⚡ **High Performance** - Fastify (3x faster than Express)
- 🔧 **Type Safety** - TypeScript với strict typing
- 🧪 **Testable** - comprehensive testing infrastructure
- 📚 **Well Documented** - extensive documentation

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Web Apps │ Mobile Apps │ Desktop Apps │ External APIs          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  Rate Limiting │ CORS │ Helmet │ Compression │ Request Logging   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                      ┌───────────────┐                          │
│   ┌─────────────────▶│  CORE LAYER   │◀─────────────────┐       │
│   │                  │   (plugins)   │                  │       │
│   │                  └───────────────┘                  │       │
│   │                          │                          │       │
│   ▼                          ▼                          ▼       │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │
│ │   DOMAINS   │    │  FEATURES   │    │INFRASTRUCTURE│           │
│ │ (business)  │    │(healthcare) │    │ (database)  │           │
│ └─────────────┘    └─────────────┘    └─────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL │ Redis │ RabbitMQ │ File Storage │ External APIs   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 4-Layer Architecture

### **1. 🔧 CORE LAYER** - Infrastructure Foundation

```
apps/api/src/app/core/
├── plugins/                    # Infrastructure plugins
│   ├── database/              # 🗄️ Database connections
│   │   ├── knex.ts           # PostgreSQL + migrations
│   │   └── redis.ts          # Redis caching
│   ├── security/              # 🔒 Security infrastructure
│   │   ├── jwt.ts            # JWT authentication
│   │   ├── rbac.ts           # Role-based access control
│   │   ├── helmet.ts         # Security headers
│   │   └── rate-limit.ts     # Rate limiting
│   ├── logging/               # 📝 Logging system
│   │   ├── index.ts          # Structured logging + correlation ID
│   │   ├── structured-logger.ts # Winston-based logger
│   │   └── apm-integration.ts # APM + tracing
│   ├── monitoring/            # 📊 Health & monitoring
│   │   ├── health-check.ts   # Health endpoints
│   │   └── under-pressure.ts # Load monitoring
│   ├── validation/            # ✅ Input validation
│   │   └── sensible.ts       # Request validation
│   ├── docs/                  # 📚 API documentation
│   │   └── swagger.ts        # OpenAPI 3.0
│   ├── audit.ts              # 📋 Audit system
│   ├── event-bus.ts          # 🚌 Event system
│   └── env.ts                # 🌍 Environment config
├── shared/                    # Reusable components
│   ├── audit/                # 🔍 Audit infrastructure
│   │   ├── adapters/         # Multiple audit backends
│   │   ├── factory/          # Audit adapter factory
│   │   └── interfaces/       # Type definitions
│   ├── events/               # 📡 Event bus system
│   │   ├── adapters/         # Memory, Redis, RabbitMQ
│   │   ├── middleware/       # Event middleware
│   │   └── factory/          # Event bus factory
│   ├── cache/                # 💾 Caching utilities
│   ├── middleware/           # 🔄 Common middleware
│   └── utils/                # 🛠️ Utility functions
└── workers/                   # 👷 Background workers
    ├── redis-worker.ts       # Redis audit processor
    └── rabbitmq-audit-worker.ts # RabbitMQ audit processor
```

**หน้าที่:**
- 🔌 **Plugin Management** - Fastify plugin orchestration
- 🔒 **Security Infrastructure** - Authentication, authorization, security
- 📝 **Logging & Monitoring** - Structured logging, APM, health checks
- 🗄️ **Data Access** - Database connections, caching
- 📋 **Audit System** - Comprehensive audit trails
- 🚌 **Event System** - Event-driven architecture

---

### **2. 🏢 DOMAINS LAYER** - Business Logic

```
apps/api/src/app/domains/
├── auth/                      # 🔐 Authentication domain
│   ├── controllers/          # HTTP request handlers
│   ├── services/             # Business logic
│   ├── repositories/         # Data access
│   ├── schemas/              # Request/response validation
│   ├── types/                # TypeScript interfaces
│   └── routes/               # Route definitions
├── rbac/                      # 👥 Role-based access control
│   ├── controllers/
│   ├── services/             # Permission management
│   ├── repositories/         # Role/permission data
│   └── middleware/           # Authorization middleware
├── user-management/           # 👤 User management
│   ├── controllers/
│   ├── services/             # User operations
│   ├── repositories/         # User data access
│   └── validation/           # User input validation
└── audit-log/                # 📊 Audit log management
    ├── controllers/          # Audit endpoints
    ├── services/             # Audit business logic
    ├── repositories/         # Audit data access
    └── types/                # Audit type definitions
```

**หน้าที่:**
- 🎯 **Business Rules** - Core business logic implementation
- 🔐 **Authentication** - Login, registration, token management
- 👥 **Authorization** - RBAC with `resource:action:scope` pattern
- 👤 **User Management** - User CRUD, profile management
- 📊 **Audit Management** - Audit log queries and reporting

---

### **3. 🏥 FEATURES LAYER** - Healthcare Specific

```
apps/api/src/app/features/     # Healthcare features (structured)
├── patients/                  # 👩‍⚕️ Patient management
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── schemas/
│   └── types/
├── appointments/              # 📅 Appointment scheduling
├── medical-records/           # 📋 Medical records
├── billing/                   # 💰 Billing & insurance
├── inventory/                 # 📦 Medical inventory
├── reporting/                 # 📊 Healthcare reports
├── prescriptions/             # 💊 Prescription management
└── laboratory/                # 🧪 Lab results
```

**สถานะ:** 🚧 **Structured but not implemented** - พร้อมสำหรับการพัฒนา

**หน้าที่:**
- 🏥 **Patient Care** - Patient information, medical history
- 📅 **Scheduling** - Appointment booking, calendar management  
- 📋 **Clinical Data** - Medical records, lab results, prescriptions
- 💰 **Financial** - Billing, insurance claims, payments
- 📊 **Analytics** - Healthcare reports, KPIs

---

### **4. 🗄️ INFRASTRUCTURE LAYER** - External Systems

```
apps/api/src/app/infrastructure/
├── database/                  # 🗄️ Database infrastructure
│   ├── migrations/           # Database schema migrations
│   │   ├── 001_users.ts
│   │   ├── 002_roles.ts
│   │   ├── 003_permissions.ts
│   │   └── 004_audit_logs.ts
│   ├── seeds/                # Test/demo data
│   └── knexfile.ts           # Database configuration
├── external-apis/            # 🌐 External service integration
│   ├── payment-gateway/
│   ├── insurance-api/
│   └── hl7-fhir/            # Healthcare standards
├── file-storage/             # 📁 File management
│   ├── local-storage/
│   ├── aws-s3/
│   └── azure-blob/
└── messaging/                # 📨 Message queues
    ├── rabbitmq/
    └── email-service/
```

**หน้าที่:**
- 🗄️ **Data Persistence** - Database schema, migrations
- 🌐 **External Integration** - Third-party APIs, webhooks
- 📁 **File Management** - Document storage, medical images
- 📨 **Communication** - Email, SMS, push notifications

---

## 🔄 Request Flow

### **Typical HTTP Request Journey:**

```
1. Client Request
   ├── CORS + Security Headers (Helmet)
   ├── Rate Limiting (100 req/15min)
   └── Request Logging (Correlation ID)
           │
2. Authentication & Authorization
   ├── JWT Token Validation
   ├── RBAC Permission Check
   └── User Context Setup
           │
3. Input Validation
   ├── TypeBox Schema Validation
   ├── Request Sanitization
   └── Business Rule Validation
           │
4. Business Logic (Domain Layer)
   ├── Service Layer Processing
   ├── Repository Data Access
   └── Event Publishing
           │
5. Infrastructure (Core Layer)
   ├── Database Queries (Knex)
   ├── Cache Operations (Redis)
   └── Audit Logging
           │
6. Response
   ├── Response Formatting
   ├── Response Logging
   └── Correlation ID Header
```

### **Example: Patient Record Access**

```typescript
// 1. Route Registration (Domain Layer)
fastify.get('/patients/:id', {
  preHandler: [authenticate, authorize('patients:read:own')],
  schema: getPatientSchema
}, getPatientHandler)

// 2. Request Handler (Domain Layer)
async function getPatientHandler(request: FastifyRequest, reply: FastifyReply) {
  // 3. Structured Logging (Core Layer)
  request.server.structuredLogger.audit('patient.access', {
    correlationId: request.correlationId,
    userId: request.user.id,
    patientId: request.params.id
  })

  // 4. Business Logic (Domain Layer)
  const patient = await patientService.findById(request.params.id)
  
  // 5. Event Publishing (Core Layer)
  await request.server.eventBus.publish('patient.accessed', {
    patientId: request.params.id,
    userId: request.user.id
  })

  return reply.send(patient)
}
```

---

## 📊 Database Schema

### **Current Tables (Implemented):**

```sql
-- Authentication & Users
users               # User accounts
refresh_tokens      # JWT refresh tokens

-- RBAC System  
roles               # User roles (doctor, nurse, admin)
permissions         # System permissions (patients:read:department)
user_roles          # User-role assignments
role_permissions    # Role-permission assignments

-- Audit System
audit_logs          # Comprehensive audit trail
audit_integrity     # Cryptographic integrity checks
```

### **Planned Tables (Healthcare Features):**

```sql
-- Patient Management
patients            # Patient information
patient_contacts    # Emergency contacts
patient_insurance   # Insurance information

-- Clinical Data
appointments        # Appointment scheduling
medical_records     # Medical history
prescriptions       # Medication prescriptions
lab_results        # Laboratory tests
vital_signs        # Patient vitals

-- Administrative
billing            # Billing records
payments           # Payment tracking
insurance_claims   # Insurance processing
inventory          # Medical supplies
```

---

## 🎭 Design Patterns

### **1. Plugin Architecture**
```typescript
// Fastify plugin pattern for modularity
export default fp(async function plugin(fastify: FastifyInstance) {
  // Plugin initialization
}, {
  name: 'plugin-name',
  dependencies: ['dependency1', 'dependency2']
})
```

### **2. Factory Pattern**
```typescript
// Audit adapter factory
export class AuditAdapterFactory {
  static async createFromEnv(fastify: FastifyInstance): Promise<AuditAdapter> {
    const adapter = process.env.AUDIT_ADAPTER
    switch (adapter) {
      case 'direct': return new DirectDatabaseAdapter(fastify)
      case 'redis': return new RedisAdapter(fastify)
      case 'rabbitmq': return new RabbitMQAdapter(fastify)
    }
  }
}
```

### **3. Repository Pattern**
```typescript
// Data access abstraction
export class UserRepository {
  constructor(private knex: Knex) {}
  
  async findById(id: string): Promise<User | null>
  async create(userData: CreateUserData): Promise<User>
  async update(id: string, updates: UpdateUserData): Promise<User>
}
```

### **4. Observer Pattern** 
```typescript
// Event-driven architecture
await eventBus.publish('user.created', userData)
await eventBus.subscribe('user.created', sendWelcomeEmail)
```

---

## 🚀 Technology Stack

### **Core Technologies**
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Fastify 5.2.1 (high-performance)
- **Database:** PostgreSQL 16 with Knex.js
- **Caching:** Redis 7 with connection pooling
- **Message Queue:** RabbitMQ 3.13 for enterprise messaging

### **Security & Authentication**
- **Authentication:** JWT with refresh tokens
- **Authorization:** RBAC with `resource:action:scope` model
- **Security:** Helmet, Rate limiting, CORS, Input sanitization
- **Audit:** Cryptographic audit trails with integrity checking

### **Development & Monitoring**
- **Validation:** TypeBox for schema validation
- **Documentation:** Swagger/OpenAPI 3.0
- **Logging:** Winston + Pino with structured logging
- **Monitoring:** OpenTelemetry + health checks
- **Build:** Nx monorepo with esbuild

### **Infrastructure**
- **Containerization:** Docker with health checks
- **Orchestration:** Docker Compose
- **Process Management:** PM2 ready
- **Environment:** dotenv with validation

---

## 📈 Performance Characteristics

### **Fastify Performance Benefits**
- ⚡ **3x faster** than Express.js
- 🚀 **65,000+ req/sec** capability
- 💾 **Low memory footprint**
- 🔧 **Built-in validation & serialization**

### **Caching Strategy**
- 🏪 **Redis caching** for RBAC permissions
- 💾 **In-memory caching** for static data
- 🔄 **Cache invalidation** on data updates
- ⏱️ **TTL-based expiration** (15 minutes default)

### **Database Optimization**
- 📊 **Connection pooling** (2-10 connections)
- 🗂️ **Optimized indexes** for common queries
- 🔄 **Migration system** for schema evolution
- 📋 **Query logging** for performance monitoring

---

## 🔒 Security Architecture

### **Defense in Depth**

```
┌─────────────────────────────────────────────────────┐
│                 NETWORK LAYER                       │
├─────────────────────────────────────────────────────┤
│  Firewall │ Load Balancer │ DDoS Protection         │
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│                APPLICATION LAYER                    │
├─────────────────────────────────────────────────────┤
│  Rate Limiting │ CORS │ Helmet │ Input Sanitization │
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│              AUTHENTICATION LAYER                   │
├─────────────────────────────────────────────────────┤
│  JWT Tokens │ Refresh Tokens │ Session Management   │
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│              AUTHORIZATION LAYER                    │
├─────────────────────────────────────────────────────┤
│  RBAC │ Permission Checks │ Resource Access Control │
└─────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────┐
│                  DATA LAYER                         │
├─────────────────────────────────────────────────────┤
│  Encryption │ Audit Logs │ Data Sanitization        │
└─────────────────────────────────────────────────────┘
```

### **RBAC Model**
```
Permission Format: resource:action:scope

Examples:
- patients:read:own          # Read own patients
- patients:read:department   # Read department patients  
- patients:write:all         # Write all patients
- reports:generate:hospital  # Generate hospital reports
- users:manage:department    # Manage department users
```

---

## 📋 Audit & Compliance

### **HIPAA Compliance Features**
- 📝 **Comprehensive Audit Trails** - Every data access logged
- 🔒 **Data Encryption** - At rest and in transit
- 🔐 **Access Controls** - Fine-grained permissions
- 👤 **User Attribution** - All actions tied to users
- ⏰ **Timestamping** - Precise action timing
- 🔍 **Integrity Checking** - Cryptographic verification

### **Audit Data Points**
- 👤 **Who:** User ID, name, role
- 📅 **When:** Precise timestamp with timezone  
- 🎯 **What:** Action performed, data accessed
- 📍 **Where:** IP address, user agent, location
- ❓ **Why:** Context, business justification
- 🔄 **How:** API endpoint, request details

---

## 🚀 Deployment Architecture

### **Development Environment**
```bash
# Local development stack
├── API Server (Node.js)     # Port 3000
├── PostgreSQL               # Port 5432
├── Redis                    # Port 6379
├── RabbitMQ                 # Port 5672
├── pgAdmin                  # Port 8080
└── Log Monitoring           # Port 5341 (Seq)
```

### **Production Deployment**
```yaml
# Production stack (example)
┌─────────────────────────────────────────┐
│              LOAD BALANCER              │
│            (nginx/HAProxy)              │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│              API SERVERS                │
│        (Node.js + PM2 cluster)         │
│     Server 1 │ Server 2 │ Server 3     │
└─────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────┐
│              DATA LAYER                 │
│ PostgreSQL │ Redis │ RabbitMQ │ Storage │
│  (Primary) │(Cache)│(Messages)│ (Files) │
└─────────────────────────────────────────┘
```

---

## 📊 Monitoring & Observability

### **Logging Stack**
```
Application Logs → Structured Logger (Winston) → Log Files/Streams
                                    ↓
                            Log Aggregation (Seq/Loki)
                                    ↓
                              Dashboard (Grafana)
                                    ↓
                               Alerting (PagerDuty)
```

### **Metrics Collection**
- 📊 **Application Metrics** - Request rates, response times
- 🏥 **Business Metrics** - Patient visits, appointments
- 💾 **Infrastructure Metrics** - CPU, memory, disk usage
- 🔒 **Security Metrics** - Failed logins, permission denials

### **Health Monitoring**
- ❤️ **Health Endpoints** - `/health`, `/ready`
- 🔍 **Deep Health Checks** - Database, Redis, RabbitMQ
- 📈 **Performance Monitoring** - Response times, throughput
- 🚨 **Alerting** - Threshold-based notifications

---

## 🧪 Testing Strategy

### **Test Pyramid**
```
                    ┌─────────────┐
                    │   E2E Tests │ (10%)
                    │  (Postman)  │
                    └─────────────┘
                 ┌─────────────────────┐
                 │ Integration Tests   │ (20%)
                 │   (Fastify Test)    │
                 └─────────────────────┘
            ┌─────────────────────────────────┐
            │        Unit Tests               │ (70%)
            │  (Jest + Service/Repository)    │
            └─────────────────────────────────┘
```

### **Testing Tools**
- 🧪 **Unit Tests** - Jest with TypeScript
- 🔗 **Integration Tests** - Fastify testing utilities
- 🌐 **E2E Tests** - Postman collections
- 📊 **Performance Tests** - Artillery.io
- 🔒 **Security Tests** - OWASP ZAP

---

## 🚀 Development Workflow

### **Project Structure Standards**
- 📁 **Domain-Driven Design** - Business logic organized by domain
- 🔌 **Plugin Architecture** - Modular, reusable components
- 📝 **Convention over Configuration** - Consistent patterns
- 🎯 **Separation of Concerns** - Clear layer boundaries

### **Code Quality**
- ✅ **TypeScript Strict Mode** - Type safety enforcement
- 🎨 **ESLint + Prettier** - Code formatting and linting
- 🧪 **Test Coverage** - Minimum 80% coverage requirement
- 📚 **Documentation** - Comprehensive API docs

### **Development Commands**
```bash
# Development
npm run dev                 # Start development server
npm run test               # Run test suite
npm run lint               # Check code quality
npm run build              # Production build

# Database
npm run db:migrate         # Run migrations
npm run db:seed           # Seed test data
npm run db:reset          # Reset database

# Docker
npm run docker:up         # Start all services
npm run docker:logs       # View container logs
```

---

## 🎯 Future Roadmap

### **Phase 1: Core Infrastructure (Completed)**
- ✅ Authentication & Authorization system
- ✅ Audit system with multiple adapters
- ✅ Event bus with multi-adapter support
- ✅ Structured logging with correlation tracking
- ✅ Comprehensive documentation

### **Phase 2: Healthcare Features (Next)**
- 🚧 Patient management system
- 🚧 Appointment scheduling
- 🚧 Medical records management
- 🚧 Prescription system
- 🚧 Billing & insurance integration

### **Phase 3: Advanced Features**
- 🔮 HL7 FHIR integration
- 🔮 Telemedicine support
- 🔮 Mobile app backend
- 🔮 Advanced analytics & reporting
- 🔮 Machine learning integration

### **Phase 4: Enterprise Features**
- 🔮 Multi-tenant architecture
- 🔮 Advanced security features
- 🔮 Compliance automation
- 🔮 Advanced monitoring & alerting

---

## 📚 Documentation Index

### **Technical Documentation**
- 📖 [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - This document
- 🏗️ [Folder Structure Guide](./FOLDER_STRUCTURE_GUIDE.md) - Project organization
- 📝 [Structured Logging System](./STRUCTURED_LOGGING_SYSTEM.md) - Logging architecture
- 💡 [How to Use Logging](./HOW_TO_USE_LOGGING.md) - Developer guide
- 🪶 [Lightweight Log Monitoring](./LIGHTWEIGHT_LOG_MONITORING.md) - Monitoring options
- 🚀 [Core Development Roadmap](./CORE_DEVELOPMENT_ROADMAP.md) - Development plan

### **Getting Started**
- 🚀 [Quick Start Guide](../README.md) - Setup instructions
- ⚙️ [Environment Configuration](../.env.example) - Configuration options
- 🗄️ [Database Setup](../knexfile.ts) - Database configuration
- 🐳 [Docker Setup](../docker-compose.yml) - Container orchestration

---

## 💡 Key Design Principles

### **🎯 Healthcare-First Design**
- **Compliance by Design** - HIPAA requirements built into architecture
- **Security by Default** - Multiple security layers
- **Audit Everything** - Comprehensive tracking for compliance
- **Data Privacy** - Encryption and access controls

### **⚡ Performance & Scalability**
- **Async Everything** - Non-blocking I/O operations
- **Efficient Caching** - Multi-layer caching strategy
- **Connection Pooling** - Optimized database connections
- **Event-Driven** - Loose coupling via events

### **🔧 Developer Experience**
- **Type Safety** - TypeScript throughout
- **Clear Architecture** - Well-defined layers and boundaries
- **Comprehensive Testing** - Test pyramid approach
- **Excellent Documentation** - Self-documenting code

### **🚀 Production Ready**
- **Monitoring & Observability** - Full visibility into system health
- **Error Handling** - Graceful degradation and recovery
- **Configuration Management** - Environment-based configuration
- **Deployment Ready** - Docker and cloud deployment support

---

**AegisX Boilerplate: Enterprise-grade foundation for Healthcare and ERP applications** 🏥✨