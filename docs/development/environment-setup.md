# Environment Setup Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Docker & Docker Compose
- npm or yarn

## Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env`
3. Configure environment variables
4. Run setup commands:

```bash
# Install dependencies
npm install

# Start PostgreSQL & Redis
npm run db:setup

# Run migrations and seeds
npm run db:dev:migrate
npm run db:dev:seed

# Start development
npm start
```

## Environment Variables

### Core Configuration

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Frontend Proxy
FRONTEND_URL=http://localhost:4200

# Service Identification
SERVICE_NAME=aegisx-api
ENVIRONMENT=development
```

### Database Configuration

```bash
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=aegisx_user
DB_PASSWORD=secure_password
DB_NAME=aegisx_db

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_CONNECTION_TIMEOUT=60000
```

### Redis Configuration

```bash
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Redis Options
REDIS_CONNECTION_TIMEOUT=5000
REDIS_COMMAND_TIMEOUT=5000
REDIS_RETRY_ATTEMPTS=3
REDIS_RETRY_DELAY=1000
```

### Authentication & Security

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# API Key Configuration
API_KEY_EXPIRATION_STRATEGY=hybrid
API_KEY_CRONJOB_ENABLED=true
API_KEY_REDIS_TTL_ENABLED=true
API_KEY_CLEANUP_SCHEDULE="0 2 * * *"
API_KEY_CLEANUP_BATCH_SIZE=100
API_KEY_REDIS_CHANNEL=api_key_expiration
API_KEY_PRE_EXPIRATION_HOURS=24
API_KEY_MAX_PER_USER=10
API_KEY_DEFAULT_RATE_LIMIT=1000
API_KEY_MAX_RATE_LIMIT=10000

# Security
CORS_ORIGIN=http://localhost:4200
RATE_LIMIT_MAX=100
RATE_LIMIT_TIMEWINDOW=60000
```

### Logging Configuration

```bash
# Console & File Logging
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=true
LOG_LEVEL=info

# Seq Configuration (Optional)
SEQ_ENABLED=false
SEQ_URL=http://localhost:5341
SEQ_API_KEY=

# Service Identification
SERVICE_NAME=aegisx-api
ENVIRONMENT=development
```

### Storage Service

```bash
# Storage Provider Configuration
STORAGE_PROVIDER=local
STORAGE_ENABLED=true

# Local Storage Configuration
STORAGE_LOCAL_BASE_PATH=./storage
STORAGE_LOCAL_PERMISSIONS=0755
STORAGE_LOCAL_MAX_FILE_SIZE=104857600
STORAGE_LOCAL_MAX_FILES=10000

# MinIO Configuration (S3-compatible)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=aegisx-storage
MINIO_REGION=us-east-1

# Security & Encryption
STORAGE_ENCRYPTION_ENABLED=false
STORAGE_ENCRYPTION_ALGORITHM=aes-256-cbc
```

### Notification Service

```bash
# Notification Configuration
NOTIFICATION_ENABLED_CHANNELS=email,sms,push,slack
NOTIFICATION_DEFAULT_CHANNEL=email
NOTIFICATION_RETRY_ATTEMPTS=3
NOTIFICATION_RETRY_DELAY=5000
NOTIFICATION_QUEUE_ENABLED=true

# Automatic Processing
NOTIFICATION_AUTO_PROCESS_ENABLED=true
NOTIFICATION_PROCESS_INTERVAL=30s

# Queue Broker Selection
QUEUE_BROKER=redis

# Rate Limiting
NOTIFICATION_RATE_LIMIT_ENABLED=true
NOTIFICATION_RATE_LIMIT_PER_MINUTE=100

# Healthcare Settings
NOTIFICATION_HIPAA_COMPLIANCE=true
NOTIFICATION_ENCRYPTION_ENABLED=true
NOTIFICATION_AUDIT_LOGGING=true

# Batch Processing
BATCH_WORKER_ENABLED=true
BATCH_WORKER_CONCURRENCY=5
BATCH_EMAIL_CONCURRENCY=10
BATCH_SMS_CONCURRENCY=5
```

