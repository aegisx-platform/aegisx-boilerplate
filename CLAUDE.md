# Claude Context for AegisX Boilerplate

## Project Overview
AegisX Boilerplate is a production-ready Fastify API boilerplate designed for Healthcare Information Systems (HIS) and ERP applications. Built with TypeScript, PostgreSQL, and enterprise-grade infrastructure.

## Technology Stack
- **Framework**: Fastify v5.2.1 (high-performance API) + Angular 20 (frontend)
- **Language**: TypeScript with strict typing (dual setup: Node.js + Browser)
- **Database**: PostgreSQL + Knex.js for migrations/queries
- **Validation**: TypeBox for schema validation
- **Architecture**: Nx monorepo with layered architecture (apps/ + libs/)
- **Frontend**: Angular 20 with standalone components
- **UI Framework**: PrimeNG 20 RC + Angular CDK + custom CSS utilities
- **Shared Libraries**: Type-safe communication between frontend/backend
- **Caching**: Redis with connection pooling
- **Message Queue**: RabbitMQ for enterprise messaging
- **Authentication**: JWT + Refresh tokens + API Keys
- **Authorization**: RBAC (Role-Based Access Control)
- **Logging**: Winston structured logging with multiple adapters
- **Monitoring**: Seq and Grafana + Loki support
- **Documentation**: Swagger/OpenAPI 3.0
- **Image Processing**: Sharp.js for comprehensive image operations

## Project Structure

**Nx Monorepo with 4-Layer Architecture** (see `docs/folder_structure_guide.md` for detailed guide)

### 🎯 **Nx Monorepo Structure**
```
workspace-root/
├── apps/                    # 🎯 Applications (executable projects)
│   ├── api/                # ✅ Fastify API Server (Node.js)
│   ├── web/                # ✅ Angular 20 Frontend (Browser)
│   └── api-e2e/            # ✅ API End-to-End Tests
├── libs/                    # 📚 Shared Libraries (reusable code)
│   └── shared/
│       ├── types/          # ✅ TypeScript interfaces (@aegisx-boilerplate/types)
│       └── api-client/     # ✅ Type-safe API client (@aegisx-boilerplate/api-client)
├── docs/                    # 📖 Documentation
└── tools/                   # 🛠️ Development tools
```

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
├── 📁 storage/          # ✅ File Storage & Sharing Management
└── 📁 notification/     # ✅ Multi-Channel Notification System
```
**Purpose**: Core business domains that every application needs
**When to use**: Authentication, user management, permissions, audit, file storage, notifications

### 🏥 Layer 3: Features Layer - "Advanced Business Features" ✅
```
apps/api/src/app/domains/
├── 📁 reports/              # ✅ Report Builder System (Low-Code Report Generation)
├── 📁 patient-management/   # 🚧 Patient system (ready for implementation)
├── 📁 appointment-scheduling/ # 🚧 Appointment system  
├── 📁 medical-records/      # 🚧 Medical records
├── 📁 billing/             # 🚧 Billing system
├── 📁 inventory/           # 🚧 Inventory management
└── 📁 healthcare-workflows/ # 🚧 Healthcare-specific workflows
```
**Purpose**: Advanced business and healthcare-specific features
**When to use**: Report generation, business intelligence, patient management, appointments, medical records

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

### 🏢 Enterprise Domain Examples

#### **📨 Notification Domain** (✅ Complete Enterprise Implementation)
```
notification/
├── controllers/
│   ├── notification-controller.ts   # ✅ Core notification operations
│   └── batch-controller.ts          # ✅ Dedicated batch processing controller
├── routes/
│   ├── notification-routes.ts       # ✅ Core notification API routes
│   └── batch.routes.ts              # ✅ Batch processing API routes (10 endpoints)
├── schemas/
│   ├── notification.schemas.ts      # ✅ TypeBox validation schemas
│   └── batch.schemas.ts             # ✅ Batch validation schemas (no conflicts)
├── types/
│   ├── notification-domain.types.ts # ✅ Core TypeScript interfaces
│   └── batch.types.ts               # ✅ Batch processing TypeScript interfaces
├── services/
│   ├── notification-database-service.ts # ✅ Core database service
│   ├── queue-notification-service.ts    # ✅ Queue processing with Bull/RabbitMQ
│   └── batch-worker.service.ts          # ✅ Enterprise batch processing (752 lines)
└── repositories/
    └── notification-repository.ts       # ✅ Data access layer
```

**🎯 Key Features:**
- **✅ Enterprise Domain Architecture**: Standard controller → service → repository pattern
- **✅ Separated Concerns**: Core notifications vs batch processing with clean boundaries
- **✅ Type Safety**: Complete TypeScript coverage with proper interface separation
- **✅ Bull + RabbitMQ Integration**: Production-ready queue system with unified interface
- **✅ Batch Processing**: 4 batch types (bulk, user, scheduled, priority) with optimized concurrency
- **✅ Multi-Channel Support**: Email, SMS, Push, Slack, Webhook, In-App notifications
- **✅ Healthcare Compliance**: HIPAA audit trails, encryption, data sanitization
- **✅ Auto Processing**: Configurable automatic processing every 30-60 seconds
- **✅ Production Ready**: Successfully built and tested TypeScript implementation

#### **🔑 Auth Domain** (Reference Implementation)
```
auth/
├── controllers/
│   ├── auth-controller.ts           # Authentication operations
│   └── api-key-controller.ts        # API key management
├── routes/
│   ├── auth-routes.ts               # Auth API routes
│   └── api-key.routes.ts            # API key routes
├── schemas/
│   ├── auth-schemas.ts              # Auth validation
│   └── api-key.schemas.ts           # API key validation
└── types/
    ├── auth-types.ts                # Auth TypeScript interfaces
    └── api-key.types.ts             # API key interfaces
