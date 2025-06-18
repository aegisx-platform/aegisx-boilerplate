# Docker Setup Guide

## Overview

This guide covers the complete Docker setup for the AegisX Boilerplate project, including PostgreSQL database, pgAdmin, and the API application. The setup supports both development and production environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Services Overview](#services-overview)
- [Environment Variables](#environment-variables)
- [Database Management](#database-management)
- [API Container](#api-container)
- [Development Workflow](#development-workflow)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Start Database Services

```bash
# Start PostgreSQL and pgAdmin
docker-compose up -d postgres pgadmin

# Or start all services
docker-compose up -d
```

### 2. Build and Run API

```bash
# Build the API Docker image
nx docker-build api

# Run API container with database connection
docker run -d --name aegisx-api \
  --network aegisx-boilerplate_aegisx-network \
  -p 3000:3000 \
  -e DB_HOST=postgres \
  -e NODE_ENV=development \
  aegisx-boilerplate-api
```

### 3. Run Database Migrations

```bash
# Check migration status
docker exec -it aegisx-api npm run db:status

# Run pending migrations
docker exec -it aegisx-api npm run db:migrate

# Seed database with sample data
docker exec -it aegisx-api npm run db:seed
```

## Services Overview

### PostgreSQL Database

**Main Database (Development)**
- **Container**: `aegisx-postgres`
- **Port**: `5432`
- **Database**: `aegisx_db`
- **Username**: `postgres`
- **Password**: `postgres123`

**Test Database**
- **Container**: `aegisx-postgres-test`
- **Port**: `5433`
- **Database**: `aegisx_db_test`
- **Username**: `postgres`
- **Password**: `postgres123`

### pgAdmin Web Interface

- **Container**: `aegisx-pgadmin`
- **Port**: `8080`
- **Email**: `admin@aegisx.com`
- **Password**: `admin123`
- **URL**: http://localhost:8080

### API Application

- **Container**: Built from `apps/api/Dockerfile`
- **Port**: `3000`
- **Network**: `aegisx-network`
- **Health Check**: Available
- **Migration Support**: Built-in

## Environment Variables

### Database Configuration

```bash
# Database Connection
DB_HOST=postgres                    # Database host (use 'postgres' for Docker)
DB_PORT=5432                       # Database port
DB_NAME=aegisx_db                  # Database name
DB_USER=postgres                   # Database username
DB_PASSWORD=postgres123            # Database password
DB_SSL=false                       # SSL connection (false for development)

# Connection Pool
DB_POOL_MIN=2                      # Minimum pool connections
DB_POOL_MAX=10                     # Maximum pool connections

# Alternative: Full connection string
DB_CONNECTION_STRING=postgresql://postgres:postgres123@postgres:5432/aegisx_db
```

### Application Configuration

```bash
# Runtime Environment
NODE_ENV=development               # Environment (development/production)
PORT=3000                         # Application port
HOST=0.0.0.0                      # Application host

# Logging
LOG_LEVEL=info                    # Log level (debug/info/warn/error)
```

## Database Management

### Migration Commands

```bash
# Inside running container
docker exec -it <container_name> npm run db:status      # Check migration status
docker exec -it <container_name> npm run db:migrate     # Run pending migrations
docker exec -it <container_name> npm run db:rollback    # Rollback last migration
docker exec -it <container_name> npm run db:seed        # Run database seeds
docker exec -it <container_name> npm run db:reset       # Full reset (rollback + migrate + seed)
```

### Using Migration Helper Script

The container includes a convenient migration script:

```bash
# Check migration status
docker exec -it <container_name> ./db-migrate.sh status

# Run migrations
docker exec -it <container_name> ./db-migrate.sh latest

# Rollback migrations
docker exec -it <container_name> ./db-migrate.sh rollback

# Seed database
docker exec -it <container_name> ./db-migrate.sh seed

# Full reset
docker exec -it <container_name> ./db-migrate.sh reset
```

### Direct Database Access

**Via pgAdmin:**
1. Open http://localhost:8080
2. Login with `admin@aegisx.com` / `admin123`
3. Add server connection:
   - Host: `postgres`
   - Port: `5432`
   - Database: `aegisx_db`
   - Username: `postgres`
   - Password: `postgres123`

**Via psql CLI:**
```bash
# Connect to main database
docker exec -it aegisx-postgres psql -U postgres -d aegisx_db

# Connect to test database
docker exec -it aegisx-postgres-test psql -U postgres -d aegisx_db_test
```

## API Container

### Building the Image

```bash
# Build using Nx (recommended)
nx docker-build api

# Build manually
docker build -f apps/api/Dockerfile . -t aegisx-boilerplate-api
```

### Running the Container

**Development Mode:**
```bash
docker run -d \
  --name aegisx-api \
  --network aegisx-boilerplate_aegisx-network \
  -p 3000:3000 \
  -e NODE_ENV=development \
  -e DB_HOST=postgres \
  aegisx-boilerplate-api
```

**Production Mode:**
```bash
docker run -d \
  --name aegisx-api \
  --network aegisx-boilerplate_aegisx-network \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=postgres \
  -e DB_PASSWORD=secure_password \
  aegisx-boilerplate-api
```

### Container Features

- ✅ **Multi-stage Build**: Optimized image size
- ✅ **Non-root User**: Security best practices
- ✅ **Health Checks**: Built-in health monitoring
- ✅ **Migration Support**: Database migration tools included
- ✅ **Environment Configs**: Flexible environment-based configuration
- ✅ **TypeScript Support**: Runtime TypeScript execution
- ✅ **Development Tools**: Debugging and development utilities

## Development Workflow

### 1. Start Development Environment

```bash
# Start database services
docker-compose up -d postgres pgadmin

# Build and start API
nx serve api
# OR with Docker:
nx docker-build api && docker run --name aegisx-api ...
```

### 2. Database Development

```bash
# Create new migration
npm run db:make:migration create_new_table

# Create new seed
npm run db:make:seed sample_data

# Run migrations (development)
npm run db:dev:migrate

# Check status (development)
npm run db:dev:status
```

### 3. Testing

```bash
# Run with test database
NODE_ENV=test npm run db:migrate
NODE_ENV=test npm test
```

### 4. Docker Development

```bash
# Build development image
nx docker-build api

# Run with development settings
docker run -it --rm \
  --network aegisx-boilerplate_aegisx-network \
  -e NODE_ENV=development \
  -e DB_HOST=postgres \
  aegisx-boilerplate-api
```

## Production Deployment

### 1. Environment Preparation

```bash
# Set production environment variables
export NODE_ENV=production
export DB_HOST=your-production-db-host
export DB_PASSWORD=secure-production-password
export DB_SSL=true
```

### 2. Build Production Image

```bash
# Build optimized production image
docker build \
  --target production \
  -f apps/api/Dockerfile \
  -t aegisx-api:latest .
```

### 3. Database Setup

```bash
# Run migrations in production
docker run --rm \
  --network production-network \
  -e NODE_ENV=production \
  -e DB_HOST=production-db \
  -e DB_PASSWORD=$DB_PASSWORD \
  aegisx-api:latest \
  npm run db:migrate
```

### 4. Deploy Application

```bash
# Deploy API container
docker run -d \
  --name aegisx-api \
  --network production-network \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=production-db \
  -e DB_PASSWORD=$DB_PASSWORD \
  --restart unless-stopped \
  aegisx-api:latest
```

### 5. Health Monitoring

```bash
# Check application health
curl http://localhost:3000/health

# Check container status
docker ps
docker logs aegisx-api

# Monitor database connections
docker exec aegisx-api npm run db:status
```

## Docker Compose Reference

### Available Services

```yaml
services:
  postgres:       # Main PostgreSQL database
  postgres-test:  # Test PostgreSQL database  
  pgadmin:        # Database administration UI
```

### Common Commands

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres

# Stop all services
docker-compose down

# View logs
docker-compose logs postgres
docker-compose logs -f pgadmin

# Restart service
docker-compose restart postgres

# Remove volumes (destructive)
docker-compose down -v
```

### Networking

All services are connected via the `aegisx-network` Docker network:

```bash
# List networks
docker network ls

# Inspect network
docker network inspect aegisx-boilerplate_aegisx-network

# Connect external container
docker run --network aegisx-boilerplate_aegisx-network ...
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Refused

```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Ensure PostgreSQL container is running: `docker-compose ps`
- Use correct host name: `DB_HOST=postgres` (not `localhost`)
- Check network connectivity: `docker network inspect aegisx-boilerplate_aegisx-network`

#### 2. Migration TypeScript Errors

```bash
Failed to load external module ts-node/register
```

**Solution:**
- Use JavaScript knexfile for containers: `--knexfile knexfile.js`
- Ensure ts-node is installed: `npm install ts-node typescript`
- Use development scripts for TypeScript: `npm run db:dev:migrate`

#### 3. Permission Denied

```bash
Error: permission denied for relation users
```

**Solution:**
- Check database credentials
- Verify user permissions in PostgreSQL
- Reset database user: `docker-compose restart postgres`

#### 4. Port Already in Use

```bash
Error: bind: address already in use
```

**Solution:**
- Check running containers: `docker ps`
- Stop conflicting services: `docker stop <container>`
- Use different port: `-p 3001:3000`

#### 5. Container Won't Start

```bash
Container exits immediately
```

**Solution:**
- Check container logs: `docker logs <container>`
- Verify environment variables
- Check Dockerfile syntax
- Ensure base image is available

### Debugging Commands

```bash
# Check container status
docker ps -a

# View container logs
docker logs <container_name>

# Execute shell in container
docker exec -it <container_name> /bin/sh

# Inspect container
docker inspect <container_name>

# Check network connectivity
docker exec <container> ping postgres

# Test database connection
docker exec <container> npx knex raw "SELECT 1"
```

### Performance Monitoring

```bash
# Monitor container resources
docker stats

# Check database performance
docker exec aegisx-postgres pg_stat_activity

# Monitor API performance
docker exec aegisx-api npm run health:check
```

### Backup and Restore

```bash
# Backup database
docker exec aegisx-postgres pg_dump -U postgres aegisx_db > backup.sql

# Restore database
docker exec -i aegisx-postgres psql -U postgres aegisx_db < backup.sql

# Backup with compression
docker exec aegisx-postgres pg_dump -U postgres -Fc aegisx_db > backup.dump
```

---

## Quick Reference

### Essential Commands

```bash
# Start development
docker-compose up -d postgres
nx serve api

# Build and deploy
nx docker-build api
docker run --network aegisx-boilerplate_aegisx-network ...

# Database operations
docker exec -it <api_container> npm run db:migrate
docker exec -it <api_container> ./db-migrate.sh status

# Debugging
docker logs <container>
docker exec -it <container> /bin/sh
```

### Port Reference

| Service | Host Port | Container Port | Purpose |
|---------|-----------|----------------|---------|
| API | 3000 | 3000 | Application server |
| PostgreSQL | 5432 | 5432 | Main database |
| PostgreSQL Test | 5433 | 5432 | Test database |
| pgAdmin | 8080 | 80 | Database UI |

### Environment Files

- `.env.example` - Template with all variables
- `.env.development` - Development overrides
- `.env.production` - Production configuration
- `docker-compose.yml` - Service definitions

For more detailed information, see the [Database Documentation](./database.md).
