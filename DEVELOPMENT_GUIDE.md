# 🚀 Development Guide - AegisX Boilerplate

## 📋 Quick Start

### 🏃‍♂️ **Start Development (Both API + Frontend)**
```bash
npm start                    # รัน API + Angular พร้อมกัน
# หรือ
npm run start:api           # รัน API อย่างเดียว (port 3000)
npm run start:web           # รัน Angular อย่างเดียว (port 4200)
```

### 🔨 **Build Commands**
```bash
npm run build               # Build ทั้งหมด (API + Angular)
npm run build:api           # Build API อย่างเดียว
npm run build:web           # Build Angular อย่างเดียว
npm run build:libs          # Build shared libraries
```

### 🧪 **Testing Commands**
```bash
npm test                    # รัน tests ทั้งหมด
npm run test:api            # Test API อย่างเดียว
npm run test:web            # Test Angular อย่างเดียว
```

### 🔍 **Code Quality**
```bash
npm run lint                # Lint ทั้งหมด
npm run lint:api            # Lint API อย่างเดียว
npm run lint:web            # Lint Angular อย่างเดียว
npm run typecheck           # TypeScript type checking
npm run format              # Format code ด้วย Prettier
npm run format:check        # เช็ค code formatting
```

### 🗄️ **Database Commands**
```bash
# Development Database
npm run db:dev:migrate      # รัน migrations (dev)
npm run db:dev:seed         # รัน seed data (dev)
npm run db:dev:status       # เช็คสถานะ migrations (dev)

# Production Database
npm run db:migrate          # รัน migrations (prod)
npm run db:seed             # รัน seed data (prod)
npm run db:reset            # Reset database + ใส่ seed data ใหม่
npm run db:status           # เช็คสถานะ migrations
```

### 🐳 **Docker Commands**
```bash
npm run docker:up           # เปิด Docker services ทั้งหมด
npm run docker:down         # ปิด Docker services
npm run docker:logs         # ดู logs ของ Docker services
```

### 📊 **Monitoring & Logs**
```bash
npm run logs:seq            # เปิด Seq logging (http://localhost:5341)
npm run logs:grafana        # เปิด Grafana + Loki (http://localhost:3001)
npm run logs:graylog        # เปิด Graylog (http://localhost:9000)
```

### 🛠️ **Development Tools**
```bash
npm run clean               # ล้าง cache และ build files
npm run deps:check          # ดู dependency graph ด้วย Nx
```

---

## 🌐 **Service URLs**

| Service | URL | Description |
|---------|-----|-------------|
| **API Server** | http://localhost:3000 | Fastify API Server |
| **API Docs** | http://localhost:3000/docs | Swagger API Documentation |
| **Angular App** | http://localhost:4200 | Angular Frontend |
| **pgAdmin** | http://localhost:8080 | Database Management |
| **Seq Logs** | http://localhost:5341 | Log Analysis (when enabled) |
| **Grafana** | http://localhost:3001 | Metrics Dashboard (when enabled) |
| **Graylog** | http://localhost:9000 | Centralized Logging (when enabled) |

---

## 🏗️ **Development Workflow**

### 1. **เริ่มต้นโปรเจกต์ใหม่**
```bash
# 1. Setup database
npm run db:setup
npm run db:dev:migrate
npm run db:dev:seed

# 2. Start development servers
npm start

# 3. เปิด browser ไปที่:
# - API: http://localhost:3000/docs
# - Frontend: http://localhost:4200
```

### 2. **การพัฒนาปกติ**
```bash
# รัน development servers
npm start

# ใน terminal อื่น - เช็ค code quality
npm run lint
npm run typecheck

# Build เพื่อเช็คว่าไม่มี error
npm run build
```

### 3. **เมื่อเพิ่ม features ใหม่**
```bash
# สร้าง migration ใหม่
npm run db:make:migration create_new_feature

# สร้าง seed data
npm run db:make:seed new_feature_data

# รัน migration และ seed
npm run db:dev:migrate
npm run db:dev:seed
```

### 4. **ก่อน commit code**
```bash
# เช็ค code quality
npm run lint
npm run typecheck
npm run format:check

# รัน tests
npm test

# Build เพื่อให้แน่ใจว่าไม่มี error
npm run build
```

---

## 📚 **Shared Libraries Usage**

### **ใช้ Shared Types**
```typescript
// apps/api/src/controllers/user.controller.ts
import { UserType } from '@aegisx-boilerplate/types';

// apps/web/src/services/user.service.ts
import { UserType } from '@aegisx-boilerplate/types';
```

### **ใช้ API Client**
```typescript
// apps/web/src/services/notification.service.ts
import { NotificationClient } from '@aegisx-boilerplate/api-client';

const client = new NotificationClient('http://localhost:3000');
const notifications = await client.getNotifications();
```

---

## 🔧 **Troubleshooting**

### **Build Issues**
```bash
# ล้าง cache และลองใหม่
npm run clean
npm install
npm run build
```

### **Database Issues**
```bash
# Reset database
npm run db:reset

# หรือ reset ทีละขั้น
npm run db:dev:rollback
npm run db:dev:migrate
npm run db:dev:seed
```

### **Port Conflicts**
- **API (3000)**: เปลี่ยนใน `.env` → `PORT=3001`
- **Angular (4200)**: เปลี่ยนใน `apps/web/project.json` → `"port": 4201`

### **TypeScript Errors**
```bash
# เช็ค TypeScript configuration
npm run typecheck

# ถ้ามี path mapping issues
npm run clean
npm run build:libs
npm run build
```

---

## 📖 **Additional Documentation**

- **API Documentation**: `/docs/` directory
- **Architecture Guide**: `/docs/folder_structure_guide.md`
- **Feature Summary**: `/docs/feature-summary.md`
- **TypeScript Guide**: `/docs/typescript-configuration-guide.md`