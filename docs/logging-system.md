# Logging System Documentation

## Overview
AegisX Boilerplate includes a comprehensive structured logging system with support for multiple monitoring solutions. The system provides correlation ID tracking, HIPAA compliance features, and flexible output formats.

## Architecture

### Components
1. **Winston Logger**: Core logging framework with custom transports
2. **Correlation ID Middleware**: Tracks requests across microservices
3. **Monitoring Adapters**: Support for Seq and Grafana + Loki
4. **Audit Integration**: Seamless integration with HIPAA audit system

### Logging Flow
```
API Request → Correlation ID → Winston Logger → Multiple Transports
                                               ├── Console (Development)
                                               ├── File (Production)
                                               ├── Seq (Optional)
                                               └── Loki (Optional)
```

## Configuration

### Environment Variables
```bash
# Basic Logging
LOG_CONSOLE_ENABLED=true    # Enable console output
LOG_FILE_ENABLED=true       # Enable file logging
LOG_LEVEL=info              # Log level (error, warn, info, debug)

# Service Identification
SERVICE_NAME=aegisx-api     # Service name for log filtering
ENVIRONMENT=development     # Environment identifier

# Seq Configuration (Optional)
SEQ_ENABLED=false           # Enable Seq transport
SEQ_URL=http://localhost:5341
SEQ_API_KEY=                # Seq API key (optional)
```

## Monitoring Solutions

### Option 1: Seq (SQL-based Analysis)

**Pros:**
- Powerful SQL-like querying
- Rich filtering and analysis capabilities
- Built-in alerting
- Good for detailed troubleshooting

**Setup:**
```bash
# Enable Seq in .env
SEQ_ENABLED=true
SEQ_URL=http://localhost:5341

# Start Seq container
docker-compose -f docker-compose.seq.yml up -d

# Access Seq
open http://localhost:5341
```

**Usage:**
- Query logs with SQL-like syntax
- Create custom dashboards
- Set up alerts for error patterns

### Option 2: Grafana + Loki (Cloud-native)

**Pros:**
- Cloud-native architecture
- Better for high-volume logging
- Prometheus-style querying
- Excellent visualization with Grafana

**Setup:**
```bash
# Disable Seq in .env
SEQ_ENABLED=false

# Start Grafana + Loki stack
docker-compose -f docker-compose.loki.yml up -d

# Access Grafana
open http://localhost:3001
# Username: admin, Password: admin123
```

**Components:**
- **Loki**: Log aggregation and storage
- **Grafana**: Visualization and dashboards
- **Promtail**: Log collection agent

## Log Structure

### Standard Log Entry
```json
{
  "timestamp": "2025-06-26T00:22:21.578Z",
  "level": "info",
  "message": "HTTP Request Completed",
  "service": "aegisx-api",
  "environment": "development",
  "correlationId": "30da77f5-faef-490b-9218-1db2628d4764",
  "method": "POST",
  "url": "/api/v1/auth/login",
  "statusCode": 401,
  "responseTime": 7
}
```

### Error Log Entry
```json
{
  "timestamp": "2025-06-26T00:22:21.578Z",
  "level": "error",
  "message": "HTTP Request Error",
  "service": "aegisx-api",
  "correlationId": "30da77f5-faef-490b-9218-1db2628d4764",
  "errorName": "UnauthorizedError",
  "errorMessage": "Invalid username/email or password",
  "error": {
    "name": "UnauthorizedError",
    "message": "Invalid username/email or password",
    "stack": "UnauthorizedError: Invalid username/email or password\\n    at Object.unauthorized..."
  }
}
```

### Audit Log Entry
```json
{
  "timestamp": "2025-06-26T00:22:21.578Z",
  "level": "info",
  "message": "AUDIT: CREATE",
  "service": "aegisx-api",
  "correlationId": "30da77f5-faef-490b-9218-1db2628d4764",
  "auditAction": "CREATE",
  "complianceLevel": "HIPAA",
  "auditTimestamp": "2025-06-26T00:22:21.578Z",
  "operation": "CREATE",
  "metadata": {
    "adapter": "redis",
    "complianceLevel": "HIPAA"
  }
}
```