```

### ✨ **Benefits of This Architecture**
- **✅ Single Responsibility**: Each component has one clear purpose
- **✅ Maintainable**: Easy to locate and modify specific functionality
- **✅ Scalable**: Simple to extend domains with new features (like batch processing)
- **✅ Type-Safe**: Complete TypeScript coverage with proper interface separation
- **✅ Testable**: Clean separation enables focused unit testing
- **✅ Consistent**: Every domain follows the same proven patterns

## Current Implementation Status

### ✅ Implemented & Ready

#### **🌐 Full-Stack Application**
- **✅ Angular 20 Frontend** - Complete setup with standalone components in `apps/web/`
- **✅ Fastify API Backend** - Production-ready API server in `apps/api/`
- **✅ Nx Monorepo** - Proper workspace structure with apps/ and libs/
- **✅ Shared Libraries** - Type-safe communication with `@aegisx-boilerplate/types` and `@aegisx-boilerplate/api-client`
- **✅ TypeScript Configuration** - Dual setup for Node.js (CommonJS) + Angular (ES modules)
- **✅ Development Workflow** - npm scripts for start, build, test, lint (see DEVELOPMENT_GUIDE.md)

#### **🔐 Authentication & Security**
- **JWT Authentication** with refresh tokens
- **API Key Authentication** with dual expiration strategy (cron + Redis TTL)
- **Dual Authentication Support**: API keys work alongside JWT authentication
- RBAC system with permission model: `resource:action:scope`
- Security middleware (Helmet, Rate Limiting, CORS)

#### **🏗️ Infrastructure & Monitoring**
- Advanced audit system with multiple adapters (Direct DB, Redis Pub/Sub, RabbitMQ)
- Structured logging system with correlation ID tracking
- Log monitoring with Seq and Grafana + Loki support
- Database schema with migrations and seeds
- API documentation with Swagger
- Docker setup with health checks
- **✅ Notification System** - Complete multi-channel notification service with Gmail SMTP support and Bull/RabbitMQ queue processing
- **✅ Bull + RabbitMQ Queue System** - Production-ready queue system with unified interface supporting both Redis (Bull) and RabbitMQ brokers
- **Enterprise Infrastructure Services** (Complete - 16 Services):
  - **HTTP Client Service** - Retry, timeout, circuit breaker integration
  - **Secrets Manager Service** - Secure API keys and tokens handling
  - **Bull + RabbitMQ Queue System** - Production-ready queue processing with unified interface, monitoring, and admin dashboard
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
  - **Image Processing Service** - Comprehensive Sharp.js integration with storage system
  - **WebSocket Service** - Real-time communication with connection management and channel subscriptions

#### **✅ Report Builder System**
- **Low-Code Report Generation** - Template-based report creation with multi-data source support
- **Multi-Data Source Support** - PostgreSQL, MySQL, MongoDB, REST APIs, Files
- **URL-Based Generation** - Public report access with parameter filtering
- **Multi-Format Export** - HTML, PDF, Excel, CSV, JSON, Images
- **Template Management** - Versioning, duplication, search functionality
- **Background Processing** - Async generation with job scheduling
- **Real-time Features** - WebSocket integration for live updates and progress tracking
- **Caching Strategy** - Redis-based performance optimization

### 🚧 Structured But Not Implemented
Healthcare features ready for implementation:
- Patient Management
- Appointment Scheduling  
- Medical Records
- Billing
- Inventory

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
- **API Key Permissions**: Full CRUD permissions for API key management
  - `api_keys:create:own` - Create own API keys (user, manager, admin)
  - `api_keys:read:own` - View own API keys (user, manager, admin)
  - `api_keys:update:own` - Update own API keys (user, manager, admin)
  - `api_keys:delete:own` - Delete own API keys (user, manager, admin)
  - `api_keys:read:all` - View all API keys (manager, admin)
  - `api_keys:delete:all` - Delete any API keys (admin only)

### Bull + RabbitMQ Queue System
- **Brokers**: Bull Queue (Redis) for high throughput, RabbitMQ for enterprise messaging
- **Features**: Unified interface, job scheduling, priority queues, dead letter queues, monitoring
- **Configuration**: Environment-based broker selection (`QUEUE_BROKER=redis` or `rabbitmq`)
- **Monitoring**: Admin dashboard, metrics collection, health checks, Prometheus export
- **Integration**: Powers QueueNotificationService for automatic processing and rate limiting

### Notification System (Enterprise Domain Architecture)
- **Domain Structure**: Standard enterprise domain pattern with separated concerns
- **Primary Service**: `QueueNotificationService` with automatic processing every 30 seconds
- **Features**: Multi-channel support, priority-based processing, automatic retry with exponential backoff
- **Queue Integration**: Bull + RabbitMQ for reliable message delivery
- **Healthcare Compliance**: HIPAA audit trails, encryption, data sanitization
- **Gmail SMTP**: Production-ready email delivery with App Password support
- **⚡ Batch Processing Architecture**: Clean separation with dedicated components
  - **BatchController**: `batch-controller.ts` - Dedicated controller for batch operations
  - **Batch Routes**: `batch.routes.ts` - Separated API routes with comprehensive Swagger
  - **Batch Schemas**: `batch.schemas.ts` - TypeBox validation schemas
  - **Batch Types**: `batch.types.ts` - Complete TypeScript interfaces
  - **BatchWorkerService**: `batch-worker.service.ts` - Enterprise batch processing (800+ lines)
  - **4 Batch Types**: bulk_notification, user_batch, scheduled_batch, priority_batch
  - **Channel Optimization**: Email(10), SMS(5), Push(15), Slack(3) concurrent processing
  - **Standard Architecture**: Follows same patterns as auth, storage, rbac domains

### Report Builder System (Complete Domain Implementation)
- **Domain Structure**: Standard enterprise domain pattern with controllers, services, repositories
- **Multi-Data Source Support**: PostgreSQL, MySQL, MongoDB, REST APIs, File uploads
- **Template Management**: Versioning, duplication, search with comprehensive metadata
- **Report Generation**: Background processing with WebSocket progress tracking
- **Public Access**: URL-based report sharing with parameter filtering
- **Export Formats**: HTML, PDF, Excel, CSV, JSON, PNG, JPG with format-specific options
- **Caching Strategy**: Redis-based template and data caching for performance
- **Real-time Updates**: WebSocket integration for live data streaming and notifications
- **8-Table Schema**: Complete database schema for templates, instances, data sources, analytics

### Database Schema
**Core Tables**: users, refresh_tokens, roles, permissions, user_roles, role_permissions, audit_logs
**Notification Tables**: notifications, notification_templates, notification_batches, notification_batch_items, notification_preferences, notification_statistics, notification_errors, healthcare_notifications
**Storage Tables**: storage_files, storage_access_permissions, storage_shared_files, storage_usage_analytics, storage_file_versions
**Report Tables**: report_data_sources, report_templates, report_parameters, report_instances, report_schedules, report_exports, report_shares, report_analytics

## Development Commands

### Full-Stack Development
- `npm start` - Start both API + Angular (parallel development)
- `npm run start:api` - Start API server only (port 3000)
- `npm run start:web` - Start Angular app only (port 4200)
- `npm run build` - Build both API + Angular
- `npm run build:api` - Build API only
- `npm run build:web` - Build Angular only
- `npm run build:libs` - Build shared libraries

### Database
- `npm run db:setup` - Start PostgreSQL container
- `npm run db:dev:migrate` - Run migrations (development)
- `npm run db:dev:seed` - Seed data (development)
- `npm run db:migrate` - Run migrations (production)
- `npm run db:seed` - Seed data (production)
- `npm run db:reset` - Full reset

### Code Quality
- `npm test` - Run tests for all projects
- `npm run test:api` - Test API only
- `npm run test:web` - Test Angular only
- `npm run lint` - Lint all projects
- `npm run typecheck` - TypeScript type checking
- `npm run format` - Format code with Prettier

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
- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs
- **Angular Frontend**: http://localhost:4200
- **pgAdmin**: http://localhost:8080
- **Seq** (when enabled): http://localhost:5341
- **Grafana** (when enabled): http://localhost:3001 (admin/admin123)
- **Loki API** (when enabled): http://localhost:3100
- **Fluent Bit** (when enabled): http://localhost:2020 (monitoring)
- **Elasticsearch** (optional): http://localhost:9200
- **Kibana** (optional): http://localhost:5601
- **Graylog** (when enabled): http://localhost:9000 (admin/admin)
- **Graylog Elasticsearch**: http://localhost:9201

## Important Files

### Project Structure & Guides
- `docs/feature-summary.md` - **📋 Complete feature overview and summary** (must read!)
- `docs/folder_structure_guide.md` - **📖 Complete folder structure guide** (must read!)
- `docs/BOILERPLATE_ROADMAP.md` - **🚀 Development roadmap and feature status** (must read!)
- `docs/typescript-configuration-guide.md` - **🔧 TypeScript Configuration Guide** (dual setup for Node.js + Angular environments)
- `DEVELOPMENT_GUIDE.md` - **🚀 Complete development workflow guide** (npm scripts, testing, troubleshooting)
- `tools/cli/README.md` - **🛠️ CLI scaffolding tool documentation** (must read!)
- `docs/api-key-authentication.md` - **🔑 API Key Authentication documentation** (enterprise API key management with dual expiration strategy)
- `docs/api-key-testing-guide.md` - **🧪 API Key Testing Guide** (complete testing examples and troubleshooting)
- `docs/notification-service.md` - Notification service usage guide
- `docs/notification-database-schema.md` - Database schema documentation
- `docs/bull-rabbitmq-queue-system.md` - **⚡ Bull + RabbitMQ Queue System documentation** (production-ready queue system with unified interface)
- `docs/storage-database.md` - **📁 Storage database integration guide** (comprehensive storage persistence)
- `docs/storage-shared-files.md` - **🤝 Shared Files Management documentation** (collaborative file sharing with permissions)
- `docs/file-access-control-plugin.md` - **🔐 File Access Control Plugin documentation** (security middleware for file operations)
- `docs/websocket-service.md` - **🌐 WebSocket Service documentation** (complete real-time communication system with connection management)
- `docs/thumbnail-generation.md` - **🖼️ Thumbnail Generation Service documentation** (automatic image thumbnail creation with Sharp)
- `docs/image-processing-service.md` - **🎨 Image Processing Service documentation** (comprehensive Sharp.js integration with storage system)
- `docs/features/report-builder.md` - **📊 Report Builder System documentation** (low-code report generation with multi-data source support)

### Configuration Files

#### TypeScript Configuration (Nx Monorepo)
- `tsconfig.base.json` - **Base TypeScript configuration** shared by all projects (generic for both Node.js + Angular)
- `apps/api/tsconfig.app.json` - **API-specific config** (Node.js with CommonJS modules)
- `apps/web/tsconfig.app.json` - **Angular-specific config** (Browser with ES modules)
- `libs/shared/types/tsconfig.lib.json` - **Shared types library config**
- `libs/shared/api-client/tsconfig.lib.json` - **API client library config**

#### Database & Services
- `knexfile.ts` / `knexfile.prod.js` - Database configuration
- `docker-compose.yml` - Service orchestration
- `docker-compose.seq.yml` - Seq logging stack
- `docker-compose.loki.yml` - Grafana + Loki logging stack
- `docker-compose.fluent-bit.yml` - Fluent Bit advanced logging stack
- `docker-compose.graylog.yml` - Graylog centralized logging stack
- `.env.example` - Environment configuration template

### Core Infrastructure

#### API Backend (Fastify)
- `apps/api/src/app/core/plugins/logging/` - Structured logging implementation
- `apps/api/src/app/core/shared/audit/` - Audit system implementation
- `apps/api/src/app/core/plugins/security/rbac.ts` - RBAC implementation
- `apps/api/src/app/core/plugins/security/jwt.ts` - **JWT & API Key dual authentication plugin**
- `apps/api/src/app/core/plugins/security/file-access-control.ts` - **File access control middleware with caching & audit**
- `apps/api/src/app/core/shared/services/` - Enterprise infrastructure services
- `apps/api/src/app/core/shared/services/storage.service.ts` - **Enterprise storage service with database integration**
- `apps/api/src/app/core/shared/services/image-processing.service.ts` - **Image Processing Service with Sharp.js integration**
- `apps/api/src/app/core/shared/services/bull-queue.service.ts` - **Bull Queue Service (Redis) with enterprise features**
- `apps/api/src/app/core/shared/services/rabbitmq-queue.service.ts` - **RabbitMQ Queue Service with advanced routing**
- `apps/api/src/app/core/shared/services/queue-monitoring.service.ts` - **Unified queue monitoring with metrics and health checks**

#### Angular Frontend
- `apps/web/src/app/app.ts` - **Main Angular application component**
- `apps/web/src/styles.scss` - **Global styles with PrimeNG theming**
- `apps/web/proxy.conf.json` - **Development proxy configuration for API calls**

#### Shared Libraries
- `libs/shared/types/src/lib/` - **Type-safe interfaces shared between frontend/backend**
- `libs/shared/api-client/src/lib/` - **Type-safe API client for Angular frontend**
- `apps/api/src/app/domains/notification/` - **📨 Notification domain with standard architecture**
  - `controllers/notification-controller.ts` - Core notification operations controller
  - `controllers/batch-controller.ts` - **⚡ Dedicated batch processing controller**
  - `routes/notification-routes.ts` - Core notification API routes
  - `routes/batch.routes.ts` - **⚡ Batch processing API routes**
  - `schemas/notification.schemas.ts` - TypeBox schemas for notifications
  - `schemas/batch.schemas.ts` - **⚡ TypeBox schemas for batch operations**
  - `services/batch-worker.service.ts` - **⚡ Enterprise batch processing service**
  - `types/notification-domain.types.ts` - Core notification TypeScript types
  - `types/batch.types.ts` - **⚡ Batch processing TypeScript types**
- `apps/api/src/app/core/shared/factories/queue.factory.ts` - **Queue factory for creating Bull/RabbitMQ instances**
- `apps/api/src/app/core/shared/interfaces/queue.interface.ts` - **Common queue interface for unified API**
- `apps/api/src/app/core/shared/routes/queue-admin.routes.ts` - **Admin API routes for queue management**
- `apps/api/src/app/domains/auth/` - **Authentication domain with JWT & API key support**
- `apps/api/src/app/domains/storage/` - **Storage domain with database persistence & shared files management**
- `apps/api/src/app/domains/storage/controllers/storage-image-controller.ts` - **Image processing API controller**
- `apps/api/src/app/domains/reports/` - **📊 Report Builder domain with complete implementation**
  - `controllers/report-template-controller.ts` - Report template management controller
  - `controllers/report-generation-controller.ts` - Report generation and export controller
  - `controllers/report-data-source-controller.ts` - Data source management controller
  - `routes/report-template-routes.ts` - Template management API routes
  - `routes/report-generation-routes.ts` - Report generation API routes
  - `routes/report-data-source-routes.ts` - Data source API routes
  - `routes/report-websocket-routes.ts` - **🌐 WebSocket routes for real-time features**
  - `services/report-template-service.ts` - Template management business logic
  - `services/report-generation-service.ts` - Report generation and export service
  - `services/report-data-source-service.ts` - Data source connection service

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
Complete suite of 20+ production-ready services with healthcare compliance features:

#### Core Communication & Processing
- **HTTP Client Service**: `apps/api/src/app/core/shared/services/http-client.service.ts`
  - Enterprise-grade HTTP client with retry, circuit breaker, caching, and monitoring
- **Event Bus System**: `apps/api/src/app/core/shared/events/`
  - Cross-service communication with multi-adapter support (Memory, Redis, RabbitMQ)
- **Bull + RabbitMQ Queue System**: `apps/api/src/app/core/shared/services/`
  - Production-ready queue system with Bull (Redis) and RabbitMQ support
  - Unified interface for consistent API across both brokers
  - Job scheduling, priorities, retry logic, and dead letter queues
  - Comprehensive monitoring with metrics, health checks, and admin dashboard
  - **Documentation**: `docs/bull-rabbitmq-queue-system.md`

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
  - **Thumbnail Generation**: Automatic image thumbnail creation with Sharp library
  - **Documentation**: `docs/storage-service.md`
  - **Thumbnail Documentation**: `docs/thumbnail-generation.md`
  - **Providers**: Local File System, MinIO (S3-compatible)

#### Business Features
- **Template Engine Service**: `apps/api/src/app/core/shared/services/template-engine.service.ts`
  - Email and document templates with healthcare helpers and caching
- **Custom Metrics Service**: `apps/api/src/app/core/shared/services/custom-metrics.service.ts`
  - Business, performance, and healthcare-specific metrics with alerting
- **Queue Notification Service**: `apps/api/src/app/domains/notification/services/queue-notification-service.ts`
  - Enterprise notification system with Bull + RabbitMQ queue integration
  - **Documentation**: `docs/notification-service.md`
  - **Automatic Processing**: Processes notifications every 30 seconds with priority-based delays
  - **Multi-Channel Support**: Email, SMS, push, webhook, Slack, in-app
  - **Queue Integration**: Bull (Redis) or RabbitMQ broker selection
  - **Priority Processing**: Critical → Urgent → High → Normal → Low
  - **Retry Logic**: Exponential backoff with configurable attempts
  - **Gmail SMTP**: Production-ready email delivery with App Password support
  - **Rate Limiting**: Distributed Redis-based rate limiting across service instances
  - **Database Schema**: 8-table comprehensive notification system
  - **Healthcare Compliance**: HIPAA audit trails, encryption, data sanitization

## Code Conventions

**Following standards from `docs/folder_structure_guide.md`**

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
// ✅ DO: Use existing infrastructure services (16 available)
await fastify.notification.send('email', recipient, template, data);
await fastify.metrics.recordEvent('user_registration', metadata);
await fastify.retry.execute(operationFunction);
await fastify.circuitBreaker.execute('external-api', apiCall);
await fastify.cache.get('user:123');
// Modern Queue System (Bull + RabbitMQ)
const queue = await QueueFactory.create({ broker: 'redis', name: 'notifications' });
await queue.add('send-email', emailData);
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

### API Key Authentication Environment Variables
```bash
# Expiration Strategy Configuration
API_KEY_EXPIRATION_STRATEGY=hybrid  # cronjob|redis_ttl|hybrid
API_KEY_CRONJOB_ENABLED=true
API_KEY_REDIS_TTL_ENABLED=true

