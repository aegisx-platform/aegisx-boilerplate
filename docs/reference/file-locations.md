# File Locations Reference

## Main Documentation Files

### Core Documentation
- **[CLAUDE.md](../../CLAUDE.md)** - Main AI assistant context and index
- **[DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)** - Complete development workflow guide
- **[README.md](../../README.md)** - Project overview and getting started

### Architecture Documentation
- **[docs/architecture/project-structure.md](../architecture/project-structure.md)** - Nx monorepo and 4-layer architecture
- **[docs/architecture/services-catalog.md](../architecture/services-catalog.md)** - Enterprise infrastructure services
- **[docs/architecture/domains-features.md](../architecture/domains-features.md)** - Implemented domains and features

### Development Documentation
- **[docs/development/environment-setup.md](../development/environment-setup.md)** - Environment variables and setup
- **[docs/development/commands-reference.md](../development/commands-reference.md)** - Development commands
- **[docs/development/coding-standards.md](../development/coding-standards.md)** - Code conventions and best practices
- **[docs/development/nx-typescript-guide.md](../development/nx-typescript-guide.md)** - TypeScript configuration guide

### Roadmap Documentation
- **[docs/roadmap/implementation-history.md](../roadmap/implementation-history.md)** - Recent development history
- **[docs/BOILERPLATE_ROADMAP.md](../BOILERPLATE_ROADMAP.md)** - Development roadmap and priorities

## Configuration Files

### TypeScript Configuration (Nx Monorepo)
- **[tsconfig.base.json](../../tsconfig.base.json)** - Base TypeScript configuration
- **[apps/api/tsconfig.app.json](../../apps/api/tsconfig.app.json)** - API TypeScript config (Node.js)
- **[apps/web/tsconfig.app.json](../../apps/web/tsconfig.app.json)** - Angular TypeScript config (Browser)
- **[libs/shared/types/tsconfig.lib.json](../../libs/shared/types/tsconfig.lib.json)** - Shared types config
- **[libs/shared/api-client/tsconfig.lib.json](../../libs/shared/api-client/tsconfig.lib.json)** - API client config

### Database Configuration
- **[knexfile.ts](../../knexfile.ts)** - Development database configuration
- **[knexfile.prod.js](../../knexfile.prod.js)** - Production database configuration

### Docker Configuration
- **[docker-compose.yml](../../docker-compose.yml)** - Core services (PostgreSQL, Redis, pgAdmin)
- **[docker-compose.seq.yml](../../docker-compose.seq.yml)** - Seq logging stack
- **[docker-compose.loki.yml](../../docker-compose.loki.yml)** - Grafana + Loki stack
- **[docker-compose.fluent-bit.yml](../../docker-compose.fluent-bit.yml)** - Fluent Bit advanced stack
- **[docker-compose.graylog.yml](../../docker-compose.graylog.yml)** - Graylog centralized logging

### Environment Configuration
- **[.env.example](../../.env.example)** - Environment configuration template

## Core Infrastructure

### API Backend (Fastify)
- **[apps/api/src/main.ts](../../apps/api/src/main.ts)** - API server entry point
- **[apps/api/src/app/app.ts](../../apps/api/src/app/app.ts)** - Main application setup

### Core Plugins
- **[apps/api/src/app/core/plugins/logging/](../../apps/api/src/app/core/plugins/logging/)** - Structured logging
- **[apps/api/src/app/core/plugins/security/rbac.ts](../../apps/api/src/app/core/plugins/security/rbac.ts)** - RBAC implementation
- **[apps/api/src/app/core/plugins/security/jwt.ts](../../apps/api/src/app/core/plugins/security/jwt.ts)** - JWT & API key authentication
- **[apps/api/src/app/core/plugins/security/file-access-control.ts](../../apps/api/src/app/core/plugins/security/file-access-control.ts)** - File access control

### Audit System
- **[apps/api/src/app/core/shared/audit/](../../apps/api/src/app/core/shared/audit/)** - Audit system implementation

### Enterprise Services
- **[apps/api/src/app/core/shared/services/](../../apps/api/src/app/core/shared/services/)** - Enterprise infrastructure services
- **[apps/api/src/app/core/shared/services/storage.service.ts](../../apps/api/src/app/core/shared/services/storage.service.ts)** - Storage service
- **[apps/api/src/app/core/shared/services/image-processing.service.ts](../../apps/api/src/app/core/shared/services/image-processing.service.ts)** - Image processing
- **[apps/api/src/app/core/shared/services/bull-queue.service.ts](../../apps/api/src/app/core/shared/services/bull-queue.service.ts)** - Bull queue service
- **[apps/api/src/app/core/shared/services/rabbitmq-queue.service.ts](../../apps/api/src/app/core/shared/services/rabbitmq-queue.service.ts)** - RabbitMQ service

