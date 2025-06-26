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

### Core Architecture (4 Layers)
1. **Core Layer** (`apps/api/src/core/`): Infrastructure, plugins, shared components
2. **Domains Layer** (`apps/api/src/domains/`): Business logic (auth, RBAC, audit, user management)
3. **Features Layer** (`apps/api/src/features/`): Healthcare-specific features (structured but not implemented)
4. **Infrastructure Layer** (`apps/api/src/infrastructure/`): Database, external services

### Key Directories
- `apps/api/src/core/plugins/` - Infrastructure plugins (database, security, validation)
- `apps/api/src/core/shared/` - Shared components (audit system, middleware, utils)
- `apps/api/src/domains/` - Implemented business domains
- `apps/api/src/features/` - Healthcare features (ready for implementation)
- `apps/api/src/infrastructure/database/migrations/` - Database schema
- `docs/` - Comprehensive documentation

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
Current tables: users, refresh_tokens, roles, permissions, user_roles, role_permissions, audit_logs

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

### Logging & Monitoring
- `docker-compose -f docker-compose.seq.yml up -d` - Start Seq log monitoring
- `docker-compose -f docker-compose.loki.yml up -d` - Start Grafana + Loki stack
- `docker-compose -f docker-compose.fluent-bit.yml up -d` - Start Fluent Bit + full logging stack
- `docker-compose -f docker-compose.seq.yml down` - Stop Seq
- `docker-compose -f docker-compose.loki.yml down` - Stop Grafana + Loki
- `docker-compose -f docker-compose.fluent-bit.yml down -v` - Stop Fluent Bit and remove data

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

## Important Files
- `knexfile.ts` / `knexfile.prod.js` - Database configuration
- `docker-compose.yml` - Service orchestration
- `docker-compose.seq.yml` - Seq logging stack
- `docker-compose.loki.yml` - Grafana + Loki logging stack
- `docker-compose.fluent-bit.yml` - Fluent Bit advanced logging stack
- `.env.example` - Environment configuration template
- `apps/api/src/core/plugins/logging/` - Structured logging implementation
- `apps/api/src/core/shared/audit/` - Audit system implementation
- `apps/api/src/core/plugins/security/rbac.ts` - RBAC implementation
- `config/fluent-bit.conf` - Fluent Bit configuration
- `config/parsers.conf` - Log parsers configuration
- `config/loki-config.yml` - Loki configuration
- `config/promtail-config.yml` - Promtail configuration
- `scripts/correlation.lua` - Correlation ID enhancement
- `scripts/hipaa_sanitizer.lua` - HIPAA compliance sanitization
- `dashboards/` - Grafana dashboard definitions

## Code Conventions
- **Architecture**: Follow domain-driven design patterns
- **Naming**: Use kebab-case for routes, camelCase for TypeScript
- **Structure**: Each domain/feature has: controllers, services, repositories, schemas, types, routes
- **Validation**: Use TypeBox schemas for request/response validation
- **Error Handling**: Use Fastify's error handling patterns
- **Security**: Always validate input, sanitize audit data

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
- Structured logging system with correlation ID tracking and dual monitoring support
- Character corruption fix in terminal output (ANSI codes removal)
- Seq and Grafana + Loki integration for flexible log monitoring
- Event Bus system with multi-adapter support (Memory, Redis, RabbitMQ)
- Event Bus enable/disable functionality using NoOp pattern
- Audit system optimization (Redis Pub/Sub pattern)
- RBAC integration with authentication
- Comprehensive documentation and health monitoring

## Next Priority Areas
1. Implement healthcare features in `/features/` directory
2. Add comprehensive testing coverage
3. Advanced log alerting and notification system
4. Production deployment configuration
5. Healthcare-specific compliance features