## Usage Examples

### Basic Logging
```typescript
import { logger } from '@/core/plugins/logging'

// Info log
logger.info('User action completed', {
  userId: '123',
  action: 'login'
})

// Error log
logger.error('Database connection failed', {
  error: new Error('Connection timeout'),
  database: 'postgres'
})

// Audit log
logger.info('AUDIT: CREATE', {
  auditAction: 'CREATE',
  complianceLevel: 'HIPAA',
  operation: 'CREATE'
})
```

### Correlation ID Usage
```typescript
import correlator from 'correlation-id'

// Get current correlation ID
const correlationId = correlator.getId()

// Log with automatic correlation ID
logger.info('Processing request', {
  // correlationId is automatically added
  operation: 'processPayment'
})
```

## Querying Logs

### Seq Queries
```sql
-- Find all errors in last hour
select * from stream 
where level = 'error' 
and timestamp > now() - interval '1 hour'

-- Find requests by correlation ID
select * from stream 
where correlationId = '30da77f5-faef-490b-9218-1db2628d4764'

-- Find slow requests
select * from stream 
where has(responseTime) 
and responseTime > 1000
```

### Loki Queries (LogQL)
```logql
# All logs from aegisx-api
{service="aegisx-api"}

# Error logs only
{service="aegisx-api", level="error"}

# Logs by correlation ID
{service="aegisx-api"} | json | correlationId="30da77f5-faef-490b-9218-1db2628d4764"

# HIPAA audit logs
{service="aegisx-api", complianceLevel="HIPAA"} |= "AUDIT:"

# Slow requests (>1000ms)
{service="aegisx-api"} | json | responseTime > 1000
```

## Troubleshooting

### Common Issues

**Character Corruption in Terminal:**
- Fixed with custom Winston formatter that removes ANSI codes
- Logs display as clean JSON in console

**Seq Connection Issues:**
- Check `SEQ_ENABLED=true` in .env
- Verify Seq container is running: `docker-compose -f docker-compose.seq.yml ps`
- Check Seq URL accessibility: `curl http://localhost:5341`

**Loki Permission Errors:**
- Loki runs as user 10001:10001
- Volume permissions are handled by init container
- Check container logs: `docker logs aegisx-loki`

**Missing Correlation IDs:**
- Ensure correlation-id middleware is registered
- Check middleware order in Fastify plugins

### Performance Considerations

**High-Volume Logging:**
- Use Grafana + Loki for better scalability
- Consider log sampling for non-critical logs
- Set appropriate retention policies

**Development vs Production:**
- Development: Enable console logging for immediate feedback
- Production: Disable console, enable file + monitoring solution
- Use appropriate log levels (info for prod, debug for dev)

## Maintenance

### Log Retention
- **Seq**: Configure retention in Seq settings
- **Loki**: Set `retention_period` in limits_config (currently 30d)
- **File logs**: Implement log rotation with winston-daily-rotate-file

### Monitoring Health
```bash
# Check Seq health
curl http://localhost:5341/api/events

# Check Loki health
curl http://localhost:3100/ready

# Check Grafana health
curl http://localhost:3001/api/health
```

### Backup and Recovery
- **Seq**: Backup Seq database
- **Loki**: Backup volume data and configuration
- **Logs**: Regular backup of log files and dashboards

## Security Considerations

### HIPAA Compliance
- All audit logs include compliance level markers
- Sensitive data is sanitized before logging
- Correlation IDs allow audit trail tracking

### Access Control
- Seq: Configure authentication and user roles
- Grafana: Use strong admin passwords, configure RBAC
- Log files: Appropriate file permissions and access controls

### Data Privacy
- No sensitive data (passwords, tokens) in logs
- Personal information is masked or excluded
- Audit logs track data access without exposing data