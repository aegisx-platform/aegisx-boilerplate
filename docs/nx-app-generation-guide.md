# 🏗️ Nx App Generation Guide - AegisX Boilerplate

## Overview
This guide covers how to create new Angular apps and Node.js APIs within the existing AegisX Nx monorepo. Perfect for scaling your application with multiple frontends, microservices, or specialized services.

## Prerequisites
- Existing AegisX Nx monorepo setup
- Node.js and npm installed
- Nx CLI available (`npx nx`)

---

## 🎯 Angular Applications

### Create New Angular App
```bash
# Basic Angular app
npx nx g @nx/angular:application my-new-app

# Angular app with specific options
npx nx g @nx/angular:application admin-panel \
  --style=scss \
  --routing=true \
  --standalone=true \
  --unitTestRunner=jest \
  --e2eTestRunner=none
```

### Angular App Options
```bash
# Full options example
npx nx g @nx/angular:application patient-portal \
  --style=scss \              # CSS preprocessor (scss/css/less)
  --routing=true \             # Include Angular Router
  --standalone=true \          # Use standalone components
  --prefix=app \               # Component prefix
  --unitTestRunner=jest \      # Test runner
  --e2eTestRunner=none \       # E2E test runner
  --strict=true \              # TypeScript strict mode
  --enableIvy=true            # Enable Ivy renderer
```

### Common Angular App Use Cases

#### 1. **Admin Dashboard**
```bash
npx nx g @nx/angular:application admin-dashboard \
  --style=scss \
  --routing=true \
  --standalone=true

# Structure:
apps/admin-dashboard/
├── src/
│   ├── app/
│   ├── assets/
│   └── main.ts
├── project.json
└── tsconfig.app.json
```

#### 2. **Patient Portal**
```bash
npx nx g @nx/angular:application patient-portal \
  --style=scss \
  --routing=true \
  --standalone=true

# Add to package.json scripts:
"start:patient": "npx nx serve patient-portal"
```

#### 3. **Doctor Portal**
```bash
npx nx g @nx/angular:application doctor-portal \
  --style=scss \
  --routing=true \
  --standalone=true
```

#### 4. **Mobile App (Ionic)**
```bash
# First install Ionic
npm install -g @ionic/cli

# Generate Angular app for mobile
npx nx g @nx/angular:application mobile-app \
  --style=scss \
  --standalone=true

# Add Ionic after generation
cd apps/mobile-app
ionic integrations enable capacitor
```

---

## ⚙️ Node.js API Applications

### Create New Node.js API
```bash
# Basic Node.js app
npx nx g @nx/node:application my-api

# Node.js app with specific options
npx nx g @nx/node:application auth-service \
  --framework=none \
  --bundler=esbuild \
  --unitTestRunner=jest
```

### Node.js API Options
```bash
# Full options example
npx nx g @nx/node:application notification-service \
  --framework=express \       # Framework (express/fastify/none)
  --bundler=esbuild \         # Bundler (esbuild/webpack)
  --unitTestRunner=jest \     # Test runner
  --linter=eslint \           # Linter
  --js=false                  # Use TypeScript
```

### Convert to Fastify API
```bash
# 1. Generate Node.js app
npx nx g @nx/node:application payment-service \
  --framework=none \
  --bundler=esbuild

# 2. Install Fastify
cd apps/payment-service
npm install fastify

# 3. Update main.ts with Fastify setup
```

### Common Node.js API Use Cases

#### 1. **Authentication Service**
```bash
npx nx g @nx/node:application auth-api \
  --framework=none \
  --bundler=esbuild

# Structure:
apps/auth-api/
├── src/
│   ├── app/
│   └── main.ts
├── project.json
└── tsconfig.app.json
```

#### 2. **Notification Service**
```bash
npx nx g @nx/node:application notification-api \
  --framework=none \
  --bundler=esbuild

# Use existing notification domain code
# Copy from apps/api/src/app/domains/notification/
```

#### 3. **File Upload Service**
```bash
npx nx g @nx/node:application upload-service \
  --framework=none \
  --bundler=esbuild

# Dedicated service for file handling
```