# Cron Job Configuration
API_KEY_CLEANUP_SCHEDULE="0 2 * * *"  # 2 AM daily
API_KEY_CLEANUP_BATCH_SIZE=100

# Redis TTL Configuration
API_KEY_REDIS_CHANNEL=api_key_expiration
API_KEY_PRE_EXPIRATION_HOURS=24

# Security & Limits
API_KEY_MAX_PER_USER=10
API_KEY_DEFAULT_RATE_LIMIT=1000
API_KEY_MAX_RATE_LIMIT=10000
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

# Automatic Processing Configuration
NOTIFICATION_AUTO_PROCESS_ENABLED=true
NOTIFICATION_PROCESS_INTERVAL=30s
NOTIFICATION_REDIS_DB=1

# Queue Broker Selection (redis or rabbitmq)
QUEUE_BROKER=redis

# Rate Limiting
NOTIFICATION_RATE_LIMIT_ENABLED=true
NOTIFICATION_RATE_LIMIT_PER_MINUTE=100
NOTIFICATION_RATE_LIMIT_PER_HOUR=1000
NOTIFICATION_RATE_LIMIT_PER_DAY=10000
NOTIFICATION_REDIS_RATE_LIMIT=true
NOTIFICATION_RATE_LIMIT_WINDOW=60000
NOTIFICATION_RATE_LIMIT_MAX=100

