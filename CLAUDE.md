# Claude Context for AegisX Boilerplate

## Project Overview
AegisX Boilerplate is a production-ready Fastify API boilerplate designed for Healthcare Information Systems (HIS) and ERP applications. Built with TypeScript, PostgreSQL, and enterprise-grade infrastructure.

## Technology Stack
- **Framework**: Fastify v5.2.1 (high-performance)
- **Language**: TypeScript with strict typing
- **Database**: PostgreSQL + Knex.js for migrations/queries
- **Validation**: TypeBox for schema validation
- **Architecture**: Nx monorepo with layered architecture
- **Caching**: Redis with connection pooling
- **Message Queue**: RabbitMQ for enterprise messaging
- **Authentication**: JWT + Refresh tokens
- **Authorization**: RBAC (Role-Based Access Control)
- **Logging**: Winston structured logging with multiple adapters
- **Monitoring**: Seq and Grafana + Loki support
- **Documentation**: Swagger/OpenAPI 3.0

## Project Structure

**Following 4-Layer Architecture** (see `docs/FOLDER_STRUCTURE_GUIDE.md` for detailed guide)

### 🏗️ Layer 1: Core Layer - "Infrastructure Foundation"
```
apps/api/src/app/core/
├── 📁 plugins/          # Infrastructure plugins (database, security, validation, monitoring)
├── 📁 shared/           # Reusable components (audit, events, cache, middleware, services)
└── 📁 workers/          # Background workers (Redis, RabbitMQ)
```
**Purpose**: Infrastructure services, plugins, shared utilities
**When to use**: Database connections, security middleware, audit/event systems

### 🏢 Layer 2: Domains Layer - "Core Business Logic" ✅
```
apps/api/src/app/domains/
├── 📁 auth/             # ✅ Authentication & Registration
├── 📁 rbac/             # ✅ Role-Based Access Control  
├── 📁 user-management/  # ✅ User Profile Management
├── 📁 audit-log/        # ✅ Audit Log Management
└── 📁 storage/          # ✅ File Storage & Sharing Management
```
**Purpose**: Core business domains that every application needs
**When to use**: Authentication, user management, permissions, audit, file storage

### 🏥 Layer 3: Features Layer - "Healthcare Features" 🚧
```
apps/api/src/app/features/
├── 📁 patient-management/     # 🚧 Patient system (ready for implementation)
├── 📁 appointment-scheduling/ # 🚧 Appointment system
├── 📁 medical-records/        # 🚧 Medical records
├── 📁 billing/               # 🚧 Billing system
├── 📁 inventory/             # 🚧 Inventory management
└── 📁 reporting/             # 🚧 Reporting system
```
**Purpose**: Healthcare-specific features
**When to use**: Patient management, appointments, medical records

### 🔌 Layer 4: Infrastructure Layer - "External Services"
```
apps/api/src/app/infrastructure/
├── 📁 database/         # Migrations, seeds
├── 📁 email/           # Email service integration
├── 📁 integrations/    # Third-party API integrations
└── 📁 storage/         # File storage services
```
**Purpose**: External service integrations
**When to use**: Database schema, email services, third-party APIs

### Standard Domain Structure
Each domain/feature follows this consistent pattern:
```
domain-name/
├── 📁 controllers/      # 🎯 HTTP Request Handlers
├── 📁 services/         # 🧠 Business Logic
├── 📁 repositories/     # 🗃️ Data Access Layer
├── 📁 schemas/          # ✅ Validation & Serialization
├── 📁 types/            # 📝 TypeScript Interfaces
├── 📁 routes/           # 🛣️ Route Definitions
├── 📁 subscribers/      # 📡 Event Subscribers (optional)
└── 📄 index.ts          # 🚪 Module Entry Point
```

## Current Implementation Status

