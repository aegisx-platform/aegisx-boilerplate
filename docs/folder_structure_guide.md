# AegisX Boilerplate - คู่มือโครงสร้าง Folder

## 📋 สารบัญ
1. [ภาพรวมโครงสร้าง](#ภาพรวมโครงสร้าง)
2. [4 ชั้นหลักของสถาปัตยกรรม](#4-ชั้นหลักของสถาปัตยกรรม)
3. [โครงสร้างไฟล์ในแต่ละ Domain](#โครงสร้างไฟล์ในแต่ละ-domain)
4. [การตั้งชื่อไฟล์และโฟลเดอร์](#การตั้งชื่อไฟล์และโฟลเดอร์)
5. [วิธีหาไฟล์ที่ต้องการแก้ไข](#วิธีหาไฟล์ที่ต้องการแก้ไข)
6. [แนวทางการพัฒนาฟีเจอร์ใหม่](#แนวทางการพัฒนาฟีเจอร์ใหม่)
7. [Best Practices](#best-practices)

---

## 🏗️ ภาพรวมโครงสร้าง

AegisX Boilerplate ใช้โครงสร้าง **Nx Monorepo** พร้อม **4-Layer Architecture** สำหรับการจัดการโปรเจกต์ขนาดใหญ่

### โครงสร้างระดับรูท

```
aegisx-boilerplate/
├── 📁 apps/                    # Nx monorepo applications
│   ├── 📁 api/                 # Main API application
│   └── 📁 api-e2e/             # End-to-end testing
├── 📁 docs/                    # คู่มือและเอกสาร
├── 📁 docker/                  # Docker configurations
├── 📁 keys/                    # Cryptographic keys (audit system)
├── 📁 tools/                   # Development tools
├── 📁 uploads/                 # File upload storage
├── 📄 package.json             # Root dependencies
├── 📄 nx.json                  # Nx workspace config
├── 📄 docker-compose.yml       # Service orchestration
├── 📄 knexfile.ts/.prod.js     # Database configurations
└── 📄 tsconfig.base.json       # TypeScript base config
```

### จุดเด่นของโครงสร้าง

- ✅ **Nx Monorepo**: จัดการหลาย applications ในที่เดียว
- ✅ **Documentation-First**: เอกสารครบถ้วนใน `/docs/`
- ✅ **Multi-Environment**: แยก config สำหรับ dev และ production
- ✅ **Infrastructure as Code**: Docker configurations

---

## 🏢 4 ชั้นหลักของสถาปัตยกรรม

โครงสร้างหลักอยู่ใน `/apps/api/src/app/` แบ่งเป็น 4 ชั้น:

```
apps/api/src/app/
├── 🏗️ core/           # ชั้นที่ 1: Infrastructure Layer
├── 🏢 domains/         # ชั้นที่ 2: Business Domains  
├── 🏥 features/        # ชั้นที่ 3: Healthcare Features
└── 🔌 infrastructure/  # ชั้นที่ 4: External Services
```

### 🏗️ ชั้นที่ 1: Core Layer - "เครื่องมือพื้นฐาน"

```
core/
├── 📄 app.ts                   # Application bootstrap
├── 📁 plugins/                 # Infrastructure plugins
│   ├── 📁 database/           # Knex + Redis connections
│   ├── 📁 security/           # JWT, RBAC, Helmet, Rate limiting
│   ├── 📁 validation/         # TypeBox validation
│   ├── 📁 monitoring/         # Health checks, metrics
│   ├── 📁 docs/              # Swagger documentation
│   ├── 📄 audit.ts           # Audit system plugin
│   ├── 📄 event-bus.ts       # Event Bus plugin
│   └── 📄 index.ts           # Plugin orchestration
├── 📁 shared/                 # Reusable components
│   ├── 📁 audit/             # Multi-adapter audit system
│   ├── 📁 events/            # Event bus implementation
│   ├── 📁 cache/             # Redis caching utilities
│   ├── 📁 middleware/        # Common middleware
│   ├── 📁 services/          # Infrastructure services
│   └── 📁 utils/             # Utility functions
└── 📁 workers/               # Background workers
    ├── 📄 redis-worker.ts    # Redis audit worker
    └── 📄 rabbitmq-audit-worker.ts
```

**หน้าที่:** จัดการระบบพื้นฐาน เช่น Database, Security, Logging, Event System

**ใช้เมื่อไหร่:**
- แก้ไขการเชื่อมต่อฐานข้อมูล
- เพิ่ม security middleware
- ปรับแต่งระบบ audit หรือ event bus

### 🏢 ชั้นที่ 2: Domains Layer - "ธุรกิจหลัก" ✅

```
domains/
├── 📁 auth/                   # ✅ Authentication & Registration
│   ├── 📁 controllers/        # HTTP request handlers
│   ├── 📁 services/          # Business logic
│   ├── 📁 repositories/      # Data access layer
│   ├── 📁 schemas/           # Validation schemas
│   ├── 📁 types/             # TypeScript interfaces
│   ├── 📁 routes/            # Route definitions
│   ├── 📁 subscribers/       # Event subscribers
│   └── 📄 index.ts           # Domain module export
├── 📁 rbac/                  # ✅ Role-Based Access Control
├── 📁 user-management/       # ✅ User Profile Management
└── 📁 audit-log/            # ✅ Audit Log Management
```

**หน้าที่:** ธุรกิจหลักที่ทุกแอปพลิเคชันต้องมี

**ใช้เมื่อไหร่:**
- พัฒนาระบบ Authentication
- จัดการสิทธิ์ผู้ใช้ (RBAC)
- ดูแลข้อมูลผู้ใช้

### 🏥 ชั้นที่ 3: Features Layer - "ระบบโรงพยาบาล" 🚧

```
features/
├── 📁 patient-management/     # 🚧 ระบบจัดการผู้ป่วย (พร้อมพัฒนา)
├── 📁 appointment-scheduling/ # 🚧 ระบบนัดหมาย
├── 📁 medical-records/       # 🚧 ประวัติการรักษา
├── 📁 billing/              # 🚧 ระบบเรียกเก็บเงิน
├── 📁 inventory/            # 🚧 คลังยาและอุปกรณ์
└── 📁 reporting/            # 🚧 ระบบรายงาน
```

**หน้าที่:** ฟีเจอร์เฉพาะสำหรับระบบสุขภาพ/โรงพยาบาล

**ใช้เมื่อไหร่:**
- พัฒนาระบบผู้ป่วย
- สร้างระบบนัดหมายแพทย์
- จัดการคลังยา

### 🔌 ชั้นที่ 4: Infrastructure Layer - "บริการภายนอก"

```
infrastructure/
├── 📁 database/
│   ├── 📁 migrations/        # Database schema evolution
│   └── 📁 seeds/            # Test/initial data
├── 📁 email/                # Email service integration
├── 📁 integrations/         # Third-party API integrations
└── 📁 storage/              # File storage services
```

**หน้าที่:** การเชื่อมต่อกับระบบภายนอก

**ใช้เมื่อไหร่:**
- เพิ่ม/แก้ไข Database schema
- ส่งอีเมล
- เชื่อมต่อ API ภายนอก

---

## 📂 โครงสร้างไฟล์ในแต่ละ Domain

ทุก domain และ feature ใช้โครงสร้างเดียวกัน:

```
domain-name/
├── 📁 controllers/           # 🎯 HTTP Request Handlers
│   └── domain-controller.ts  # รับ HTTP requests, ส่งต่อให้ service
├── 📁 services/             # 🧠 Business Logic
│   └── domain-service.ts     # ตัวจริงที่ทำงาน, เรียกใช้ repository
├── 📁 repositories/         # 🗃️ Data Access Layer
│   └── domain-repository.ts  # เข้าถึงฐานข้อมูล, cache
├── 📁 schemas/              # ✅ Validation & Serialization
│   └── domain-schemas.ts     # TypeBox schemas สำหรับ API
├── 📁 types/                # 📝 TypeScript Interfaces
│   └── domain-types.ts       # Type definitions, interfaces
├── 📁 routes/               # 🛣️ Route Definitions
│   └── domain-routes.ts      # API endpoints และ middleware
├── 📁 subscribers/          # 📡 Event Subscribers (optional)
│   └── domain-subscribers.ts # รับฟัง events จาก Event Bus
└── 📄 index.ts              # 🚪 Module Entry Point
```

### ตัวอย่างการทำงานของแต่ละไฟล์

#### 🎯 Controller - "พนักงานต้อนรับ"
```typescript
// auth-controller.ts
export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    // 1. รับข้อมูลจาก HTTP request
    // 2. ส่งต่อให้ AuthService ทำงาน
    // 3. ส่งผลลัพธ์กลับ
  }
}
```

#### 🧠 Service - "ผู้จัดการ"
```typescript
// auth-service.ts
export class AuthService {
  async login(credentials: LoginData) {
    // 1. ตรวจสอบข้อมูล
    // 2. เรียกใช้ Repository เพื่อหาผู้ใช้
    // 3. สร้าง JWT token
    // 4. ส่ง Event ผ่าน Event Bus
  }
}
```

#### 🗃️ Repository - "คลังสินค้า"
```typescript
// user-repository.ts
export class UserRepository {
  async findByEmail(email: string) {
    // 1. ค้นหาจากฐานข้อมูล
    // 2. เช็ค cache ก่อน
    // 3. ส่งข้อมูลกลับ
  }
}
```

---

## 📝 การตั้งชื่อไฟล์และโฟลเดอร์

### ✅ รูปแบบที่ใช้

#### ไฟล์ TypeScript:
- **Controllers**: `*-controller.ts`
- **Services**: `*-service.ts`
- **Repositories**: `*-repository.ts`
- **Schemas**: `*-schemas.ts`
- **Types**: `*-types.ts`
- **Routes**: `*-routes.ts`
- **Middleware**: `*-middleware.ts`

#### โฟลเดอร์:
- **Kebab-case**: `user-management`, `audit-log`, `patient-management`
- **พหูพจน์สำหรับ collections**: `controllers/`, `services/`, `types/`
- **เอกพจน์สำหรับ specific items**: `database/`, `cache/`

#### Classes และ Interfaces:
- **PascalCase**: `AuthController`, `UserService`, `LoginSchema`
- **Interfaces**: `UserData`, `LoginRequest`, `ApiResponse`

### ❌ รูปแบบที่ไม่ใช้

- `userController.ts` (camelCase)
- `auth_service.ts` (snake_case)
- `controller/` (เอกพจน์สำหรับ collection)
- `AuthControllers.ts` (พหูพจน์สำหรับ single class)

### ตัวอย่างการตั้งชื่อ

```
✅ ถูกต้อง:
- user-management/controllers/user-controller.ts
- auth/services/auth-service.ts
- rbac/repositories/role-repository.ts

❌ ผิด:
- userManagement/Controllers/UserController.ts
- auth/Services/auth_service.ts
- rbac/repository/RoleRepository.ts
```

---

## 🔍 วิธีหาไฟล์ที่ต้องการแก้ไข

### 🔐 อยากแก้ Authentication System

```
📂 Entry Point: domains/auth/
├── 🛣️ API Routes: domains/auth/routes/auth-routes.ts
├── 🎯 Controllers: domains/auth/controllers/auth-controller.ts
├── 🧠 Business Logic: domains/auth/services/auth-service.ts
├── 🗃️ Database: domains/auth/repositories/user-repository.ts
├── ✅ Validation: domains/auth/schemas/auth-schemas.ts
└── 🔒 JWT Config: core/plugins/security/jwt.ts
```

### 🛡️ อยากแก้ RBAC (สิทธิ์ผู้ใช้)

```
📂 Entry Point: domains/rbac/
├── 🛣️ API Routes: domains/rbac/routes/rbac-routes.ts
├── 🧠 Permission Logic: domains/rbac/services/rbac-service.ts
├── 🗃️ Role Data: domains/rbac/repositories/role-repository.ts
└── 🔒 Middleware: core/plugins/security/rbac.ts
```

### ⚡ อยากแก้ Event Bus

```
📂 Core System: core/shared/events/
├── 🏭 Factory: factory/event-bus-factory.ts
├── 🔌 Adapters: adapters/ (memory, redis, rabbitmq, noop)
├── 🔧 Middleware: middleware/ (logging, retry, metrics)
├── 📍 Plugin: core/plugins/event-bus.ts
└── ⚙️ Config: core/plugins/env.ts (EVENT_BUS_*)
```

### 📊 อยากแก้ Audit System

```
📂 Core System: core/shared/audit/
├── 🏭 Factory: factory/audit-adapter-factory.ts
├── 🔌 Adapters: adapters/ (direct, redis, rabbitmq)
├── 👷 Workers: core/workers/ (redis-worker, rabbitmq-audit-worker)
├── 📍 Plugin: core/plugins/audit.ts
├── 🎛️ Middleware: core/shared/middleware/audit-log-middleware.ts
└── 📊 Domain: domains/audit-log/
```

### 🗄️ อยากแก้ Database

```
📂 Database Layer:
├── 🔗 Connection: core/plugins/database/knex.ts
├── 📝 Migrations: infrastructure/database/migrations/
├── 🌱 Seeds: infrastructure/database/seeds/
└── ⚙️ Config: knexfile.ts (dev) / knexfile.prod.js (prod)
```

### 🏥 อยากเพิ่มระบบผู้ป่วย

```
📂 Healthcare Features: features/patient-management/
├── 📋 Copy Pattern จาก: domains/auth/ (เป็นตัวอย่าง)
├── 🏗️ สร้างโครงสร้าง: controllers/, services/, repositories/
├── 🔗 เพิ่ม Routes ที่: app/api/routes/v1/
└── 📊 Database: เพิ่ม migration ใน infrastructure/database/migrations/
```

---

## 🚀 แนวทางการพัฒนาฟีเจอร์ใหม่

### 1. 🏢 เพิ่ม Business Domain ใหม่

เมื่อต้องการเพิ่มธุรกิจหลักที่ทุกแอปพลิเคชันต้องมี:

```bash
# สร้างโครงสร้างใน domains/
mkdir domains/notification
cd domains/notification

# สร้างไฟล์ตามมาตรฐาน
mkdir controllers services repositories schemas types routes
touch controllers/notification-controller.ts
touch services/notification-service.ts
touch repositories/notification-repository.ts
touch schemas/notification-schemas.ts
touch types/notification-types.ts
touch routes/notification-routes.ts
touch index.ts
```

### 2. 🏥 เพิ่ม Healthcare Feature

เมื่อต้องการเพิ่มฟีเจอร์เฉพาะโรงพยาบาล:

```bash
# ใช้โครงสร้างที่มีอยู่ใน features/
cd features/patient-management

# Copy pattern จาก domain ที่ทำงานแล้ว
cp -r ../../domains/auth/* .

# แก้ไขตามความต้องการ
# - เปลี่ยน auth เป็น patient
# - ปรับ business logic
# - เปลี่ยน database tables
```

### 3. 🔧 เพิ่ม Infrastructure Component

เมื่อต้องการเพิ่มระบบพื้นฐาน:

```bash
# เพิ่ม plugin ใหม่
cd core/plugins
mkdir messaging
touch messaging/sms.ts
touch messaging/push-notification.ts

# อย่าลืมเพิ่มใน index.ts
# await fastify.register(smsPlugin);
```

### 4. 📊 เพิ่ม Database Table

```bash
# สร้าง migration
npx knex migrate:make create_patients_table

# สร้าง seed
npx knex seed:make 001_patients
```

---

## 🎯 Best Practices

### 1. 📁 การจัดระเบียบไฟล์

#### ✅ ควรทำ:
- ใช้โครงสร้างเดียวกันทุก domain
- ตั้งชื่อไฟล์ที่บอกหน้าที่ชัดเจน
- แยกไฟล์ตาม responsibility
- เขียน JSDoc สำหรับ public methods

#### ❌ ไม่ควรทำ:
- วางไฟล์ผิดชั้น (เช่น วาง controller ใน core/)
- รวมหลาย responsibility ในไฟล์เดียว
- ใช้ชื่อไฟล์ทั่วไป (เช่น utils.ts, helpers.ts)

### 2. 🔗 Dependencies และ Imports

#### ✅ ควรทำ:
```typescript
// แยก imports ตาม layer
import { FastifyInstance } from 'fastify'           // External
import { AuthService } from '../services'          // Same domain
import { UserRepository } from '../repositories'   // Same domain
import { EventBus } from '../../../core/shared'    // Core layer
```

#### ❌ ไม่ควรทำ:
```typescript
// อย่า import จาก domain อื่นโดยตรง
import { UserService } from '../../user-management/services' // ❌

// ใช้ Event Bus แทน
await this.eventBus.publish('user.updated', userData) // ✅
```

### 3. 🚀 Plugin Loading Order

Plugin ต้องโหลดตามลำดับที่ถูกต้อง:

```typescript
// core/plugins/index.ts
await fastify.register(env);           // 1. Environment first
await fastify.register(sensible);      // 2. Validation helpers  
await fastify.register(redis);         // 3. Cache layer
await fastify.register(knex);          // 4. Database
await fastify.register(jwt);           // 5. Authentication
await fastify.register(rateLimit);     // 6. Security
await fastify.register(rbac);          // 7. Authorization
await fastify.register(eventBus);      // 8. Event system
await fastify.register(audit);         // 9. Auditing
await fastify.register(healthCheck);   // 10. Monitoring
```

### 4. 🔒 Security Considerations

#### Controller Level:
```typescript
// ใช้ RBAC middleware
fastify.get('/admin/users', {
  preHandler: [
    fastify.authenticate,
    fastify.authorize('users:read:all')
  ]
}, userController.getAll)
```

#### Service Level:
```typescript
// ตรวจสอบสิทธิ์เพิ่มเติม
async deleteUser(userId: string, currentUser: User) {
  // ห้ามลบตัวเอง
  if (userId === currentUser.id) {
    throw new Error('Cannot delete yourself')
  }
}
```

### 5. 📝 Error Handling

#### Consistent Error Format:
```typescript
// ใช้ Fastify error format
throw fastify.httpErrors.badRequest('Invalid credentials')
throw fastify.httpErrors.unauthorized('Access denied')
throw fastify.httpErrors.forbidden('Insufficient permissions')
```

#### Service Layer:
```typescript
try {
  await this.userRepository.create(userData)
} catch (error) {
  // Log และ re-throw
  fastify.log.error('User creation failed', { error, userData })
  throw new Error('Failed to create user')
}
```

### 6. 📊 Database Best Practices

#### Migration Naming:
```bash
# ใช้ timestamp + description
20241225120000_create_patients_table.ts
20241225120001_add_phone_to_users.ts
20241225120002_create_appointments_table.ts
```

#### Repository Pattern:
```typescript
export class UserRepository {
  // เขียน method ที่ชัดเจน
  async findById(id: string): Promise<User | null>
  async findByEmail(email: string): Promise<User | null>
  async create(userData: CreateUserData): Promise<User>
  async update(id: string, updates: Partial<User>): Promise<User>
  async delete(id: string): Promise<void>
}
```

### 7. 🎭 Event-Driven Architecture

#### Publishing Events:
```typescript
// Service ส่ง events
await this.eventBus.publish('user.created', {
  userId: user.id,
  email: user.email,
  createdAt: new Date()
})
```

#### Subscribing to Events:
```typescript
// Subscriber รับ events
await fastify.eventBus.subscribe('user.created', async (data) => {
  // ส่งอีเมลต้อนรับ
  await emailService.sendWelcomeEmail(data.email)
  
  // อัพเดท analytics
  await analyticsService.trackUserRegistration(data.userId)
})
```

---

## 🎉 สรุป

โครงสร้าง AegisX Boilerplate ออกแบบมาเพื่อ:

### ✅ **ข้อดี**
- **📖 อ่านง่าย**: แต่ละชั้นมีหน้าที่ชัดเจน
- **🔧 แก้ไขง่าย**: รู้ว่าต้องไปแก้ไขที่ไหน
- **📈 ขยายง่าย**: เพิ่มฟีเจอร์ใหม่ได้เรื่อยๆ
- **👥 ทำงานร่วมกันได้**: แต่ละทีมดูแลแต่ละ domain
- **🚀 Production-Ready**: พร้อมใช้งานจริง

### 🎯 **เหมาะสำหรับ**
- ระบบโรงพยาบาล/คลินิก
- ระบบ ERP
- แอปพลิเคชันที่ต้องการ audit trails
- ระบบที่มีผู้ใช้หลายสิทธิ์
- แอปพลิเคชันขนาดใหญ่ที่ต้องการ scalability

### 💡 **คำแนะนำสำหรับผู้เริ่มต้น**
1. **เริ่มจาก** `domains/auth/` เพื่อดูตัวอย่าง
2. **อ่านเอกสาร** ใน `docs/` ก่อนเขียนโค้ด
3. **ทำความเข้าใจ** plugin loading order
4. **ใช้ Event Bus** สำหรับการสื่อสารระหว่าง domains
5. **เปิด** `EVENT_BUS_ENABLED=false` ตอน testing

**คิดง่ายๆ**: เหมือนตึกแบ่งเป็นชั้นๆ แต่ละชั้นมีหน้าที่ต่างกัน! 🏢