#### 4. **Payment Service**
```bash
npx nx g @nx/node:application payment-service \
  --framework=none \
  --bundler=esbuild

# Handle payment processing
```

---

## 📚 Shared Libraries

### Create Shared Libraries
```bash
# TypeScript library
npx nx g @nx/js:library shared-utils

# Angular library
npx nx g @nx/angular:library ui-components

# Node.js library
npx nx g @nx/node:library business-logic
```

### Library Options
```bash
# Full options example
npx nx g @nx/js:library validation-utils \
  --unitTestRunner=jest \
  --linter=eslint \
  --js=false \                # Use TypeScript
  --publishable=true \        # Can be published to npm
  --buildable=true           # Can be built independently
```

### Common Shared Libraries

#### 1. **UI Components Library**
```bash
npx nx g @nx/angular:library ui-components \
  --buildable=true \
  --publishable=true

# Share Angular components across apps
```

#### 2. **Business Logic Library**
```bash
npx nx g @nx/js:library business-logic \
  --buildable=true

# Share business rules between frontend/backend
```

#### 3. **Validation Library**
```bash
npx nx g @nx/js:library validation-schemas \
  --buildable=true

# Share validation schemas (TypeBox/Zod)
```

#### 4. **Utilities Library**
```bash
npx nx g @nx/js:library shared-utils \
  --buildable=true

# Common utility functions
```

---

## 🔄 Development Workflow

### Running Multiple Apps
```bash
# Run specific apps
npx nx serve web                    # Main Angular app
npx nx serve admin-dashboard        # Admin dashboard
npx nx serve auth-service          # Auth API

# Run multiple apps in parallel
npx nx run-many --target=serve --projects=api,web,admin-dashboard --parallel

# Run all apps
npx nx run-many --target=serve --all --parallel
```

### Building Apps
```bash
# Build specific apps
npx nx build web
npx nx build admin-dashboard
npx nx build auth-service

# Build all apps
npx nx run-many --target=build --all --parallel

# Build with production configuration
npx nx build web --configuration=production
```

### Testing Apps
```bash
# Test specific apps
npx nx test web
npx nx test admin-dashboard
npx nx test auth-service

# Test all apps
npx nx run-many --target=test --all
```

---

## 📦 Package.json Scripts

### Update package.json with new scripts
```json
{
  "scripts": {
    // Existing scripts...
    "start": "npx nx run-many --target=serve --projects=api,web --parallel",
    
    // New Angular apps
    "start:admin": "npx nx serve admin-dashboard",
    "start:patient": "npx nx serve patient-portal",
    "start:doctor": "npx nx serve doctor-portal",
    
    // New API services
    "start:auth": "npx nx serve auth-service",
    "start:notification": "npx nx serve notification-service",
    "start:payment": "npx nx serve payment-service",
    
    // Multi-app commands
    "start:frontend": "npx nx run-many --target=serve --projects=web,admin-dashboard,patient-portal --parallel",
    "start:backend": "npx nx run-many --target=serve --projects=api,auth-service,notification-service --parallel",
    "start:all": "npx nx run-many --target=serve --all --parallel",
    
    // Build commands
    "build:frontend": "npx nx run-many --target=build --projects=web,admin-dashboard,patient-portal --parallel",
    "build:backend": "npx nx run-many --target=build --projects=api,auth-service,notification-service --parallel",
    "build:libs": "npx nx run-many --target=build --projects=types,api-client,ui-components --parallel"
  }
}
```

---

## 🏗️ Project Structure After Generation

### Complete Monorepo Structure
```
workspace-root/
├── apps/                           # 🎯 Applications
│   ├── api/                       # ✅ Main Fastify API
│   ├── web/                       # ✅ Main Angular App
│   ├── admin-dashboard/           # 🆕 Admin Angular App
│   ├── patient-portal/            # 🆕 Patient Angular App
│   ├── doctor-portal/             # 🆕 Doctor Angular App
│   ├── auth-service/              # 🆕 Auth Node.js API
│   ├── notification-service/      # 🆕 Notification Node.js API
│   └── payment-service/           # 🆕 Payment Node.js API
├── libs/                          # 📚 Shared Libraries
│   ├── shared/
│   │   ├── types/                 # ✅ TypeScript Interfaces
│   │   ├── api-client/            # ✅ API Client
│   │   ├── ui-components/         # 🆕 Angular Components
│   │   ├── validation-schemas/    # 🆕 Validation Rules
│   │   └── business-logic/        # 🆕 Business Rules
│   └── utils/
│       └── shared-utils/          # 🆕 Common Utilities
├── docs/                          # 📖 Documentation
├── tools/                         # 🛠️ Development Tools
└── package.json                   # 📦 Dependencies & Scripts
```