### ✅ Implemented & Ready
- JWT Authentication with refresh tokens
- RBAC system with permission model: `resource:action:scope`
- Advanced audit system with multiple adapters (Direct DB, Redis Pub/Sub, RabbitMQ)
- Structured logging system with correlation ID tracking
- Log monitoring with Seq and Grafana + Loki support
- Database schema with migrations and seeds
- Security middleware (Helmet, Rate Limiting, CORS)
- API documentation with Swagger
- Docker setup with health checks
- **Enterprise Infrastructure Services** (Complete - 15 Services):
  - **HTTP Client Service** - Retry, timeout, circuit breaker integration
  - **Secrets Manager Service** - Secure API keys and tokens handling
  - **Background Jobs System** - Async task processing
  - **Circuit Breaker Service** - Prevent cascade failures
  - **Error Tracker Service** - Centralized error handling and reporting
  - **Event Bus System** - Cross-service communication with multi-adapter support
  - **Cache Manager Service** - Multi-level caching strategy
  - **Connection Pool Manager** - DB/Redis connection optimization
  - **Config Validator Service** - Runtime configuration validation
  - **Health Check Service** - Comprehensive system monitoring
  - **Retry Service** - Exponential backoff and jitter
  - **Template Engine Service** - Email and document templates
  - **Custom Metrics Service** - Business and performance monitoring
  - **Notification Service** - Multi-channel notifications (email, SMS, push)
  - **Storage Service** - Multi-provider file storage with HIPAA compliance

### 🚧 Structured But Not Implemented
Healthcare features in `/features/` directory:
- Patient Management
- Appointment Scheduling  
- Medical Records
- Billing
- Inventory
- Reporting

## Key Systems

### Structured Logging System
- **Framework**: Winston with custom transports and formatters
- **Features**: Correlation ID tracking, structured JSON output, HIPAA compliance
- **Monitoring Options**: 
  - **Seq**: SQL-based log analysis and querying
  - **Grafana + Loki**: Cloud-native log aggregation and visualization
- **Configuration**: Environment-based logging adapter selection
- **Formats**: Clean console output for development, structured JSON for production

### Audit System
- **Adapters**: Direct Database, Redis Pub/Sub, RabbitMQ
- **Features**: Configurable filtering, data sanitization, integrity checking
- **Configuration**: Via environment variables in audit adapter factory

### RBAC System
- **Model**: `resource:action:scope` (e.g., `patients:read:department`)
- **Caching**: Redis-based permission caching
- **Integration**: Middleware for route protection

### Database Schema
**Core Tables**: users, refresh_tokens, roles, permissions, user_roles, role_permissions, audit_logs
**Notification Tables**: notifications, notification_templates, notification_batches, notification_batch_items, notification_preferences, notification_statistics, notification_errors, healthcare_notifications

## Development Commands

### Database
- `npm run db:setup` - Start PostgreSQL container
- `npm run db:migrate` - Run migrations
- `npm run db:seed` - Seed data
- `npm run db:reset` - Full reset

### Development
- `npx nx serve api` - Start development server
- `npx nx build api` - Production build
- `npx nx test api` - Run tests

### Logging Selector (Interactive Tool)
- `./scripts/logging-selector.sh` - Interactive logging solution selector
- Choose from 6 monitoring options:
  1. Seq (SQL-based analysis)
  2. Grafana + Loki (Simple)
  3. Fluent Bit + Loki (Advanced + HIPAA)
  4. Fluent Bit + Elasticsearch (Analytics)
  5. Graylog (Centralized Log Management)
  6. Graylog + Fluent Bit (Advanced + HIPAA) ⭐ Recommended for Healthcare

### Logging & Monitoring (Manual Commands)
- `docker-compose -f docker-compose.seq.yml up -d` - Start Seq log monitoring
- `docker-compose -f docker-compose.loki.yml up -d` - Start Grafana + Loki stack
- `docker-compose -f docker-compose.fluent-bit.yml up -d` - Start Fluent Bit + advanced stack
- `docker-compose -f docker-compose.graylog.yml up -d` - Start Graylog centralized logging
- `docker-compose -f docker-compose.graylog.yml --profile fluent-bit up -d` - Start Graylog + Fluent Bit
- Stop commands: Replace `up -d` with `down` for any of the above

### Access Points
- API Server: http://localhost:3000
- API Docs: http://localhost:3000/docs
- pgAdmin: http://localhost:8080
- Seq (when enabled): http://localhost:5341
- Grafana (when enabled): http://localhost:3001 (admin/admin123)
- Loki API (when enabled): http://localhost:3100
- Fluent Bit (when enabled): http://localhost:2020 (monitoring)
- Elasticsearch (optional): http://localhost:9200
- Kibana (optional): http://localhost:5601
- Graylog (when enabled): http://localhost:9000 (admin/admin)
- Graylog Elasticsearch: http://localhost:9201

## Important Files