# Healthcare Settings
NOTIFICATION_HIPAA_COMPLIANCE=true
NOTIFICATION_ENCRYPTION_ENABLED=true
NOTIFICATION_AUDIT_LOGGING=true

# Batch Processing Configuration (High-Volume Processing)
BATCH_WORKER_ENABLED=true
BATCH_WORKER_CONCURRENCY=5
BATCH_SIZE=50
BATCH_PROCESSING_INTERVAL=60s
BATCH_QUEUE_BROKER=redis
BATCH_REDIS_DB=2
BATCH_MAX_RETRY_ATTEMPTS=3

# Channel-Specific Concurrency Settings
BATCH_EMAIL_CONCURRENCY=10
BATCH_SMS_CONCURRENCY=5
BATCH_PUSH_CONCURRENCY=15
BATCH_SLACK_CONCURRENCY=3

# Batch Monitoring & Optimization
BATCH_MONITORING_ENABLED=true
BATCH_AUTO_COLLECTION_ENABLED=true
BATCH_USER_BATCH_MIN_SIZE=3
BATCH_PRIORITY_THRESHOLD=100
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
- **✅ Full-Stack Angular Integration**: Complete Angular 20 frontend integration with Nx monorepo
  - **✅ Angular 20 Setup**: Standalone components architecture in `apps/web/`
  - **✅ TypeScript Dual Configuration**: Separate configs for Node.js (API) and Angular (Frontend)
  - **✅ Shared Libraries**: Type-safe communication with `@aegisx-boilerplate/types` and `@aegisx-boilerplate/api-client`
  - **✅ Development Workflow**: npm scripts for parallel development of API + Frontend
  - **✅ Nx Monorepo Structure**: Proper workspace structure with apps/ and libs/
  - **✅ PrimeNG Integration**: UI framework setup with custom styling
  - **✅ Build Success**: Both API and Angular build and run successfully
  - **✅ Documentation Complete**: DEVELOPMENT_GUIDE.md and TypeScript configuration guide