### Queue System
- **[apps/api/src/app/core/shared/factories/queue.factory.ts](../../apps/api/src/app/core/shared/factories/queue.factory.ts)** - Queue factory
- **[apps/api/src/app/core/shared/interfaces/queue.interface.ts](../../apps/api/src/app/core/shared/interfaces/queue.interface.ts)** - Queue interface
- **[apps/api/src/app/core/shared/routes/queue-admin.routes.ts](../../apps/api/src/app/core/shared/routes/queue-admin.routes.ts)** - Queue admin routes

## Domain Implementations

### Authentication Domain
- **[apps/api/src/app/domains/auth/](../../apps/api/src/app/domains/auth/)** - Authentication domain
- **[apps/api/src/app/domains/auth/controllers/auth-controller.ts](../../apps/api/src/app/domains/auth/controllers/auth-controller.ts)** - Auth controller
- **[apps/api/src/app/domains/auth/controllers/api-key-controller.ts](../../apps/api/src/app/domains/auth/controllers/api-key-controller.ts)** - API key controller

### Notification Domain
- **[apps/api/src/app/domains/notification/](../../apps/api/src/app/domains/notification/)** - Notification domain
- **[apps/api/src/app/domains/notification/controllers/notification-controller.ts](../../apps/api/src/app/domains/notification/controllers/notification-controller.ts)** - Notification controller
- **[apps/api/src/app/domains/notification/controllers/batch-controller.ts](../../apps/api/src/app/domains/notification/controllers/batch-controller.ts)** - Batch controller
- **[apps/api/src/app/domains/notification/services/queue-notification-service.ts](../../apps/api/src/app/domains/notification/services/queue-notification-service.ts)** - Queue notification service
- **[apps/api/src/app/domains/notification/services/batch-worker.service.ts](../../apps/api/src/app/domains/notification/services/batch-worker.service.ts)** - Batch worker service

### Storage Domain
- **[apps/api/src/app/domains/storage/](../../apps/api/src/app/domains/storage/)** - Storage domain
- **[apps/api/src/app/domains/storage/controllers/storage-controller.ts](../../apps/api/src/app/domains/storage/controllers/storage-controller.ts)** - Storage controller
- **[apps/api/src/app/domains/storage/controllers/storage-image-controller.ts](../../apps/api/src/app/domains/storage/controllers/storage-image-controller.ts)** - Image processing controller

### Reports Domain
- **[apps/api/src/app/domains/reports/](../../apps/api/src/app/domains/reports/)** - Report builder domain
- **[apps/api/src/app/domains/reports/controllers/report-template-controller.ts](../../apps/api/src/app/domains/reports/controllers/report-template-controller.ts)** - Template controller
- **[apps/api/src/app/domains/reports/controllers/report-generation-controller.ts](../../apps/api/src/app/domains/reports/controllers/report-generation-controller.ts)** - Generation controller
- **[apps/api/src/app/domains/reports/routes/report-websocket-routes.ts](../../apps/api/src/app/domains/reports/routes/report-websocket-routes.ts)** - WebSocket routes

## Angular Frontend

### Frontend Application
- **[apps/web/src/app/app.ts](../../apps/web/src/app/app.ts)** - Main Angular application
- **[apps/web/src/styles.scss](../../apps/web/src/styles.scss)** - Global styles
- **[apps/web/proxy.conf.json](../../apps/web/proxy.conf.json)** - Development proxy configuration

### Shared Libraries
- **[libs/shared/types/src/lib/](../../libs/shared/types/src/lib/)** - Shared TypeScript types
- **[libs/shared/api-client/src/lib/](../../libs/shared/api-client/src/lib/)** - Type-safe API client

## Feature Documentation

### Core Features
- **[docs/notification-service.md](../notification-service.md)** - Notification service guide
- **[docs/notification-database-schema.md](../notification-database-schema.md)** - Notification database schema
- **[docs/bull-rabbitmq-queue-system.md](../bull-rabbitmq-queue-system.md)** - Queue system documentation
- **[docs/storage-service.md](../storage-service.md)** - Storage service guide
- **[docs/storage-database.md](../storage-database.md)** - Storage database schema
- **[docs/storage-shared-files.md](../storage-shared-files.md)** - Shared files management
- **[docs/file-access-control-plugin.md](../file-access-control-plugin.md)** - File access control
- **[docs/websocket-service.md](../websocket-service.md)** - WebSocket service guide
- **[docs/image-processing-service.md](../image-processing-service.md)** - Image processing documentation
- **[docs/thumbnail-generation.md](../thumbnail-generation.md)** - Thumbnail generation guide