### Project Structure & Guides
- `docs/FOLDER_STRUCTURE_GUIDE.md` - **📖 Complete folder structure guide** (must read!)
- `docs/BOILERPLATE_ROADMAP.md` - **🚀 Development roadmap and feature status** (must read!)
- `tools/cli/README.md` - **🛠️ CLI scaffolding tool documentation** (must read!)
- `docs/notification-service.md` - Notification service usage guide
- `docs/notification-database-schema.md` - Database schema documentation
- `docs/storage-database.md` - **📁 Storage database integration guide** (comprehensive storage persistence)
- `docs/storage-shared-files.md` - **🤝 Shared Files Management documentation** (collaborative file sharing with permissions)
- `docs/file-access-control-plugin.md` - **🔐 File Access Control Plugin documentation** (security middleware for file operations)

### Configuration Files
- `knexfile.ts` / `knexfile.prod.js` - Database configuration
- `docker-compose.yml` - Service orchestration
- `docker-compose.seq.yml` - Seq logging stack
- `docker-compose.loki.yml` - Grafana + Loki logging stack
- `docker-compose.fluent-bit.yml` - Fluent Bit advanced logging stack
- `docker-compose.graylog.yml` - Graylog centralized logging stack
- `.env.example` - Environment configuration template

### Core Infrastructure
- `apps/api/src/app/core/plugins/logging/` - Structured logging implementation
- `apps/api/src/app/core/shared/audit/` - Audit system implementation
- `apps/api/src/app/core/plugins/security/rbac.ts` - RBAC implementation
- `apps/api/src/app/core/plugins/security/file-access-control.ts` - **File access control middleware with caching & audit**
- `apps/api/src/app/core/shared/services/` - Enterprise infrastructure services
- `apps/api/src/app/core/shared/services/storage.service.ts` - **Enterprise storage service with database integration**
- `apps/api/src/app/domains/storage/` - **Storage domain with database persistence & shared files management**

### Monitoring & Logging
- `config/fluent-bit*.conf` - Fluent Bit configurations (simple, advanced, Graylog)
- `config/parsers.conf` - Log parsers configuration
- `config/loki-config.yml` - Loki configuration
- `config/promtail-config.yml` - Promtail configuration
- `scripts/logging-selector.sh` - Interactive logging solution selector
- `scripts/correlation.lua` - Correlation ID enhancement
- `scripts/hipaa_sanitizer.lua` - HIPAA compliance sanitization
- `scripts/graylog_formatter.lua` - Graylog GELF formatting
- `dashboards/` - Grafana dashboard definitions

## Core Infrastructure Components

### Enterprise Infrastructure Services
Complete suite of 15 production-ready services with healthcare compliance features:

#### Core Communication & Processing
- **HTTP Client Service**: `apps/api/src/app/core/shared/services/http-client.service.ts`
  - Enterprise-grade HTTP client with retry, circuit breaker, caching, and monitoring
- **Event Bus System**: `apps/api/src/app/core/shared/events/`
  - Cross-service communication with multi-adapter support (Memory, Redis, RabbitMQ)
- **Background Jobs System**: `apps/api/src/app/core/shared/services/background-jobs.service.ts`
  - Async task processing with job scheduling and queue management

#### Security & Configuration
- **Secrets Manager Service**: `apps/api/src/app/core/shared/services/secrets-manager.service.ts`
  - Secure API keys and tokens handling with encryption
- **Config Validator Service**: `apps/api/src/app/core/shared/services/config-validator.service.ts`
  - Runtime configuration validation with comprehensive rule checking

#### Resilience & Monitoring
- **Circuit Breaker Service**: `apps/api/src/app/core/shared/services/circuit-breaker.service.ts`
  - Prevent cascade failures with intelligent failure detection
- **Error Tracker Service**: `apps/api/src/app/core/shared/services/error-tracker.service.ts`
  - Centralized error handling and reporting
- **Health Check Service**: `apps/api/src/app/core/shared/services/health-check.service.ts`
  - Comprehensive system monitoring with dependency tracking
- **Retry Service**: `apps/api/src/app/core/shared/services/retry.service.ts`
  - Advanced retry mechanism with exponential backoff and jitter

#### Performance & Storage
- **Cache Manager Service**: `apps/api/src/app/core/shared/services/cache-manager.service.ts`
  - Multi-level caching strategy with Redis integration
- **Connection Pool Manager**: `apps/api/src/app/core/shared/services/connection-pool-manager.service.ts`
  - DB/Redis connection optimization with real-time monitoring