- **✅ Notification Domain Architecture Complete**: Enterprise-standard domain structure with build success
  - **✅ Domain Separation**: Clean separation of batch processing from core notifications
  - **✅ Standard Structure**: Controllers, routes, schemas, types following domain patterns
  - **✅ BatchController**: Dedicated `batch-controller.ts` separated from notification controller
  - **✅ Batch Schemas**: Complete TypeBox validation schemas with `BatchErrorResponseSchema` (no conflicts)
  - **✅ Batch Types**: Full TypeScript interfaces in `batch.types.ts`
  - **✅ Clean Architecture**: Single responsibility principle with maintainable code structure
  - **✅ Type Safety**: Complete TypeScript coverage with proper interface separation
  - **✅ Build Success**: All TypeScript compilation errors resolved, production-ready
  - **✅ Consistent Patterns**: Matches auth, storage, rbac domain architecture standards
- **✅ Notification Batch Processing System**: High-volume bulk notification processing
  - **✅ BatchWorkerService**: Dedicated enterprise-grade batch processing service (800+ lines)
  - **✅ 4 Batch Types**: bulk_notification, user_batch, scheduled_batch, priority_batch
  - **✅ Automatic Collection**: Collects notifications every 60 seconds for optimal bulk processing
  - **✅ Channel Optimization**: Email(10), SMS(5), Push(15), Slack(3) concurrent processing
  - **✅ Priority Batching**: Fast-track processing for critical/urgent notifications
  - **✅ User-Aware Batching**: Respects user quiet hours and notification preferences
  - **✅ Separate Queue**: Dedicated Redis DB (DB=2) for batch operations
  - **✅ Comprehensive API**: 10 REST endpoints with full Swagger documentation
  - **✅ Environment Config**: 16+ batch configuration variables
  - **✅ Documentation**: Updated notification-service.md with batch processing guide
