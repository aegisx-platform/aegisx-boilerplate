# Commands Reference

## Full-Stack Development

### Start Commands
```bash
# Start both API + Angular (parallel development)
npm start

# Start API server only (port 3000)
npm run start:api

# Start Angular app only (port 4200)
npm run start:web

# Start with watch mode (auto-restart on changes)
npm run dev
```

### Build Commands
```bash
# Build both API + Angular
npm run build

# Build API only
npm run build:api

# Build Angular only
npm run build:web

# Build shared libraries
npm run build:libs

# Production build
npm run build:prod
```

## Database Commands

### Setup & Migration
```bash
# Start PostgreSQL container
npm run db:setup

# Development migrations
npm run db:dev:migrate        # Run migrations
npm run db:dev:seed           # Seed data
npm run db:dev:rollback       # Rollback last migration

# Production migrations
npm run db:migrate            # Run migrations
npm run db:seed               # Seed data
npm run db:rollback           # Rollback

# Full reset (drops and recreates)
npm run db:reset
```

### Database Utilities
```bash
# Create new migration
npm run db:create-migration migration-name

# View migration status
npm run db:status

# Connect to database
npm run db:connect
```

## Testing Commands

### Test Execution
```bash
# Run all tests
npm test

# Test API only
npm run test:api

# Test Angular only
npm run test:web

# Test with coverage
npm run test:coverage

# Test in watch mode
npm run test:watch

# E2E tests
npm run e2e
```

### Test Utilities
```bash
# Generate test coverage report
npm run test:report

# Open coverage in browser
npm run test:coverage:open
```

## Code Quality

### Linting
```bash
# Lint all projects
npm run lint

# Lint with auto-fix
npm run lint:fix

# Lint API only
npm run lint:api

# Lint Angular only
npm run lint:web
```

### Formatting
```bash
# Format all code with Prettier
npm run format

# Check formatting without changes
npm run format:check
```

### Type Checking
```bash
# Run TypeScript type checking
npm run typecheck

# Type check API only
npm run typecheck:api

# Type check Angular only
npm run typecheck:web
```

## Nx Commands

### Project Management
```bash
# Generate new library
nx g @nx/node:lib libs/shared/new-lib

# Generate new application
nx g @nx/node:app apps/new-app

# Show project graph
nx graph

# Show affected projects
nx affected:graph
```

### Build & Serve
```bash
# Build specific project
nx build api
nx build web

# Serve specific project
nx serve api
nx serve web

# Run multiple projects
nx run-many --target=build --projects=api,web
```

## Docker Commands

### Service Management
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart specific service
docker-compose restart postgres
```

### Logging Stacks
```bash
# Seq
docker-compose -f docker-compose.seq.yml up -d
docker-compose -f docker-compose.seq.yml down

# Grafana + Loki
docker-compose -f docker-compose.loki.yml up -d
docker-compose -f docker-compose.loki.yml down

# Graylog
docker-compose -f docker-compose.graylog.yml up -d
docker-compose -f docker-compose.graylog.yml down

# Interactive logging selector
./scripts/logging-selector.sh
```

## Utility Commands

### Documentation
```bash
# Generate API documentation
npm run docs:generate

# Serve documentation locally
npm run docs:serve

# Generate changelog
npm run changelog
```

### Security
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check outdated packages
npm outdated
```

### Performance
```bash
# Bundle size analysis
npm run analyze

# Performance profiling
npm run profile

# Memory usage analysis
npm run memory
```

## Environment Management

### Environment Files
```bash
# Copy example environment
cp .env.example .env

# Switch environments
export NODE_ENV=production
export NODE_ENV=development
export NODE_ENV=test
```

### Secret Management
```bash
# Generate new JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate API key
node scripts/generate-api-key.js
```

## Deployment Commands

### Production Build
```bash
# Full production build
npm run build:prod

# Build and package
npm run package

# Docker build
docker build -t aegisx-api .

# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

## Development Utilities

### Code Generation
```bash
# Generate new domain
node tools/cli/index.js domain patient-management

# Generate new service
node tools/cli/index.js service email

# Generate new controller
node tools/cli/index.js controller user
```

### Database Utilities
```bash
# Generate TypeScript types from DB
npm run db:generate-types

# Backup database
npm run db:backup

# Restore database
npm run db:restore backup-file.sql
```

## Troubleshooting Commands

### Clear Cache
```bash
# Clear Nx cache
nx reset

# Clear node_modules
rm -rf node_modules && npm install

# Clear all build artifacts
npm run clean
```

### Debug Mode
```bash
# Run API in debug mode
npm run debug:api

# Run with verbose logging
LOG_LEVEL=debug npm run start:api

# Run with inspector
node --inspect apps/api/dist/main.js
```

## CI/CD Commands

### GitHub Actions
```bash
# Run CI checks locally
npm run ci

# Run specific workflow
act -W .github/workflows/ci.yml
```

### Pre-commit Hooks
```bash
# Install hooks
npm run prepare

# Run hooks manually
npm run pre-commit

# Skip hooks
git commit --no-verify
```

## Useful Aliases

Add to your shell profile:

```bash
# Quick commands
alias nxs='nx serve'
alias nxb='nx build'
alias nxt='nx test'
alias nxl='nx lint'

# Database shortcuts
alias dbm='npm run db:dev:migrate'
alias dbs='npm run db:dev:seed'
alias dbr='npm run db:reset'

# Development shortcuts
alias dev='npm start'
alias build='npm run build'
alias test='npm test'
alias lint='npm run lint'
```

## Command Combinations

### Fresh Start
```bash
# Complete fresh start
npm run clean && npm install && npm run db:reset && npm start
```

### Pre-deployment Check
```bash
# Run all checks before deployment
npm run lint && npm run typecheck && npm test && npm run build:prod
```

### Update Everything
```bash
# Update dependencies and rebuild
npm update && npm run build:libs && npm run build
```

## Tips

1. Use `nx` commands directly for more control
2. Add `--parallel` flag to speed up multi-project operations
3. Use `--affected` to only run commands on changed projects
4. Add custom scripts to `package.json` for common workflows
5. Use `npm run` without arguments to see all available scripts