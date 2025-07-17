# Nx & TypeScript Configuration Guide

## Critical Development Rules

### ❌ NEVER Touch These Nx Configurations

```json
// ❌ NEVER CHANGE - Nx uses workspace-relative paths
"main": "apps/api/src/main.ts",           // ✅ Correct
"tsConfig": "apps/api/tsconfig.app.json", // ✅ Correct  
"outputPath": "apps/api/dist",            // ✅ Correct

// ❌ WRONG - Breaking Nx conventions
"main": "src/main.ts",        // ❌ Don't use relative paths
"tsConfig": "tsconfig.app.json", // ❌ Missing workspace context
"outputPath": "dist",            // ❌ Wrong output location
```

### 🔧 TypeScript Configuration Structure

#### Dual Setup for Node.js + Angular
```
tsconfig.base.json          # Base configuration shared by all projects
├── apps/api/tsconfig.app.json      # API-specific (Node.js, CommonJS)
├── apps/web/tsconfig.app.json      # Angular-specific (Browser, ES modules)
├── libs/shared/types/tsconfig.lib.json        # Shared types
└── libs/shared/api-client/tsconfig.lib.json   # API client
```

## Common TypeScript Build Issues

### 1. Iterator Downlevel Compilation
```typescript
// ❌ Problem: Map/Set iterators don't work with strict TS config
for (const item of map.values()) // Causes TS2802 error

// ✅ Solution: Use Array.from() wrapper
for (const item of Array.from(map.values()))
```

### 2. Module Import Compatibility
```typescript
// ❌ Problem: Mixed CommonJS/ES modules
import winston from 'winston'      // Fails with nodenext
import Transport from 'winston-transport'

// ✅ Solution: Use compatible imports
import * as winston from 'winston'
const Transport = require('winston-transport')
```

### 3. Required TypeScript Flags
```json
// ✅ Required in tsconfig.base.json for Node.js projects
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "downlevelIteration": true,    // Critical for Map/Set iteration
    "skipLibCheck": true,          // Skip problematic node_modules types
    "strict": true,
    "target": "ES2020",
    "module": "commonjs"           // For Node.js compatibility
  }
}
```

## TypeScript Configuration Files

### Base Configuration (`tsconfig.base.json`)
```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "downlevelIteration": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@aegisx-boilerplate/types": ["libs/shared/types/src/index.ts"],
      "@aegisx-boilerplate/api-client": ["libs/shared/api-client/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp"]
}
```

### API Configuration (`apps/api/tsconfig.app.json`)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/apps/api",
    "module": "commonjs",
    "target": "ES2020",
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

### Angular Configuration (`apps/web/tsconfig.app.json`)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/apps/web",
    "module": "ES2020",
    "target": "ES2020",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

## Build Process Troubleshooting

### Development Process Checklist

#### Before Making Configuration Changes:
- [ ] ❓ **Ask**: "Am I breaking Nx conventions?"
- [ ] ❓ **Ask**: "Do I understand why the build is failing?"
- [ ] ❓ **Ask**: "Is this a TypeScript issue, not a path issue?"
- [ ] 🔍 **Check**: Review error messages carefully
- [ ] 🔍 **Check**: Test with minimal changes first

#### When Build Fails:
1. 🎯 **Identify Root Cause**: TypeScript compilation vs path resolution
2. 🔧 **Fix TypeScript Issues First**: Before touching Nx config
3. 🚫 **Never Assume**: Path issues when seeing compilation errors
4. ✅ **Test Incrementally**: One fix at a time

### Common Build Errors & Solutions

#### Error: "Cannot find module or its corresponding type declarations"
```bash
# Solution: Add to tsconfig.base.json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "skipDefaultLibCheck": true
  }
}
```

#### Error: "Type 'IterableIterator<T>' is not an array type"
```typescript
// Problem: Direct iteration over Map/Set
for (const value of map.values()) { }

// Solution: Use Array.from()
for (const value of Array.from(map.values())) { }
```

#### Error: "Module has no default export"
```typescript
// Problem: CommonJS/ES module mismatch
import winston from 'winston';

// Solution: Use namespace import
import * as winston from 'winston';
```

## Emergency Recovery Process

If Nx builds break due to configuration changes:

```bash
# 1. Revert workspace-relative paths in apps/*/project.json
git checkout -- apps/api/project.json
git checkout -- apps/web/project.json

# 2. Check tsconfig.base.json has proper Node.js flags
# Ensure downlevelIteration, esModuleInterop are true

# 3. Fix TypeScript compilation errors in code
npm run typecheck

# 4. Test incrementally
nx build api
nx build web
```

## Best Practices

### TypeScript Development
1. **Always use strict mode** - Catch errors early
2. **Use namespace imports** for Node.js modules
3. **Enable downlevelIteration** for Map/Set usage
4. **Skip lib checks** to avoid node_modules issues
5. **Test TypeScript compilation** separately from builds

### Nx Workspace
1. **Never modify workspace-relative paths** in project.json
2. **Use Nx commands** instead of direct TypeScript compilation
3. **Understand the difference** between workspace and project configs
4. **Test changes incrementally** with nx build
5. **Use affected commands** to speed up builds

### Configuration Management
1. **Backup configurations** before making changes
2. **Document reasons** for any deviations from defaults
3. **Test in isolation** before committing changes
4. **Ask for help** before breaking Nx conventions
5. **Use version control** to track configuration changes

## Key Lessons from Past Issues

### What Went Wrong
- ❌ **Misdiagnosed build errors** as path issues instead of TypeScript compilation
- ❌ **Broke Nx conventions** by changing workspace-relative paths
- ❌ **Created new problems** while trying to fix unrelated issues
- ❌ **Didn't verify root cause** before making configuration changes

### What Worked
- ✅ **Fixed TypeScript compilation issues** in code, not config
- ✅ **Used proper module imports** for Node.js compatibility
- ✅ **Enabled required TypeScript flags** for Map/Set iteration
- ✅ **Tested incrementally** to isolate problems

## Useful Commands

### TypeScript Checking
```bash
# Check all projects
npm run typecheck

# Check specific project
nx run api:typecheck
nx run web:typecheck

# Check with verbose output
nx run api:typecheck --verbose
```

### Build Testing
```bash
# Build all projects
nx run-many --target=build

# Build specific project
nx build api
nx build web

# Clear cache and rebuild
nx reset && nx build api
```

### Dependency Analysis
```bash
# Show project dependencies
nx graph

# Show affected projects
nx affected:graph

# Show what's affected by changes
nx affected:build --dry-run
```

## Remember

**Nx conventions exist for a reason. Don't fight the framework!** 🏗️

- Trust the Nx configuration system
- Fix TypeScript issues in code, not config
- Use workspace-relative paths as intended
- Test changes incrementally
- Ask for help when in doubt