- **Storage Service**: `apps/api/src/app/core/shared/services/storage.service.ts`
  - Multi-provider file storage (Local, MinIO) with HIPAA compliance and encryption
  - **Documentation**: `docs/storage-service.md`
  - **Providers**: Local File System, MinIO (S3-compatible)

#### Business Features
- **Template Engine Service**: `apps/api/src/app/core/shared/services/template-engine.service.ts`
  - Email and document templates with healthcare helpers and caching
- **Custom Metrics Service**: `apps/api/src/app/core/shared/services/custom-metrics.service.ts`
  - Business, performance, and healthcare-specific metrics with alerting
- **Notification Service**: `apps/api/src/app/core/shared/services/notification.service.ts`
  - Multi-channel notifications (email, SMS, push) with HIPAA compliance
  - **Documentation**: `docs/notification-service.md`
  - **Database Schema**: `docs/notification-database-schema.md`

## Code Conventions

**Following standards from `docs/FOLDER_STRUCTURE_GUIDE.md`**

### File Naming
- **TypeScript Files**: `*-controller.ts`, `*-service.ts`, `*-repository.ts`, `*-schemas.ts`
- **Folders**: `kebab-case` (user-management, patient-management)
- **Classes**: `PascalCase` (AuthController, UserService)
- **Interfaces**: `PascalCase` (UserData, LoginRequest)

### Architecture
- **4-Layer Structure**: Core → Domains → Features → Infrastructure
- **Domain Pattern**: controllers → services → repositories → database
- **Event-Driven**: Use Event Bus for domain communication
- **Plugin Order**: Environment → Validation → Cache → Database → Auth → Security

### Development Guidelines

### 🔄 **Integration Patterns - ALWAYS Follow Existing Features**
**Before creating anything new, check and integrate with existing systems:**

#### Event-Driven Communication
```typescript
// ✅ DO: Use existing Event Bus system
await fastify.eventBus.publish('user.created', userData);
await fastify.eventBus.subscribe('user.created', handlerFunction);

// ❌ DON'T: Create new messaging systems
```

#### Audit & Compliance
```typescript
// ✅ DO: Use existing Audit System
await fastify.auditLog.log({
  action: 'user.create',
  resource: 'users',
  resourceId: userId,
  details: { email: user.email }
});

// ❌ DON'T: Create separate logging mechanisms
```

#### Structured Logging
```typescript
// ✅ DO: Use existing Structured Logging system
fastify.log.info('User registration completed', {
  correlationId: request.id,
  userId: user.id,
  operation: 'user.register',
  businessEvent: 'user_registration',
  metadata: { email: user.email }
});

// ❌ DON'T: Use console.log or create separate logging
```

#### Service Integration
```typescript
// ✅ DO: Use existing infrastructure services (15 available)
await fastify.notification.send('email', recipient, template, data);
await fastify.metrics.recordEvent('user_registration', metadata);
await fastify.retry.execute(operationFunction);
await fastify.circuitBreaker.execute('external-api', apiCall);
await fastify.cache.get('user:123');
await fastify.backgroundJobs.enqueue('send-email', emailData);
await fastify.storage.upload({ file: buffer, filename: 'document.pdf', mimeType: 'application/pdf' });

// ❌ DON'T: Reinvent infrastructure wheels
```

### 🏗️ **Standard Development Process**
1. **Check Existing**: Review `domains/` and `core/shared/` for existing patterns
2. **Extend, Don't Replace**: Build on existing Event Bus, Audit, Notification, and Logging systems
3. **Follow Domain Structure**: Use established `controllers → services → repositories` pattern
4. **Integrate Events**: Publish domain events for cross-domain communication
5. **Use Infrastructure**: Leverage existing metrics, retry, health-check, and logging services
6. **Create Documentation**: Always create comprehensive docs in `/docs/` directory

### 📏 **Code Standards**
- **Structure**: Each domain has: controllers, services, repositories, schemas, types, routes
- **Validation**: Use TypeBox schemas for request/response validation
- **Error Handling**: Use Fastify's error handling patterns (`fastify.httpErrors`)
- **Security**: Always validate input, sanitize audit data
- **Dependencies**: Don't import between domains directly, use Event Bus
- **Documentation**: Write JSDoc for public methods
- **Integration**: ALWAYS use existing Event Bus, Audit, Logging, and Infrastructure services

## Environment Configuration