---

## 🎯 Use Case Examples

### 1. **Multi-Tenant Healthcare System**
```bash
# Create tenant-specific apps
npx nx g @nx/angular:application hospital-admin --style=scss --routing=true
npx nx g @nx/angular:application clinic-portal --style=scss --routing=true
npx nx g @nx/angular:application pharmacy-app --style=scss --routing=true

# Shared components
npx nx g @nx/angular:library healthcare-ui --buildable=true
```

### 2. **Microservices Architecture**
```bash
# Create specialized APIs
npx nx g @nx/node:application patient-api --framework=none
npx nx g @nx/node:application appointment-api --framework=none
npx nx g @nx/node:application billing-api --framework=none
npx nx g @nx/node:application inventory-api --framework=none

# Shared business logic
npx nx g @nx/js:library healthcare-core --buildable=true
```

### 3. **Multi-Platform Frontend**
```bash
# Web applications
npx nx g @nx/angular:application web-app --style=scss
npx nx g @nx/angular:application admin-web --style=scss

# Mobile application
npx nx g @nx/angular:application mobile-app --style=scss
# Add Ionic/Capacitor later

# Desktop application (Electron)
npx nx g @nx/angular:application desktop-app --style=scss
# Add Electron later
```

---

## 🔧 Configuration & Setup

### TypeScript Configuration Updates

#### 1. **Update tsconfig.base.json Path Mappings**
หลังจากสร้าง apps หรือ libraries ใหม่ ต้องเพิ่ม path mapping:

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      // Existing paths
      "@aegisx-boilerplate/api-client": ["libs/shared/api-client/src/index.ts"],
      "@aegisx-boilerplate/types": ["libs/shared/types/src/index.ts"],
      
      // New libraries - เพิ่มตามที่สร้างใหม่
      "@aegisx-boilerplate/ui-components": ["libs/shared/ui-components/src/index.ts"],
      "@aegisx-boilerplate/business-logic": ["libs/shared/business-logic/src/index.ts"],
      "@aegisx-boilerplate/validation-schemas": ["libs/shared/validation-schemas/src/index.ts"],
      "@aegisx-boilerplate/shared-utils": ["libs/utils/shared-utils/src/index.ts"]
    }
  }
}
```

#### 2. **Angular App TypeScript Configuration**
แต่ละ Angular app จะมี `tsconfig.app.json` แยก:

```json
// apps/admin-dashboard/tsconfig.app.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": []
  },
  "files": [
    "src/main.ts"
  ],
  "include": [
    "src/**/*.d.ts"
  ],
  "exclude": [
    "jest.config.ts",
    "src/**/*.test.ts",
    "src/**/*.spec.ts"
  ]
}
```

#### 3. **Node.js API TypeScript Configuration**
แต่ละ Node.js API จะใช้ CommonJS modules:

```json
// apps/auth-service/tsconfig.app.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "module": "commonjs",
    "types": ["node"],
    "emitDecoratorMetadata": true,
    "target": "es2021"
  },
  "exclude": [
    "jest.config.ts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts"
  ],
  "include": ["src/**/*.ts"]
}
```

#### 4. **Library TypeScript Configuration**
แต่ละ library จะมี `tsconfig.lib.json`:

```json
// libs/shared/ui-components/tsconfig.lib.json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "inlineSources": true,
    "types": []
  },
  "exclude": [
    "src/**/*.spec.ts",
    "src/**/*.test.ts",
    "jest.config.ts"
  ],
  "include": ["src/**/*.ts"]
}
```

### การแก้ไข tsconfig.base.json ตามประเภท Environment

#### **สำหรับ Mixed Environment (ปัจจุบัน)**
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "esnext",           // รองรับทั้ง Angular และ Node.js
    "lib": ["es2020", "dom"],     // รองรับทั้ง browser และ node
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "downlevelIteration": true    // สำหรับ Map/Set iteration
  }
}
```

