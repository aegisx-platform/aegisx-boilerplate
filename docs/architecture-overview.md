# AegisX Boilerplate - Architecture Overview

## Overview

AegisX Boilerplate ใช้ **Layered Architecture** ที่ออกแบบมาเพื่อการพัฒนาระบบ HIS (Hospital Information System) และ ERP โดยเน้นความยืดหยุ่น, ความสามารถในการขยายตัว, และการบำรุงรักษาที่ง่าย

## Technology Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL + Knex.js
- **Monorepo**: Nx
- **Authentication**: JWT + Refresh Token
- **Authorization**: Role-Based Access Control (RBAC)
- **Validation**: TypeBox
- **Documentation**: Swagger/OpenAPI

## Architecture Layers

### 1. Core Layer (`/core/`)
**หน้าที่**: Infrastructure และ Framework fundamentals

```
core/
├── plugins/               # Infrastructure Plugins
│   ├── database/         # Database connections & migrations
│   ├── security/         # Security middleware (JWT, RBAC, Helmet, Rate Limiting)
│   ├── validation/       # Input validation & sanitization
│   ├── docs/            # API documentation (Swagger)
│   └── env.ts           # Environment configuration
├── shared/              # Shared Components
│   ├── interfaces/      # Base interfaces (Repository, Service, Controller)
│   ├── types/          # Common TypeScript types
│   ├── schemas/        # Base validation schemas
│   ├── utils/          # Utility functions
│   └── middleware/     # Common middleware
└── app.ts              # Application bootstrap
```

**ความรับผิดชอบ**:
- การเชื่อมต่อฐานข้อมูล
- การจัดการ Authentication/Authorization
- การตรวจสอบความปลอดภัย
- การตรวจสอบข้อมูลนำเข้า
- การจัดการ Environment

### 2. Domains Layer (`/domains/`)
**หน้าที่**: Business Logic ที่เป็นหัวใจของระบบ

```
domains/
├── auth/                # Authentication Domain
│   ├── controllers/     # HTTP request handlers
│   ├── services/       # Business logic
│   ├── repositories/   # Data access layer
│   ├── schemas/        # Validation schemas
│   ├── types/          # Domain-specific types
│   ├── routes/         # Route definitions
│   └── index.ts        # Domain module
├── rbac/               # Authorization Domain
└── users/              # User Management Domain
```

**ความรับผิดชอบ**:
- การจัดการ Business Rules
- การ Validate ข้อมูลธุรกิจ
- การเชื่อมต่อกับ Database
- การจัดการ Domain-specific Logic

### 3. Features Layer (`/features/`)
**หน้าที่**: Feature-specific implementations สำหรับ HIS/ERP

```
features/
├── patient-management/     # Patient registration, records, demographics
├── appointment-scheduling/ # Appointment booking, calendar, notifications
├── medical-records/       # Clinical notes, diagnoses, prescriptions
├── billing/              # Invoice generation, payment processing
├── inventory/            # Stock management, procurement
└── reporting/            # Analytics, dashboards, compliance reports
```

**ความรับผิดชอบ**:
- การสร้าง Feature เฉพาะทาง
- การรวม Multiple Domains
- การจัดการ Complex Workflows
- การ Integrate กับ External Systems

### 4. Infrastructure Layer (`/infrastructure/`)
**หน้าที่**: External services และ integrations

```
infrastructure/
├── database/           # Database migrations, seeds, configuration
├── email/             # Email service integrations
├── storage/           # File storage (local, cloud)
└── integrations/      # Third-party API integrations
```

**ความรับผิดชอบ**:
- การจัดการ Database Schema
- การเชื่อมต่อ External Services
- การจัดการไฟล์และเอกสาร
- การ Backup และ Recovery

### 5. API Layer (`/api/`)
**หน้าที่**: HTTP interface และ API versioning

```
api/
├── routes/
│   ├── v1/             # API version 1
│   │   ├── auth.ts     # /api/v1/auth/*
│   │   ├── rbac.ts     # /api/v1/rbac/*
│   │   └── users.ts    # /api/v1/users/*
│   └── index.ts        # Route aggregation
├── middleware/         # API-specific middleware
└── docs/              # API documentation
```

**ความรับผิดชอบ**:
- การจัดการ HTTP Routing
- การทำ API Versioning
- การจัดการ Request/Response
- การสร้าง API Documentation

## Data Flow

```
HTTP Request → API Layer → Features/Domains → Core → Infrastructure
                ↓              ↓               ↓         ↓
           Route Handler → Service Layer → Repository → Database
                ↓              ↓               ↓         ↓
           HTTP Response ← Business Logic ← Data Access ← Database
```

