# Domains and Features

## Current Implementation Status

### ✅ Implemented & Ready

#### 🌐 Full-Stack Application
- **Angular 20 Frontend** - Complete setup with standalone components in `apps/web/`
- **Fastify API Backend** - Production-ready API server in `apps/api/`
- **Nx Monorepo** - Proper workspace structure with apps/ and libs/
- **Shared Libraries** - Type-safe communication with `@aegisx-boilerplate/types` and `@aegisx-boilerplate/api-client`
- **TypeScript Configuration** - Dual setup for Node.js (CommonJS) + Angular (ES modules)

#### 🔐 Authentication & Security Domain
**Location**: `apps/api/src/app/domains/auth/`

Features:
- JWT Authentication with refresh tokens
- API Key Authentication with dual expiration strategy
- Dual Authentication Support (API keys + JWT)
- Session management
- Password reset flow
- OAuth2 ready structure

#### 🔑 RBAC (Role-Based Access Control) Domain
**Location**: `apps/api/src/app/domains/rbac/`

Features:
- Permission model: `resource:action:scope`
- Role hierarchy support
- Permission caching with Redis
- Dynamic permission checking
- Role management API
- User-role assignment

#### 👤 User Management Domain
**Location**: `apps/api/src/app/domains/user-management/`

Features:
- User profile management
- Avatar upload with image processing
- User preferences
- Account settings
- User search and filtering
- Bulk user operations

#### 📝 Audit Log Domain
**Location**: `apps/api/src/app/domains/audit-log/`

Features:
- Comprehensive audit trail
- Multiple adapters (Direct DB, Redis Pub/Sub, RabbitMQ)
- HIPAA compliance features
- Data sanitization
- Audit log search and export
- Integrity checking

#### 📁 Storage Domain
**Location**: `apps/api/src/app/domains/storage/`

Features:
- Multi-provider support (Local, MinIO)
- File upload/download with streaming
- Shared file management
- Access permissions
- File versioning
- Usage analytics
- Automatic thumbnail generation
- Image processing integration

**Related Documentation**:
- `docs/storage-service.md`
- `docs/storage-database.md`
- `docs/storage-shared-files.md`
- `docs/thumbnail-generation.md`

#### 📨 Notification Domain
**Location**: `apps/api/src/app/domains/notification/`

Complete enterprise notification system featuring:

**Multi-Channel Support**:
- Email (Gmail SMTP)
- SMS
- Push notifications
- Slack
- Webhooks
- In-app notifications

**Enterprise Features**:
- Batch processing (4 types: bulk, user, scheduled, priority)
- Automatic processing every 30 seconds
- Priority-based queue processing
- Template management
- User preferences
- Delivery tracking
- Error handling with retry
- Rate limiting

**Infrastructure**:
- Bull + RabbitMQ integration
- Redis-based rate limiting
- HIPAA compliance
- Comprehensive audit trail

**Related Documentation**:
- `docs/notification-service.md`
- `docs/notification-database-schema.md`

#### 📊 Report Builder Domain
**Location**: `apps/api/src/app/domains/reports/`

Low-code report generation system featuring:

**Data Source Support**:
- PostgreSQL
- MySQL
- MongoDB
- REST APIs
- File uploads (CSV, Excel)

**Report Features**:
- Template management with versioning
- Parameter-based filtering
- Background generation
- Real-time progress tracking
- Public URL sharing
- Scheduled reports

**Export Formats**:
- HTML
- PDF
- Excel
- CSV
- JSON
- Images (PNG, JPG)

**Infrastructure**:
- WebSocket integration
- Redis caching
- Job scheduling
- Analytics tracking

**Related Documentation**:
- `docs/features/report-builder.md`

### 🏗️ Infrastructure Components

#### Advanced Monitoring
- Structured logging with Winston
- Seq integration for log analysis
- Grafana + Loki support
- Custom business metrics
- Performance monitoring
- Error tracking

#### Message Queue System
- Bull Queue (Redis-based)
- RabbitMQ integration
- Unified queue interface
- Job scheduling
- Dead letter queues
- Queue monitoring dashboard

#### Caching Strategy
- Redis integration
- Multi-level caching
- Cache invalidation patterns
- Distributed caching
- Cache warming

#### Security Infrastructure
- Helmet.js integration
- Rate limiting
- CORS configuration
- File access control
- API key management
- Security headers

## 🚧 Structured But Not Implemented

These healthcare features are architected but await implementation:

### Patient Management
**Planned Location**: `apps/api/src/app/domains/patient-management/`

Planned features:
- Patient registration
- Medical history
- Insurance information
- Emergency contacts
- Patient portal
- Document management

### Appointment Scheduling
**Planned Location**: `apps/api/src/app/domains/appointment-scheduling/`

Planned features:
- Calendar management
- Resource scheduling
- Appointment reminders
- Waitlist management
- Recurring appointments
- Multi-location support

### Medical Records
**Planned Location**: `apps/api/src/app/domains/medical-records/`

Planned features:
- Electronic Health Records (EHR)
- Document management
- Lab results integration
- Prescription management
- Clinical notes
- FHIR compliance ready

### Billing System
**Planned Location**: `apps/api/src/app/domains/billing/`

Planned features:
- Invoice generation
- Payment processing
- Insurance claims
- Payment plans
- Financial reports
- Multi-currency support

### Inventory Management
**Planned Location**: `apps/api/src/app/domains/inventory/`

Planned features:
- Stock management
- Order tracking
- Supplier management
- Expiry tracking
- Automated reordering
- Barcode/QR support

## Database Schema Overview

### Core Tables (13 tables)
- **Authentication**: users, refresh_tokens, api_keys
- **RBAC**: roles, permissions, user_roles, role_permissions
- **Audit**: audit_logs

### Feature Tables
- **Notification** (8 tables): notifications, templates, batches, preferences, statistics
- **Storage** (5 tables): files, permissions, shared_files, usage_analytics, versions
- **Reports** (8 tables): data_sources, templates, parameters, instances, schedules

Total: 34+ database tables with comprehensive relationships

## Integration Between Domains

Domains communicate through:

1. **Event Bus** - Asynchronous communication
   ```typescript
   await fastify.eventBus.publish('user.created', userData);
   ```

2. **Direct Service Calls** - When synchronous response needed
   ```typescript
   const user = await fastify.userService.findById(userId);
   ```

3. **Shared Types** - Type-safe contracts
   ```typescript
   import { UserDto } from '@aegisx-boilerplate/types';
   ```

## Adding New Domains

When adding a new domain:

1. Create domain folder structure
2. Implement standard components (controllers, services, repositories)
3. Define TypeBox schemas
4. Create TypeScript types
5. Set up routes
6. Add event publishers/subscribers
7. Write tests
8. Create documentation
9. Update this file

## Best Practices

- Keep domains loosely coupled
- Use events for cross-domain communication
- Implement comprehensive error handling
- Add proper validation
- Include audit logging
- Write documentation
- Create integration tests