#### **ถ้าต้องการแยก Environment (Advanced)**
สร้าง base configs แยก:

```bash
# สร้าง config แยกตาม environment
touch tsconfig.base.node.json      # สำหรับ Node.js APIs
touch tsconfig.base.angular.json   # สำหรับ Angular Apps
```

```json
// tsconfig.base.node.json (Node.js specific)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2021",
    "lib": ["es2021"],
    "types": ["node"]
  }
}
```

```json
// tsconfig.base.angular.json (Angular specific)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "es2022",
    "target": "es2022",
    "lib": ["es2022", "dom"],
    "types": []
  }
}
```

### Shared Library Import Configuration

#### **ใน Angular Apps**
```typescript
// apps/admin-dashboard/src/app/app.component.ts
import { UserType } from '@aegisx-boilerplate/types';
import { NotificationClient } from '@aegisx-boilerplate/api-client';
import { ButtonComponent } from '@aegisx-boilerplate/ui-components';
```

#### **ใน Node.js APIs**
```typescript
// apps/auth-service/src/app/auth.service.ts
import { UserType, LoginRequest } from '@aegisx-boilerplate/types';
import { validateUser } from '@aegisx-boilerplate/validation-schemas';
import { hashPassword } from '@aegisx-boilerplate/shared-utils';
```

### Proxy Configuration for New Apps
When creating new Angular apps that need to call APIs, create proxy configuration:

```bash
# Create proxy.conf.json for new Angular app
# apps/admin-dashboard/proxy.conf.json
```

```json
{
  "/api/*": {
    "target": "http://localhost:3000",
    "secure": true,
    "changeOrigin": true
  },
  "/auth/*": {
    "target": "http://localhost:3001",
    "secure": true,
    "changeOrigin": true
  }
}
```

### Update Angular project.json
```json
{
  "serve": {
    "builder": "@angular-devkit/build-angular:dev-server",
    "options": {
      "proxyConfig": "apps/admin-dashboard/proxy.conf.json"
    }
  }
}
```

---

## 🚀 Best Practices

### 1. **Naming Conventions**
```bash
# Angular apps: kebab-case with clear purpose
admin-dashboard, patient-portal, doctor-portal

# Node.js APIs: kebab-case with -service/-api suffix
auth-service, payment-api, notification-service

# Libraries: kebab-case with clear domain
ui-components, business-logic, validation-schemas
```

### 2. **Port Management**
```bash
# Default ports for different services
3000 - Main API (Fastify)
4200 - Main Web App (Angular)
4201 - Admin Dashboard
4202 - Patient Portal
4203 - Doctor Portal
3001 - Auth Service
3002 - Notification Service
3003 - Payment Service
```

### 3. **Shared Dependencies**
- Use shared libraries for common code
- Keep apps lightweight and focused
- Share types between frontend and backend
- Use consistent styling across Angular apps

### 4. **Development Workflow**
- Start with main apps (API + Web)
- Add specialized apps as needed
- Use parallel serving for development
- Build all apps for production deployment

---

## 📚 Additional Resources

- **Nx Documentation**: https://nx.dev/getting-started/intro
- **Angular Generators**: https://nx.dev/nx-api/angular
- **Node.js Generators**: https://nx.dev/nx-api/node
- **Workspace Configuration**: https://nx.dev/reference/project-configuration

---

## 🔍 Troubleshooting

### Common Issues

#### 1. **Port Conflicts**
```bash
# Change port in project.json
"serve": {
  "options": {
    "port": 4201
  }
}
```

#### 2. **TypeScript Configuration Errors**

**Path Mapping Not Working:**
```bash
# 1. Check tsconfig.base.json has correct paths
# 2. Rebuild shared libraries
npx nx run-many --target=build --projects=types,api-client,ui-components --parallel

# 3. Clean and rebuild all
npx nx reset
npx nx run-many --target=build --all
```