### 1. Request Flow
1. **HTTP Request** มาที่ API Layer
2. **Route Handler** ใน API Layer เรียก Feature/Domain
3. **Controller** รับ request และเรียก Service
4. **Service** ประมวลผล Business Logic
5. **Repository** เข้าถึงข้อมูลใน Database
6. **Response** ส่งกลับผ่าน Layer เดิม

### 2. Dependency Direction
```
API → Features → Domains → Core → Infrastructure
```
- Layer บนสามารถใช้ Layer ล่างได้
- Layer ล่างไม่ควรรู้จัก Layer บน

## Module Structure Pattern

แต่ละ Domain/Feature ใช้โครงสร้างเดียวกัน:

```
module-name/
├── controllers/        # HTTP handlers
│   └── module-controller.ts
├── services/          # Business logic
│   └── module-service.ts
├── repositories/      # Data access
│   └── module-repository.ts
├── schemas/           # Validation schemas
│   └── module-schemas.ts
├── types/            # TypeScript types
│   └── module-types.ts
├── routes/           # Route definitions
│   └── module-routes.ts
└── index.ts          # Module registration
```

## RBAC Security Model

### Role Hierarchy
```
admin → manager → user → viewer
```

### Permission Structure
```
resource:action:scope
├── users:read:all       # Read all users
├── users:update:own     # Update own profile
├── patients:read:department # Read department patients
└── reports:export:all   # Export all reports
```

### Example Usage
```typescript
// Route protection
fastify.get('/admin/users', 
  fastify.requirePermission('users', 'read', 'all'),
  getUsersHandler
);

// Service-level check
if (await rbacService.hasPermission({
  userId: request.user.id,
  resource: 'patients',
  action: 'update',
  scope: 'own'
})) {
  // Allow action
}
```

## Advantages (ข้อดี)

### 1. 🧩 Separation of Concerns
- **แต่ละ Layer มีหน้าที่ชัดเจน** - ง่ายต่อการทำความเข้าใจ
- **ลด Coupling** - การเปลี่ยนแปลงใน Layer หนึ่งไม่กระทบ Layer อื่น
- **เพิ่ม Cohesion** - โค้ดที่เกี่ยวข้องอยู่ด้วยกัน

### 2. 📈 Scalability
- **Horizontal Scaling** - เพิ่ม Feature ใหม่ได้ง่าย
- **Team Scaling** - หลายทีมทำงานพร้อมกันได้
- **Performance Scaling** - แยก optimize แต่ละ Layer ได้

### 3. 🔄 Reusability
- **Shared Components** - ใช้ซ้ำได้ใน Layer ต่างๆ
- **Consistent Patterns** - ใช้ pattern เดียวกันทุก Module
- **Interface-based Design** - ง่ายต่อการ Mock และ Test

### 4. 🧪 Testability
- **Unit Testing** - Test แต่ละ Layer แยกกัน
- **Integration Testing** - Test การเชื่อมต่อระหว่าง Layer
- **Mocking** - Mock dependencies ได้ง่าย

### 5. 👥 Team Development
- **Clear Ownership** - แต่ละทีมดูแล Domain/Feature ตัวเอง
- **Parallel Development** - พัฒนาพร้อมกันได้โดยไม่ชน
- **Knowledge Sharing** - Pattern เดียวกัน ง่ายต่อการสอนงาน

### 6. 🔧 Maintainability
- **Easier Debugging** - รู้ว่าปัญหาอยู่ Layer ไหน
- **Focused Changes** - แก้ไขในจุดเดียว ไม่กระทบทั้งระบบ
- **Clear Documentation** - โครงสร้างชัดเจน เข้าใจง่าย

### 7. 🏥 HIS/ERP Ready
- **Domain-Driven** - เหมาะกับ Healthcare Domain
- **Compliance Ready** - ง่ายต่อการทำ Audit Trail
- **Integration Friendly** - เชื่อมต่อ External Systems ได้ง่าย

## Disadvantages (ข้อเสีย)

### 1. 🎯 Complexity
- **Learning Curve** - ต้องเรียนรู้ Architecture ก่อน
- **Over-engineering** - อาจซับซ้อนเกินไปสำหรับโปรเจ็กต์เล็ก
- **Setup Time** - ใช้เวลาในการ Setup เริ่มต้นมาก

### 2. 📁 File Structure
- **Many Files** - มีไฟล์จำนวนมากในโปรเจ็กต์
- **Deep Nesting** - โฟลเดอร์ซ้อนกันหลายชั้น
- **Navigation** - ต้องใช้เวลาในการหาไฟล์

