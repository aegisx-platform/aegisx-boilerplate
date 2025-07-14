# TypeScript Configuration Guide for Nx Monorepo

## Overview

This document provides the correct TypeScript configuration structure for an Nx monorepo that supports both Node.js API (Fastify) and Angular frontend applications with shared libraries.

## Architecture Overview

```
├── tsconfig.base.json              # Shared base configuration
├── apps/
│   ├── api/
│   │   ├── tsconfig.json           # API project reference config
│   │   ├── tsconfig.app.json       # API application config (Node.js)
│   │   └── tsconfig.spec.json      # API test config
│   └── web/
│       ├── tsconfig.json           # Angular project reference config
│       ├── tsconfig.app.json       # Angular application config
│       └── tsconfig.spec.json      # Angular test config
└── libs/
    └── shared/
        ├── types/
        │   ├── tsconfig.json       # Types library reference config
        │   ├── tsconfig.lib.json   # Types library build config
        │   └── tsconfig.spec.json  # Types library test config
        └── api-client/
            ├── tsconfig.json       # API client reference config
            ├── tsconfig.lib.json   # API client build config
            └── tsconfig.spec.json  # API client test config
```

## Configuration Details

### 1. Root Configuration (`tsconfig.base.json`)

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
    "target": "es2020",
    "module": "esnext",
    "lib": ["es2020", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@aegisx-boilerplate/api-client": ["libs/shared/api-client/src/index.ts"],
      "@aegisx-boilerplate/types": ["libs/shared/types/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp", "dist"]
}
```

**Key Features:**
- **Common base** for all projects
- **Path mapping** for workspace libraries
- **Strict TypeScript** settings for better code quality
- **ES2020 target** for modern JavaScript features
- **Source maps** enabled for debugging

### 2. Node.js API Configuration (`apps/api/tsconfig.app.json`)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "types": ["node"],
    "module": "commonjs",
    "target": "es2020",
    "lib": ["es2020"],
    "moduleResolution": "node",
    "downlevelIteration": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,
    "tsBuildInfoFile": "dist/tsconfig.app.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": [
    "jest.config.ts",
    "src/**/*.spec.ts",
    "src/**/*.test.ts",
    "eslint.config.js",
    "eslint.config.cjs",
    "eslint.config.mjs"
  ]
}
```

**Node.js Specific Features:**
- **CommonJS modules** for Node.js compatibility
- **Node.js types** included
- **Downlevel iteration** for Map/Set compatibility
- **JSON import** support
- **Declaration files** for library building
- **Incremental compilation** for faster builds

### 3. Angular Web Configuration (`web/tsconfig.json`)

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../dist/out-tsc",
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "module": "preserve",
    "target": "es2022",
    "lib": ["es2022", "dom"],
    "useDefineForClassFields": false
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "typeCheckHostBindings": true,
    "strictTemplates": true,
    "strictNullChecks": true
  }
}
```

**Angular Specific Features:**
- **Module preservation** for Angular compiler
- **DOM lib** for browser APIs
- **Strict Angular** compiler options
- **Modern ES2022** target for browsers
- **Isolated modules** for better tree-shaking

### 4. Shared Libraries Configuration

#### Types Library (`libs/shared/types/tsconfig.lib.json`)
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

#### API Client Library (`libs/shared/api-client/tsconfig.lib.json`)
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../../dist/out-tsc",
    "declaration": true,
    "declarationMap": true,
    "types": []
  },
  "include": ["src/**/*.ts"],
  "exclude": ["jest.config.ts", "src/**/*.spec.ts", "src/**/*.test.ts"]
}
```

**Shared Library Features:**
- **Declaration files** for type definitions
- **Declaration maps** for IDE navigation
- **No specific types** (environment agnostic)
- **Modular design** for reusability

## Key Design Principles

### 1. Separation of Concerns
- **Base config** contains common settings
- **Project configs** override for specific needs
- **Clear inheritance** chain

### 2. Environment-Specific Optimizations
- **Node.js**: CommonJS, Node types, server optimizations
- **Angular**: ES modules, DOM types, browser optimizations
- **Shared libs**: Environment-agnostic, declaration files

### 3. Modern TypeScript Features
- **Strict mode** enabled for better code quality
- **ES2020/ES2022** targets for modern features
- **Source maps** for debugging
- **Incremental compilation** for performance

### 4. Nx Best Practices
- **Workspace-relative paths** in all configs
- **Proper extends chains** for inheritance
- **Consistent output directories**
- **Path mapping** for workspace libraries

## Testing the Configuration

### Verify TypeScript Compilation
```bash
# Test API (Node.js)
npx tsc --project apps/api/tsconfig.app.json --noEmit

# Test Angular Web App
npx tsc --project web/tsconfig.app.json --noEmit

# Test Shared Types Library
npx tsc --project libs/shared/types/tsconfig.lib.json --noEmit

# Test Shared API Client Library
npx tsc --project libs/shared/api-client/tsconfig.lib.json --noEmit
```

### Expected Results
- ✅ **Shared libraries**: Should compile without errors
- ✅ **Angular app**: Should compile without errors
- ⚠️ **API**: May show WebSocket-related type errors (existing code issues, not config issues)

## Common Issues and Solutions

### 1. Import/Export Problems
**Problem**: Module import errors between projects
**Solution**: Check path mapping in `tsconfig.base.json` and ensure consistent module formats

### 2. Type Conflicts
**Problem**: DOM types in Node.js or Node types in browser
**Solution**: Use project-specific `types` arrays in `compilerOptions`

### 3. Build Performance
**Problem**: Slow TypeScript compilation
**Solution**: Enable incremental compilation and proper build caching

### 4. IDE Integration
**Problem**: VS Code not recognizing workspace libraries
**Solution**: Ensure proper path mapping and restart TypeScript language server

## Migration Notes

If migrating from a different setup:
1. **Backup existing configs** before making changes
2. **Update incrementally** - one project at a time
3. **Test compilation** after each change
4. **Verify IDE integration** works correctly
5. **Update build scripts** if necessary

## Best Practices

1. **Always extend** from base configuration
2. **Use workspace-relative paths** for all Nx projects
3. **Enable strict mode** for better code quality
4. **Include declaration files** for shared libraries
5. **Use incremental compilation** for better performance
6. **Test configurations** regularly with `--noEmit` flag

## Troubleshooting

### If builds fail:
1. Check TypeScript version compatibility
2. Verify all extends paths are correct
3. Ensure output directories exist
4. Check for conflicting compiler options
5. Verify Nx workspace configuration

### If IDE integration breaks:
1. Restart TypeScript language server
2. Check workspace settings in VS Code
3. Verify path mappings work
4. Clear TypeScript build info files
5. Reload workspace/window

This configuration provides a solid foundation for a production-ready Nx monorepo with proper TypeScript support for both Node.js and Angular applications.