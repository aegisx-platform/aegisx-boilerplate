# Claude Context for AegisX Boilerplate

## Project Overview
AegisX Boilerplate is a production-ready Fastify API boilerplate designed for Healthcare Information Systems (HIS) and ERP applications. Built with TypeScript, PostgreSQL, and enterprise-grade infrastructure.

## Quick Reference

### 🏗️ Architecture & Structure
- **[Project Structure Guide](docs/architecture/project-structure.md)** - Nx monorepo, 4-layer architecture, domain patterns
- **[Services Catalog](docs/architecture/services-catalog.md)** - 20+ enterprise infrastructure services
- **[Domains & Features](docs/architecture/domains-features.md)** - Implemented domains and healthcare features

### 🚀 Development
- **[Environment Setup](docs/development/environment-setup.md)** - Configuration, environment variables, Docker
- **[Commands Reference](docs/development/commands-reference.md)** - Development, build, test, and deployment commands
- **[Coding Standards](docs/development/coding-standards.md)** - Conventions, patterns, and best practices
- **[Nx & TypeScript Guide](docs/development/nx-typescript-guide.md)** - Critical configuration rules and troubleshooting

### 📋 Documentation & Roadmap
- **[Implementation History](docs/roadmap/implementation-history.md)** - Recent development, completed features
- **[File Locations](docs/reference/file-locations.md)** - Important files, configurations, documentation index
- **[Development Roadmap](docs/BOILERPLATE_ROADMAP.md)** - Future plans and priorities

## Technology Stack
- **Framework**: Fastify v5.2.1 + Angular 20
- **Language**: TypeScript (strict, dual setup: Node.js + Browser)
- **Database**: PostgreSQL + Knex.js
- **Validation**: TypeBox
- **Architecture**: Nx monorepo
- **Caching**: Redis
- **Queue**: Bull + RabbitMQ
- **Authentication**: JWT + API Keys
- **Authorization**: RBAC
- **Monitoring**: Winston, Seq/Grafana

## Key Integration Points
When developing new features, ALWAYS integrate with these available services:

### Must Use
- 🔄 **Event Bus**: `fastify.eventBus`
- 📊 **Audit System**: `fastify.auditLog`
- 📝 **Structured Logging**: `fastify.log`
- 🏥 **Health Checks**: `fastify.healthCheck`

### Available Services
- 🔗 **HTTP Client**: `fastify.httpClient`
- 📧 **Notification**: `fastify.notification`
- ⚙️ **Queue System**: `QueueFactory.create()`
- 🌐 **WebSocket**: `fastify.websocketManager`
- 🔄 **Retry**: `fastify.retry`
- ⚡ **Circuit Breaker**: `fastify.circuitBreaker`
- 🗄️ **Cache**: `fastify.cache`
- 📈 **Metrics**: `fastify.metrics`
- 📁 **Storage**: `fastify.storage`
- 🎨 **Image Processing**: `fastify.imageProcessing`

## Development Rules

### ✅ DO
- Use existing infrastructure services
- Follow 4-layer architecture
- Integrate with Event Bus for cross-domain communication
- Update documentation when adding features
- Use TypeBox for validation
- Follow established domain patterns

### ❌ DON'T
- Create new infrastructure when existing services work
- Import directly between domains (use Event Bus)
- Change Nx workspace configurations without understanding
- Use console.log (use structured logging)
- Skip audit logging for sensitive operations

## Quick Start
```bash
# Start development (API + Frontend)
npm start

# Database setup
npm run db:setup
npm run db:dev:migrate
npm run db:dev:seed

# Testing
npm test
npm run lint
npm run typecheck
```

## Access Points
- **API**: http://localhost:3000
- **API Docs**: http://localhost:3000/docs
- **Frontend**: http://localhost:4200
- **pgAdmin**: http://localhost:8080

---

💡 **For detailed information, explore the documentation in the `docs/` directory**