### Email Configuration

```bash
# SMTP Settings (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_NAME=AegisX System
SMTP_FROM_EMAIL=noreply@aegisx.com
```

### Queue System

```bash
# Queue Broker (redis or rabbitmq)
QUEUE_BROKER=redis

# Bull Queue (Redis)
BULL_REDIS_HOST=localhost
BULL_REDIS_PORT=6379
BULL_REDIS_PASSWORD=
BULL_REDIS_DB=1

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=aegisx-exchange
RABBITMQ_EXCHANGE_TYPE=topic
```

## Docker Services

### Available Docker Compose Files

```bash
# Core services (PostgreSQL, Redis, pgAdmin)
docker-compose.yml

# Logging solutions (choose one):
docker-compose.seq.yml         # Seq log analysis
docker-compose.loki.yml        # Grafana + Loki
docker-compose.fluent-bit.yml  # Advanced with Fluent Bit
docker-compose.graylog.yml     # Graylog centralized logging
```

### Starting Services

```bash
# Start core services
docker-compose up -d

# Start Seq logging
docker-compose -f docker-compose.seq.yml up -d

# Start Grafana + Loki
docker-compose -f docker-compose.loki.yml up -d

# Start Graylog
docker-compose -f docker-compose.graylog.yml up -d
```

## Access Points

### Development URLs

- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs
- **Angular Frontend**: http://localhost:4200
- **pgAdmin**: http://localhost:8080 (admin@admin.com / admin)

### Monitoring URLs (when enabled)

- **Seq**: http://localhost:5341
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Loki API**: http://localhost:3100
- **Graylog**: http://localhost:9000 (admin/admin)

## Logging System Selection

Use the interactive selector:

```bash
./scripts/logging-selector.sh
```

Options:
1. **Seq** - SQL-based analysis (best for development)
2. **Grafana + Loki** - Simple cloud-native solution
3. **Fluent Bit + Loki** - Advanced with HIPAA compliance
4. **Fluent Bit + Elasticsearch** - Full analytics platform
5. **Graylog** - Centralized log management
6. **Graylog + Fluent Bit** - Advanced HIPAA-compliant (recommended for healthcare)

## Environment-Specific Files

### Development
- `.env` - Local development configuration
- `knexfile.ts` - Database configuration

### Production
- `.env.production` - Production configuration
- `knexfile.prod.js` - Production database config

### Testing
- `.env.test` - Test environment configuration

## SSL/TLS Configuration

For production environments:

```bash
# SSL Configuration
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
SSL_CA_PATH=/path/to/ca.pem
```

## Health Check Endpoints

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Liveness Probe**: `GET /health/live`
- **Readiness Probe**: `GET /health/ready`

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running: `docker ps`
   - Verify credentials in `.env`
   - Check port availability: `lsof -i :5432`

2. **Redis Connection Failed**
   - Check Redis is running: `docker ps`
   - Verify Redis configuration
   - Check port availability: `lsof -i :6379`

3. **Port Already in Use**
   - API: Change `PORT` in `.env`
   - Frontend: Update `apps/web/project.json`

4. **Migration Errors**
   - Ensure database exists
   - Check migration files in `infrastructure/database/migrations`
   - Run rollback if needed: `npm run db:rollback`

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong secrets** for JWT and encryption
3. **Enable HTTPS** in production
4. **Configure CORS** appropriately
5. **Set up rate limiting**
6. **Enable audit logging**
7. **Use environment-specific configurations**
8. **Rotate API keys** regularly

## Next Steps

1. Configure environment variables
2. Start required services
3. Run database setup
4. Start development server
5. Access API documentation
6. Begin development

For detailed development workflow, see [Commands Reference](./commands-reference.md)