### Logging Environment Variables
```bash
# Console & File Logging
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=true
LOG_LEVEL=info

# Seq Configuration (Optional)
SEQ_ENABLED=false
SEQ_URL=http://localhost:5341
SEQ_API_KEY=

# Service Identification
SERVICE_NAME=aegisx-api
ENVIRONMENT=development
```

### Storage Service Environment Variables
```bash
# Storage Provider Configuration
STORAGE_PROVIDER=local|minio
STORAGE_ENABLED=true

# Local Storage Configuration
STORAGE_LOCAL_BASE_PATH=./storage
STORAGE_LOCAL_PERMISSIONS=0755
STORAGE_LOCAL_MAX_FILE_SIZE=104857600  # 100MB
STORAGE_LOCAL_MAX_FILES=10000

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=aegisx-storage
MINIO_REGION=us-east-1

# Security & Encryption
STORAGE_ENCRYPTION_ENABLED=false
STORAGE_ENCRYPTION_ALGORITHM=aes-256-cbc
```

### Notification Service Environment Variables
```bash
# Notification Service Configuration
NOTIFICATION_ENABLED_CHANNELS=email,sms,push,slack
NOTIFICATION_DEFAULT_CHANNEL=email
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
NOTIFICATION_QUEUE_ENABLED=true
NOTIFICATION_QUEUE_MAX_SIZE=10000

# Rate Limiting
NOTIFICATION_RATE_LIMIT_ENABLED=true
NOTIFICATION_RATE_LIMIT_PER_MINUTE=100
NOTIFICATION_RATE_LIMIT_PER_HOUR=1000
NOTIFICATION_RATE_LIMIT_PER_DAY=10000

# Healthcare Settings
NOTIFICATION_HIPAA_COMPLIANCE=true
NOTIFICATION_ENCRYPTION_ENABLED=true
NOTIFICATION_AUDIT_LOGGING=true
```

### Logging System Selection
**Choose ONE monitoring solution:**

1. **Seq (SQL-based, good for detailed analysis)**:
   ```bash
   # Enable Seq
   SEQ_ENABLED=true
   
   # Start Seq
   docker-compose -f docker-compose.seq.yml up -d
   ```

2. **Grafana + Loki (Cloud-native, better for scaling)**:
   ```bash
   # Disable Seq
   SEQ_ENABLED=false
   
   # Start Grafana + Loki
   docker-compose -f docker-compose.loki.yml up -d
   ```

## Healthcare Context
This is designed for healthcare applications requiring:
- HIPAA compliance considerations
- Comprehensive audit trails
- Role-based access for healthcare roles
- Scalable architecture for enterprise healthcare systems

## Recent Development Focus
- **✅ CLI Scaffolding Tool**: Complete healthcare-focused code generator with templates
- **✅ Storage Database Integration**: Complete database persistence layer for storage service with 5-table schema
- **✅ Shared Files Management**: Complete collaborative file sharing with granular permissions, user management, and revocation
- **✅ File Access Control Plugin**: Security middleware with ownership & permission validation, caching, and audit integration
- **Enterprise Infrastructure Foundation**: Complete suite of 15 production-ready services
- **Event-Driven Architecture**: Multi-adapter Event Bus (Memory, Redis, RabbitMQ) with middleware support
- **Comprehensive Audit System**: Multi-adapter audit logging (Direct DB, Redis Pub/Sub, RabbitMQ)
- **Notification Service**: Multi-channel notifications with HIPAA compliance and template system
- **Infrastructure Services**: Connection Pool, Config Validator, Health Check, Retry, Metrics, Template Engine
- **Healthcare Compliance**: HIPAA-compliant audit trails, encryption, and data sanitization
- **Database Schema**: 13-table system (8 notification + 5 storage) with comprehensive relationships
- **Monitoring & Logging**: Structured logging with Seq/Grafana + Loki support
- **Developer Experience**: CLI tool for rapid domain/feature/service generation
- **Integration Patterns**: Established patterns for extending existing features vs. creating new ones

## Next Priority Areas
**See `docs/BOILERPLATE_ROADMAP.md` for complete development roadmap**

### **Phase 1: Developer Experience (Priority 1)**
1. **Testing Infrastructure**: Test utilities, factories, fixtures for boilerplate
2. ✅ **CLI Scaffolding Tool**: Generate domains, features, services automatically (`tools/cli/`)
3. **Getting Started Guide**: Complete developer onboarding documentation
4. **Development Environment**: Docker + VS Code integration

