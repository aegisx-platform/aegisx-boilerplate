# Docker Quick Start

## 🚀 Get Running in 2 Minutes

### Option 1: Database Only (Recommended for Development)

```bash
# 1. Start database services
docker-compose up -d postgres pgadmin

# 2. Run API locally with database connection
npm run dev:api
```

**Access Points:**
- API Server: http://localhost:3000
- Database Admin: http://localhost:8080 (admin@aegisx.com / admin123)

### Option 2: Full Docker Stack

```bash
# 1. Build and start all services
docker-compose up -d

# 2. Run database migrations
docker exec -it aegisx-api npm run db:migrate

# 3. Seed database (optional)
docker exec -it aegisx-api npm run db:seed
```

**Access Points:**
- API Server: http://localhost:3000
- API Documentation: http://localhost:3000/docs
- Database Admin: http://localhost:8080

## 🗄️ Database Management

### Migration Commands

```bash
# Check migration status
docker exec -it aegisx-api npm run db:status

# Run pending migrations
docker exec -it aegisx-api npm run db:migrate

# Seed database with sample data
docker exec -it aegisx-api npm run db:seed

# Reset database (rollback + migrate + seed)
docker exec -it aegisx-api npm run db:reset
```

### Using Helper Script

```bash
# All-in-one commands
docker exec -it aegisx-api ./db-migrate.sh status
docker exec -it aegisx-api ./db-migrate.sh latest
docker exec -it aegisx-api ./db-migrate.sh seed
docker exec -it aegisx-api ./db-migrate.sh reset
```

## 🛠️ Common Commands

### Service Management

```bash
# Start services
docker-compose up -d postgres          # Database only
docker-compose up -d postgres pgadmin  # Database + Admin UI
docker-compose up -d                   # All services

# Stop services
docker-compose down                     # Stop all
docker-compose stop postgres           # Stop specific service

# View logs
docker-compose logs -f api             # Follow API logs
docker-compose logs postgres           # Database logs

# Restart services
docker-compose restart api             # Restart API
docker-compose restart postgres        # Restart database
```

### Container Management

```bash
# Check running containers
docker ps

# Execute commands in containers
docker exec -it aegisx-api /bin/sh     # Shell access
docker exec -it aegisx-postgres psql -U postgres -d aegisx_db

# View container logs
docker logs aegisx-api
docker logs aegisx-postgres

# Container stats
docker stats
```

### Rebuilding

```bash
# Rebuild API image after code changes
docker-compose build api

# Force rebuild without cache
docker-compose build --no-cache api

# Rebuild and restart
docker-compose up -d --build api
```

## 🔧 Environment Configuration

### Database Variables

```bash
# Main Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=aegisx_db
DB_USER=postgres
DB_PASSWORD=postgres123

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
```

### Application Variables

```bash
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

## ❗ Troubleshooting

### Container Won't Start

```bash
# Check container status
docker ps -a

# View error logs
docker logs aegisx-api

# Check if ports are available
netstat -tulpn | grep :3000
```

### Database Connection Issues

```bash
# Verify database is running
docker exec aegisx-postgres pg_isready -U postgres

# Test connection from API container
docker exec aegisx-api npm run db:status

# Check network connectivity
docker exec aegisx-api ping postgres
```

### Permission Issues

```bash
# Reset volumes (⚠️ This will delete data)
docker-compose down -v
docker-compose up -d
```

## 📚 Next Steps

- [📖 Complete Docker Guide](./docker.md) - Detailed configuration and deployment
- [🗄️ Database Documentation](./database.md) - Database setup and usage
- [📝 API Examples](./database-examples.md) - Code examples and best practices

## 🆘 Need Help?

- Check container logs: `docker logs <container_name>`
- View network status: `docker network ls`
- Reset everything: `docker-compose down -v && docker-compose up -d`
- See [Troubleshooting Guide](./docker.md#troubleshooting) for common issues
