# Project Overview

## About AegisX Boilerplate
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

## Healthcare Context
This is designed for healthcare applications requiring:
- HIPAA compliance considerations
- Comprehensive audit trails
- Role-based access for healthcare roles
- Scalable architecture for enterprise healthcare systems

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