**Module Resolution Errors:**
```bash
# For Node.js apps getting browser types
# Check apps/your-api/tsconfig.app.json has:
{
  "compilerOptions": {
    "module": "commonjs",
    "types": ["node"]  // Only Node.js types
  }
}

# For Angular apps getting Node.js types  
# Check apps/your-app/tsconfig.app.json has:
{
  "compilerOptions": {
    "module": "es2022",
    "types": []  // No Node.js types
  }
}
```

**Import Errors in New Apps:**
```bash
# If new library imports don't work:

# 1. Verify path in tsconfig.base.json
"@aegisx-boilerplate/new-lib": ["libs/path/to/new-lib/src/index.ts"]

# 2. Check library exports in index.ts
export * from './lib/your-feature';

# 3. Rebuild library
npx nx build new-lib

# 4. Restart TypeScript server in VS Code
Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

**Build Errors After Adding New Apps:**
```bash
# Mixed module systems error
# Ensure each app has correct tsconfig.app.json:

# Node.js API:
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "types": ["node"]
  }
}

# Angular App:  
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": []
  }
}
```

#### 3. **Import Path Issues**
```bash
# Check tsconfig.base.json path mappings
# Ensure shared libraries are properly configured

# Common fixes:
# 1. Restart TS server
# 2. Clear node_modules and reinstall
# 3. Rebuild all libraries
# 4. Check exact path in paths mapping
```

#### 4. **Library Build Issues**
```bash
# If shared library won't build:

# Check libs/your-lib/project.json
{
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "options": {
        "main": "libs/your-lib/src/index.ts",
        "tsConfig": "libs/your-lib/tsconfig.lib.json"
      }
    }
  }
}

# Rebuild dependencies first
npx nx build-deps your-lib
npx nx build your-lib
```

---

## ✅ Step-by-Step Checklist

### After Creating New Angular App
```bash
# 1. Generate Angular app
npx nx g @nx/angular:application my-new-app --style=scss --routing=true --standalone=true

# 2. Add to tsconfig.base.json paths (if creating library)
# 3. Create proxy.conf.json for API calls
# 4. Update Angular project.json with proxy config
# 5. Add npm script to package.json
# 6. Test build and serve
npx nx build my-new-app
npx nx serve my-new-app

# 7. Verify imports work
# Import shared types/clients in components
```

### After Creating New Node.js API
```bash
# 1. Generate Node.js app
npx nx g @nx/node:application my-api --framework=none --bundler=esbuild

# 2. Install Fastify (for consistency)
cd apps/my-api
npm install fastify

# 3. Update main.ts with Fastify setup
# 4. Update tsconfig.app.json with Node.js settings:
{
  "compilerOptions": {
    "module": "commonjs",
    "types": ["node"]
  }
}

# 5. Add npm script to package.json
# 6. Test build and serve
npx nx build my-api
npx nx serve my-api

# 7. Verify shared library imports work
```

### After Creating New Shared Library
```bash
# 1. Generate library
npx nx g @nx/js:library my-library --buildable=true

# 2. Add to tsconfig.base.json paths:
"@aegisx-boilerplate/my-library": ["libs/path/to/my-library/src/index.ts"]

# 3. Export from index.ts
export * from './lib/my-feature';

# 4. Build library first
npx nx build my-library

# 5. Import in other apps
import { MyFeature } from '@aegisx-boilerplate/my-library';

# 6. Test imports in both Angular and Node.js apps
```

---

## 📋 Quick Reference Commands

```bash
# Generate apps
npx nx g @nx/angular:application my-app --style=scss --routing=true --standalone=true
npx nx g @nx/node:application my-api --framework=none --bundler=esbuild
npx nx g @nx/js:library my-lib --buildable=true

# Build & serve
npx nx build my-app
npx nx serve my-app
npx nx serve my-api

# Multi-app commands
npx nx run-many --target=serve --projects=api,web,my-app --parallel
npx nx run-many --target=build --all

# Troubleshooting
npx nx reset                    # Clear cache
npx nx build my-lib            # Build library first
npx nx build-deps my-app       # Build dependencies
```

---

This guide provides a comprehensive overview of creating new applications within the AegisX Nx monorepo. Use it as a reference for scaling your healthcare application with multiple frontends and microservices.