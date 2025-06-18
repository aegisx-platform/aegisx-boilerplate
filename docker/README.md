# Docker Commands for PostgreSQL

## 🚀 Quick Start
```bash
# Start PostgreSQL services
docker-compose up -d postgres

# Start all services (including pgAdmin)
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ This will delete all data!)
docker-compose down -v
```

## 📊 Services Included

### PostgreSQL Main Database
- **Port**: 5432
- **Database**: aegisx_db
- **Username**: postgres
- **Password**: postgres123
- **Connection**: `postgresql://postgres:postgres123@localhost:5432/aegisx_db`

### PostgreSQL Test Database
- **Port**: 5433
- **Database**: aegisx_db_test
- **Username**: postgres
- **Password**: postgres123
- **Connection**: `postgresql://postgres:postgres123@localhost:5433/aegisx_db_test`

### pgAdmin (Database Management UI)
- **URL**: http://localhost:8080
- **Email**: admin@aegisx.com
- **Password**: admin123

## 🔧 Useful Commands

```bash
# View logs
docker-compose logs postgres
docker-compose logs -f postgres  # Follow logs

# Connect to database directly
docker exec -it aegisx-postgres psql -U postgres -d aegisx_db

# Backup database
docker exec aegisx-postgres pg_dump -U postgres aegisx_db > backup.sql

# Restore database
docker exec -i aegisx-postgres psql -U postgres aegisx_db < backup.sql

# Check database status
docker-compose ps
```

## 🏥 Health Checks
All PostgreSQL containers include health checks that verify:
- Database connectivity
- Service readiness
- Container health status

## 📁 Data Persistence
Database data is persisted in Docker volumes:
- `postgres_data` - Main database data
- `postgres_test_data` - Test database data
- `pgadmin_data` - pgAdmin configuration

## 🔒 Security Notes
- Default passwords are for development only
- Change passwords in production
- Consider using Docker secrets for production
- Enable SSL for production databases