### 3. ⚡ Performance
- **Layer Overhead** - การผ่าน Layer หลายชั้นอาจช้า
- **Memory Usage** - ใช้ Memory มากขึ้นเพราะมี Instance หลายตัว
- **Startup Time** - ใช้เวลา Startup นานขึ้น

### 4. 🔄 Boilerplate Code
- **Repetitive Code** - มี Pattern ซ้ำๆ ในหลาย Module
- **Interface Overhead** - ต้องสร้าง Interface เยอะ
- **Type Definitions** - ต้องเขียน Type จำนวนมาก

### 5. 🔧 Development Overhead
- **Context Switching** - ต้องเปลี่ยนไฟล์บ่อย
- **Debugging Complexity** - ต้องติดตาม Flow หลาย Layer
- **Refactoring Cost** - การเปลี่ยนแปลงใหญ่ใช้เวลานาน

## When to Use This Architecture

### ✅ Suitable For:
- **Large-scale Applications** (HIS, ERP, CRM)
- **Long-term Projects** (5+ years maintenance)
- **Multiple Teams** (3+ developers)
- **Complex Business Logic**
- **High Compliance Requirements**
- **Frequent Feature Additions**

### ❌ Not Suitable For:
- **Small Projects** (< 3 months development)
- **Prototypes or MVPs**
- **Single Developer Projects**
- **Simple CRUD Applications**
- **Time-sensitive Projects**

## Best Practices

### 1. 📋 Development Guidelines
- **Follow Layer Dependencies** - ห้าม Layer ล่างเรียก Layer บน
- **Use Interfaces** - สร้าง Interface สำหรับ Service และ Repository
- **Consistent Naming** - ใช้ naming convention เดียวกัน
- **Error Handling** - จัดการ Error ที่ Layer ที่เหมาะสม

### 2. 🧪 Testing Strategy
- **Unit Tests** - Test Service และ Repository แยกกัน
- **Integration Tests** - Test Controller กับ Service
- **E2E Tests** - Test ผ่าน HTTP API
- **Mock External Dependencies** - ใช้ Mock สำหรับ Database และ External Services

### 3. 📝 Documentation
- **API Documentation** - ใช้ Swagger/OpenAPI
- **Code Comments** - อธิบาย Business Logic ที่ซับซ้อน
- **Architecture Decision Records** - บันทึกการตัดสินใจที่สำคัญ
- **README Files** - อธิบาย Setup และ Usage

### 4. 🔒 Security Considerations
- **Input Validation** - Validate ที่ API Layer
- **Authorization** - Check permission ที่ Service Layer  
- **Data Sanitization** - ทำความสะอาดข้อมูลก่อน Database
- **Audit Logging** - บันทึก User Actions ที่สำคัญ

## Getting Started

### 1. Setup Development Environment
```bash
# Install dependencies
npm install

# Setup database
npm run db:setup
npm run db:dev:migrate
npm run db:dev:seed

# Start development server
npx nx serve api
```

### 2. Create New Feature
```bash
# 1. Create feature structure
mkdir -p apps/api/src/app/features/my-feature/{controllers,services,repositories,schemas,types,routes}

# 2. Implement following the pattern:
# - Define types in types/
# - Create schemas in schemas/
# - Implement repository in repositories/
# - Implement service in services/
# - Create controller in controllers/
# - Define routes in routes/
# - Register module in index.ts

# 3. Add to API layer
# Add route to apps/api/src/app/api/routes/v1/
```

### 3. Add to Version Control
```bash
git add .
git commit -m "feat: add new feature"
```

## Migration Guide

หากต้องการย้ายจากโครงสร้างเก่า สามารถทำตามขั้นตอนนี้:

### 1. Gradual Migration
- ย้าย Core Plugins ก่อน
- ย้าย Domains ทีละตัว  
- สร้าง API Layer ใหม่
- ย้าย Infrastructure สุดท้าย

### 2. Testing During Migration
- เทียบ API Response กับของเก่า
- Run Regression Tests
- Load Testing สำหรับ Performance

### 3. Team Training
- อบรม Architecture ให้ทีม
- สร้าง Coding Guidelines
- ทำ Code Review อย่างใกล้ชิด

---

สำหรับข้อมูลเพิ่มเติม ดูใน:
- [Development Guidelines](./development-guidelines.md)
- [API Documentation](./api-documentation.md)
- [Testing Guide](./testing-guide.md)
- [Deployment Guide](./deployment-guide.md)