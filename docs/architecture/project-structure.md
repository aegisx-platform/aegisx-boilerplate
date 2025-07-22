# Project Structure Guide

## 🎯 Nx Monorepo Structure

AegisX Boilerplate uses an Nx monorepo structure for scalable enterprise development:

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

## 🏗️ 4-Layer Architecture

### Layer 1: Core Layer - "Infrastructure Foundation"
```
apps/api/src/app/core/
├── 📁 plugins/          # Infrastructure plugins (database, security, validation, monitoring)
├── 📁 shared/           # Reusable components (audit, events, cache, middleware, services)
└── 📁 workers/          # Background workers (Redis, RabbitMQ)
```

**Purpose**: Infrastructure services, plugins, shared utilities  
**When to use**: Database connections, security middleware, audit/event systems

### Layer 2: Domains Layer - "Core Business Logic" ✅
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

### Layer 3: Features Layer - "Advanced Business Features" ✅
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

### Layer 4: Infrastructure Layer - "External Services"
```
apps/api/src/app/infrastructure/
├── 📁 database/         # Migrations, seeds
├── 📁 email/           # Email service integration
├── 📁 integrations/    # Third-party API integrations
└── 📁 storage/         # File storage services
```

**Purpose**: External service integrations  
**When to use**: Database schema, email services, third-party APIs

## Standard Domain Structure

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

## Enterprise Domain Examples

### 📨 Notification Domain (Complete Enterprise Implementation)
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

### 🔑 Auth Domain (Reference Implementation)
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

## ✨ Benefits of This Architecture

- **✅ Single Responsibility**: Each component has one clear purpose
- **✅ Maintainable**: Easy to locate and modify specific functionality
- **✅ Scalable**: Simple to extend domains with new features
- **✅ Type-Safe**: Complete TypeScript coverage with proper interface separation
- **✅ Testable**: Clean separation enables focused unit testing
- **✅ Consistent**: Every domain follows the same proven patterns

## Plugin Loading Order

The order of plugin registration is critical for proper initialization:

1. **Environment** → Load environment variables first
2. **Validation** → Set up request/response validation
3. **Cache** → Initialize Redis connection
4. **Database** → PostgreSQL connection and models
5. **Auth** → JWT and API key authentication
6. **Security** → RBAC, file access control, other security middleware

## File Naming Conventions

- **TypeScript Files**: `*-controller.ts`, `*-service.ts`, `*-repository.ts`, `*-schemas.ts`
- **Folders**: `kebab-case` (user-management, patient-management)
- **Classes**: `PascalCase` (AuthController, UserService)
- **Interfaces**: `PascalCase` (UserData, LoginRequest)

## Development Workflow

1. **Domain-Driven**: Start with domain modeling
2. **Schema-First**: Define TypeBox schemas for validation
3. **Type-Safe**: Create TypeScript interfaces from schemas
4. **Test-Driven**: Write tests alongside implementation
5. **Event-Driven**: Use Event Bus for domain communication
6. **Documentation**: Document as you build

## Best Practices

### DO ✅
- Keep domains independent (use Event Bus for communication)
- Follow the standard domain structure
- Use dependency injection for services
- Write comprehensive tests
- Document public APIs
- Use TypeBox for validation

### DON'T ❌
- Import directly between domains
- Put business logic in controllers
- Access database from controllers
- Skip validation
- Use `any` type
- Create circular dependencies