- **✅ Queue Notification Service**: Enterprise notification system with automatic processing
  - **✅ QueueNotificationService**: Enhanced notification service with Bull + RabbitMQ integration
  - **✅ Automatic Processing**: Notifications processed every 30 seconds with priority-based delays
  - **✅ Priority Queue**: Critical → Urgent → High → Normal → Low processing order
  - **✅ Queue Integration**: Seamless integration with Bull (Redis) and RabbitMQ brokers
  - **✅ Retry Logic**: Exponential backoff with configurable retry attempts
  - **✅ Gmail SMTP**: Working email delivery with App Password authentication
  - **✅ Monitoring**: Queue metrics, health checks, and processing statistics
  - **✅ Graceful Shutdown**: Proper resource cleanup and job completion
  - **✅ Environment Config**: Comprehensive environment variables for queue settings
  - **✅ Documentation**: Updated notification-service.md with automatic processing guide
- **✅ Bull + RabbitMQ Queue System**: Production-ready queue system replacing Background Jobs Service
  - **✅ Unified Interface**: Single API supporting both Bull (Redis) and RabbitMQ brokers
  - **✅ Bull Queue Service**: High-performance Redis-based queue with job scheduling and recurring jobs
  - **✅ RabbitMQ Service**: Enterprise message broker with exchanges and dead letter queues
  - **✅ Queue Monitoring**: Unified dashboard with metrics, health checks, and Prometheus export
  - **✅ Admin API**: Complete REST API for queue management, job retry, and cleanup
  - **✅ Configuration**: Environment-based broker selection (`QUEUE_BROKER=redis|rabbitmq`)
  - **✅ Documentation**: Comprehensive documentation with setup guides and usage examples
- **✅ WebSocket Service**: Complete real-time communication system for enterprise applications
  - **✅ Core Infrastructure**: Enterprise-grade WebSocket plugin with connection management and channel subscriptions
  - **✅ Report Integration**: Real-time report progress tracking, live data streaming, and system notifications
  - **✅ Connection Management**: Automatic cleanup, health monitoring, and user-specific messaging
  - **✅ Channel System**: Topic-based message routing with subscription management
  - **✅ Enterprise Features**: Authentication integration, error handling, and structured logging
  - **✅ API Endpoints**: `/ws`, `/ws/health`, `/reports/progress/:id`, `/reports/stream/:id`, `/reports/notifications`
  - **✅ Complete Documentation**: Comprehensive usage guide with JavaScript examples and testing instructions