### Advanced Features
- **[docs/features/report-builder.md](../features/report-builder.md)** - Report builder system
- **[docs/api-key-authentication.md](../api-key-authentication.md)** - API key authentication
- **[docs/api-key-testing-guide.md](../api-key-testing-guide.md)** - API key testing guide

### Development Tools
- **[tools/cli/README.md](../../tools/cli/README.md)** - CLI scaffolding tool
- **[docs/typescript-configuration-guide.md](../typescript-configuration-guide.md)** - TypeScript configuration

## Monitoring & Logging

### Logging Configuration
- **[config/fluent-bit.conf](../../config/fluent-bit.conf)** - Fluent Bit configuration
- **[config/fluent-bit-advanced.conf](../../config/fluent-bit-advanced.conf)** - Advanced Fluent Bit
- **[config/fluent-bit-graylog.conf](../../config/fluent-bit-graylog.conf)** - Graylog Fluent Bit
- **[config/parsers.conf](../../config/parsers.conf)** - Log parsers
- **[config/loki-config.yml](../../config/loki-config.yml)** - Loki configuration
- **[config/promtail-config.yml](../../config/promtail-config.yml)** - Promtail configuration

### Monitoring Scripts
- **[scripts/logging-selector.sh](../../scripts/logging-selector.sh)** - Interactive logging selector
- **[scripts/correlation.lua](../../scripts/correlation.lua)** - Correlation ID enhancement
- **[scripts/hipaa_sanitizer.lua](../../scripts/hipaa_sanitizer.lua)** - HIPAA sanitization
- **[scripts/graylog_formatter.lua](../../scripts/graylog_formatter.lua)** - Graylog formatting

### Dashboards
- **[dashboards/](../../dashboards/)** - Grafana dashboard definitions

## Database Schema

### Core Database
- **[apps/api/src/app/infrastructure/database/migrations/](../../apps/api/src/app/infrastructure/database/migrations/)** - Database migrations
- **[apps/api/src/app/infrastructure/database/seeds/](../../apps/api/src/app/infrastructure/database/seeds/)** - Database seeds

### Database Documentation
- **[docs/database-schema.md](../database-schema.md)** - Complete database schema documentation

## Testing

### Test Configuration
- **[jest.config.js](../../jest.config.js)** - Jest configuration
- **[apps/api/jest.config.js](../../apps/api/jest.config.js)** - API test configuration
- **[apps/web/jest.config.js](../../apps/web/jest.config.js)** - Angular test configuration

### Test Files
- **[apps/api/src/**/*.test.ts](../../apps/api/src/)** - API unit tests
- **[apps/web/src/**/*.spec.ts](../../apps/web/src/)** - Angular unit tests

## Build & Development

### Nx Configuration
- **[nx.json](../../nx.json)** - Nx workspace configuration
- **[apps/api/project.json](../../apps/api/project.json)** - API project configuration
- **[apps/web/project.json](../../apps/web/project.json)** - Angular project configuration

### Package Management
- **[package.json](../../package.json)** - Root package.json
- **[package-lock.json](../../package-lock.json)** - Lock file

### Quality Tools
- **[.eslintrc.json](../../.eslintrc.json)** - ESLint configuration
- **[.prettierrc](../../.prettierrc)** - Prettier configuration
- **[.gitignore](../../.gitignore)** - Git ignore rules

## Quick Navigation

### Most Important Files
1. **[CLAUDE.md](../../CLAUDE.md)** - Start here for AI assistant context
2. **[DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md)** - Development workflow
3. **[docs/architecture/project-structure.md](../architecture/project-structure.md)** - Architecture overview
4. **[docs/development/environment-setup.md](../development/environment-setup.md)** - Setup guide
5. **[docs/development/commands-reference.md](../development/commands-reference.md)** - Command reference

### By Topic
- **Architecture**: `docs/architecture/` directory
- **Development**: `docs/development/` directory  
- **Features**: `docs/` root and `docs/features/` directory
- **Configuration**: Root directory and `config/` directory
- **Source Code**: `apps/` and `libs/` directories