### **Phase 2: Production Readiness (Priority 2)**
5. **API Versioning System**: Structured API versioning (v1, v2)
6. **Security Enhancements**: Rate limiting per user/role, data encryption
7. **Performance Monitoring**: APM integration and performance metrics
8. **Deployment Configurations**: Kubernetes, Terraform, CI/CD templates

### **Later: Healthcare Features**
9. **Healthcare Features**: Build on existing foundation when boilerplate is complete

## Key Integration Points
**When developing new features, ALWAYS integrate with these 15 available services:**

### Core Services (Must Use)
- 🔄 **Event Bus**: Cross-domain communication (`fastify.eventBus`)
- 📊 **Audit System**: Compliance logging (`fastify.auditLog`) 
- 📝 **Structured Logging**: Application logging (`fastify.log` with context)
- 🏥 **Health Checks**: System monitoring (`fastify.healthCheck`)

### Communication & Processing
- 🔗 **HTTP Client**: External APIs (`fastify.httpClient`)
- 📧 **Notification Service**: User communications (`fastify.notification`)
- ⚙️ **Background Jobs**: Async processing (`fastify.backgroundJobs`)

### Resilience & Performance
- 🔄 **Retry Service**: Resilient operations (`fastify.retry`)
- ⚡ **Circuit Breaker**: Failure prevention (`fastify.circuitBreaker`)
- 🗄️ **Cache Manager**: Multi-level caching (`fastify.cache`)
- 🔗 **Connection Pool**: DB/Redis optimization (`fastify.connectionPool`)

### Monitoring & Security
- 📈 **Metrics Service**: Business monitoring (`fastify.metrics`)
- ❌ **Error Tracker**: Error handling (`fastify.errorTracker`)
- 🔐 **Secrets Manager**: Secure credentials (`fastify.secrets`)
- ✅ **Config Validator**: Runtime validation (`fastify.configValidator`)

### File Storage & Templates
- 📄 **Template Engine**: Email/document templates (`fastify.templates`)
- 📁 **Storage Service**: File storage with HIPAA compliance (`fastify.storage`)

---

## 📝 Important Development Notes

### 🔄 **Always Update CLAUDE.md**
**เมื่อมี feature ใหม่ ให้อัพเดท CLAUDE.md เสมอ:**

1. **เพิ่ม Services ใหม่** → อัพเดท "Enterprise Infrastructure Services"
2. **เพิ่ม Domains ใหม่** → อัพเดท "Domains Layer" 
3. **เพิ่ม Features ใหม่** → อัพเดท "Features Layer"
4. **เพิ่ม Integration Points** → อัพเดท "Key Integration Points"
5. **เพิ่ม Environment Variables** → อัพเดท "Environment Configuration"
6. **เพิ่ม Documentation** → อัพเดท "Important Files"

### 📋 **Documentation Checklist**
เมื่อสร้าง feature ใหม่:
- [ ] **สร้าง Documentation** → `docs/feature-name.md` เสมอ
- [ ] อัพเดท CLAUDE.md 
- [ ] เพิ่ม fastify decorator ใน Key Integration Points
- [ ] เพิ่ม usage example ใน Integration Patterns
- [ ] อัพเดท file locations ใน Important Files
- [ ] เพิ่ม environment variables ถ้ามี
- [ ] อัพเดท Recent Development Focus
- [ ] **อัพเดทสถานะใน BOILERPLATE_ROADMAP.md**
- [ ] **เพิ่มลิงก์ documentation** ใน Important Files section

### 📖 **Documentation Standards**
**ทุก feature ต้องมี documentation ใน `/docs/` เสมอ:**

```
docs/
├── feature-name.md              # 📋 Complete usage guide
├── feature-name-database.md     # 🗄️ Database schema (ถ้ามี)
├── feature-name-api.md          # 🔗 API endpoints (ถ้ามี)
└── feature-name-integration.md  # 🔄 Integration guide (ถ้าจำเป็น)
```

**Documentation ต้องประกอบด้วย:**
- ✅ Overview และ Features
- ✅ Installation และ Configuration  
- ✅ Usage Examples พร้อมโค้ด
- ✅ API Endpoints (ถ้ามี)
- ✅ Environment Variables
- ✅ Healthcare Compliance features (ถ้ามี)
- ✅ Troubleshooting
- ✅ Best Practices