- **✅ Report Builder System**: Complete low-code report generation system with enterprise features
  - **✅ Domain Implementation**: Full enterprise domain structure with controllers, services, repositories
  - **✅ Multi-Data Source Support**: PostgreSQL, MySQL, MongoDB, REST APIs, File uploads
  - **✅ Template Management**: Versioning, duplication, search with comprehensive metadata
  - **✅ Report Generation**: Background processing with job scheduling and status tracking
  - **✅ Public Access**: URL-based report sharing with parameter filtering and security
  - **✅ Multi-Format Export**: HTML, PDF, Excel, CSV, JSON, PNG, JPG with format-specific options
  - **✅ Real-time Features**: WebSocket integration for live updates and progress tracking
  - **✅ Caching Strategy**: Redis-based template and data caching for performance optimization
  - **✅ 8-Table Database Schema**: Complete database schema for templates, instances, data sources, analytics
  - **✅ Production Ready**: Full TypeScript implementation with build success
  - **✅ Documentation**: Comprehensive documentation with usage examples and best practices
- **✅ Image Processing Service**: Complete Sharp.js image processing integration with storage system
  - **✅ Comprehensive Operations**: Resize, crop, rotate, filters, color adjustments, watermarking
  - **✅ Format Conversion**: JPEG, PNG, WebP, AVIF, TIFF support with quality controls
  - **✅ Healthcare Compliance**: HIPAA-compliant metadata stripping and audit logging
  - **✅ Storage Integration**: Full integration with existing authentication and file access control
  - **✅ API Endpoints**: 5 comprehensive endpoints for processing, conversion, optimization, metadata
  - **✅ Parameter Validation**: Robust error handling for invalid parameters and type mismatches
  - **✅ Intelligent Operations**: Smart skipping of invalid operations (tiny crops, oversized watermarks)
  - **✅ Multi-step Processing**: Proper sequencing of resize → crop → filters → watermark operations
  - **✅ Production Ready**: Tested and working with comprehensive error handling
  - **✅ Documentation**: Complete usage guide with real-world use cases and industry examples
  - **✅ Use Case Library**: 20+ practical examples covering healthcare, business, e-commerce, social media
- **✅ Thumbnail Generation Service**: Complete image thumbnail generation with Sharp library
  - **✅ Optional Generation**: User can choose whether to generate thumbnails
  - **✅ Custom Sizes**: Support for custom thumbnail sizes and configurations
  - **✅ API Integration**: Full integration with Storage API and multipart uploads
  - **✅ Documentation**: Comprehensive usage guide with examples
- **✅ API Key Authentication**: Enterprise API key management with dual expiration strategy (cron + Redis TTL), comprehensive security features, and full infrastructure integration
  - **✅ RBAC Integration**: Added API key permissions to RBAC seed data
  - **✅ Permission Fix**: Resolved missing `api_keys:create:own` permission issue
  - **✅ Testing Guide**: Created comprehensive API key testing documentation
- **✅ CLI Scaffolding Tool**: Complete healthcare-focused code generator with templates
- **✅ Storage Database Integration**: Complete database persistence layer for storage service with 5-table schema
- **✅ Shared Files Management**: Complete collaborative file sharing with granular permissions, user management, and revocation
- **✅ File Access Control Plugin**: Security middleware with ownership & permission validation, caching, and audit integration
- **Enterprise Infrastructure Foundation**: Complete suite of 16 production-ready services
- **Event-Driven Architecture**: Multi-adapter Event Bus (Memory, Redis, RabbitMQ) with middleware support
- **Comprehensive Audit System**: Multi-adapter audit logging (Direct DB, Redis Pub/Sub, RabbitMQ)
- **✅ Redis Automatic Notification Processing**: Complete Redis-based automatic notification processing with Bull + RabbitMQ queue system
  - **✅ Redis Job Queue Adapter**: Production-ready Redis adapter with priority queues and persistence
  - **✅ Queue System Integration**: Seamless integration with notification service for automatic processing
  - **✅ Automatic Processing**: Configurable interval processing (default 30 seconds) with scheduled jobs
  - **✅ Redis Rate Limiting**: Distributed rate limiting across service instances with multi-window support
  - **✅ Healthcare Compliance**: HIPAA-compliant job processing with audit logging and encryption
  - **✅ Environment Configuration**: 25+ configuration options for fine-tuning Redis queue behavior
  - **✅ Comprehensive Documentation**: Complete setup guide with Redis monitoring and troubleshooting
  - **✅ Production Ready**: TypeScript build successful, fully tested and working implementation
- **Notification Service**: Multi-channel notifications with HIPAA compliance, Gmail SMTP, and Redis automatic processing
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
**When developing new features, ALWAYS integrate with these 20+ available services:**

### Core Services (Must Use)
- 🔄 **Event Bus**: Cross-domain communication (`fastify.eventBus`)
- 📊 **Audit System**: Compliance logging (`fastify.auditLog`) 
- 📝 **Structured Logging**: Application logging (`fastify.log` with context)
- 🏥 **Health Checks**: System monitoring (`fastify.healthCheck`)

### Communication & Processing
- 🔗 **HTTP Client**: External APIs (`fastify.httpClient`)
- 📧 **Notification Service**: User communications (`fastify.notification`)
- ⚙️ **Bull + RabbitMQ Queue System**: Async processing (`QueueFactory.create()`)
- 🌐 **WebSocket Manager**: Real-time communication (`fastify.websocketManager`)

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
- 🎨 **Image Processing**: Sharp.js image operations (`fastify.imageProcessing`)

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

### 🚀 **Latest Updates - Bull + RabbitMQ Queue System**
**Implemented production-ready queue system with unified interface:**
- **Bull Queue Service**: Redis-based queue with Bull library for high performance
- **RabbitMQ Service**: Enterprise message broker with advanced routing
- **Unified Interface**: Same API for both Redis and RabbitMQ brokers
- **Queue Factory**: Dynamic queue creation based on broker type
- **Comprehensive Monitoring**: Unified dashboard with metrics and health checks
- **Admin API**: REST endpoints for queue management and job control
- **Automatic Processing**: Configurable notification processing with both brokers
- **Production Ready**: Built on mature libraries (Bull, amqplib) with full TypeScript support
- **Environment Configuration**: 25+ configuration options for fine-tuning
- **Complete Documentation**: Setup guide with Redis monitoring and troubleshooting
- **Production Ready**: Successfully built and tested TypeScript implementation

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

---

## 🚨 **Critical Development Rules & Lessons Learned**

### ❌ **NEVER Touch These Nx Configurations:**
```json
// ❌ NEVER CHANGE - Nx uses workspace-relative paths
"main": "apps/api/src/main.ts",           // ✅ Correct
"tsConfig": "apps/api/tsconfig.app.json", // ✅ Correct  
"outputPath": "apps/api/dist",            // ✅ Correct

// ❌ WRONG - Breaking Nx conventions
"main": "src/main.ts",        // ❌ Don't use relative paths
"tsConfig": "tsconfig.app.json", // ❌ Missing workspace context
"outputPath": "dist",            // ❌ Wrong output location
```

### 🔧 **TypeScript Build Issues - Root Causes & Solutions:**

#### **Nx + TypeScript Common Issues:**
1. **Iterator Downlevel Compilation:**
   ```typescript
   // ❌ Problem: Map/Set iterators don't work with strict TS config
   for (const item of map.values()) // Causes TS2802 error
   
   // ✅ Solution: Use Array.from() wrapper
   for (const item of Array.from(map.values()))
   ```

2. **Module Import Compatibility:**
   ```typescript
   // ❌ Problem: Mixed CommonJS/ES modules
   import winston from 'winston'      // Fails with nodenext
   import Transport from 'winston-transport'
   
   // ✅ Solution: Use compatible imports
   import * as winston from 'winston'
   const Transport = require('winston-transport')
   ```

3. **TypeScript Configuration for Nx:**
   ```json
   // ✅ Required in tsconfig.base.json for Node.js projects
   {
     "esModuleInterop": true,
     "allowSyntheticDefaultImports": true,
     "downlevelIteration": true,    // Critical for Map/Set iteration
     "skipLibCheck": true          // Skip problematic node_modules types
   }
   ```

### 📋 **Development Process Checklist:**

#### **Before Making Build Configuration Changes:**
- [ ] ❓ **Ask:** "Am I breaking Nx conventions?"
- [ ] ❓ **Ask:** "Do I understand why the build is failing?"
- [ ] ❓ **Ask:** "Is this a TypeScript issue, not a path issue?"
- [ ] 🔍 **Check:** Review error messages carefully
- [ ] 🔍 **Check:** Test with minimal changes first

#### **When Build Fails:**
1. 🎯 **Identify Root Cause:** TypeScript compilation vs path resolution
2. 🔧 **Fix TypeScript Issues First:** Before touching Nx config
3. 🚫 **Never Assume:** Path issues when seeing compilation errors
4. ✅ **Test Incrementally:** One fix at a time

### 🎓 **Key Lessons from Thumbnail Feature Development:**

#### **What Went Right:**
- ✅ Thumbnail generation implementation was correct
- ✅ API integration working perfectly
- ✅ TypeScript types properly defined
- ✅ Sharp library integration successful

#### **What Went Wrong & Why:**
- ❌ **Misdiagnosed build errors** as path issues instead of TypeScript compilation
- ❌ **Broke Nx conventions** by changing workspace-relative paths
- ❌ **Created new problems** while trying to fix unrelated issues
- ❌ **Didn't verify root cause** before making configuration changes

### 💡 **Future Prevention Strategies:**
1. **Always backup configurations** before making changes
2. **Test TypeScript compilation separately** from build process
3. **Read Nx documentation** before changing project structure
4. **Ask user for confirmation** before touching core configurations
5. **Document all changes** and their reasoning

### 🔄 **Emergency Recovery Process:**
```bash
# If Nx builds break due to configuration changes:
1. Revert apps/*/package.json to workspace-relative paths
2. Check tsconfig.base.json has proper Node.js compatibility flags  
3. Fix TypeScript compilation errors in code
4. Test incrementally with nx build <project>
```

**Remember: Nx conventions exist for a reason. Don't fight the framework!** 🏗️