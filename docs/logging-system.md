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

## Quick Start Guide

### Choose Your Monitoring Solution

**🎯 Quick Decision Matrix:**

| Use Case | Recommended Solution | Why |
|----------|---------------------|-----|
| **Small to medium applications** | Seq | Easier setup, powerful SQL queries |
| **Large scale, cloud-native** | Grafana + Loki | Better scalability, Prometheus ecosystem |
| **Healthcare compliance focus** | Either (both support HIPAA) | Both provide audit trails |
| **Team familiar with SQL** | Seq | Native SQL querying |
| **Team familiar with Prometheus** | Grafana + Loki | LogQL similar to PromQL |

### 🚀 30-Second Setup

**For Seq:**
```bash
# 1. Enable Seq
echo "SEQ_ENABLED=true" >> .env

# 2. Start Seq
docker-compose -f docker-compose.seq.yml up -d

# 3. Restart API
npx nx serve api

# 4. Open Seq
open http://localhost:5341
```

**For Grafana + Loki:**
```bash
# 1. Disable Seq, enable file logs
echo "SEQ_ENABLED=false" >> .env
echo "LOG_FILE_ENABLED=true" >> .env

# 2. Start stack
docker-compose -f docker-compose.loki.yml up -d

# 3. Restart API
npx nx serve api

# 4. Open Grafana
open http://localhost:3001
# Login: admin/admin123
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

#### **Setup Steps:**

**1. Configure Environment:**
```bash
# Edit .env file
SEQ_ENABLED=true
SEQ_URL=http://localhost:5341
SEQ_API_KEY=                    # Optional: leave empty for local development
LOG_CONSOLE_ENABLED=true        # Keep console logs for debugging
LOG_FILE_ENABLED=false          # Disable file logs to avoid duplication
```

**2. Start Seq Container:**
```bash
# Start Seq server
docker-compose -f docker-compose.seq.yml up -d

# Check if Seq is running
docker-compose -f docker-compose.seq.yml ps

# Check logs if there are issues
docker-compose -f docker-compose.seq.yml logs seq
```

**3. Restart API Server:**
```bash
# Restart to apply new environment variables
npx nx serve api
```

**4. Access Seq Interface:**
```bash
# Open Seq web interface
open http://localhost:5341

# Or manually navigate to: http://localhost:5341
```

#### **Seq Configuration & Usage:**

**Initial Setup in Seq:**
1. **First Time Access**: No authentication required for local setup
2. **Create API Key** (Optional for production):
   - Go to Settings → API Keys
   - Create new API key
   - Add to `.env` file: `SEQ_API_KEY=your-api-key`

**Basic Queries:**
```sql
-- View all logs from AegisX API
select * from stream 
where service = 'aegisx-api'
order by @t desc

-- Find authentication errors
select * from stream 
where service = 'aegisx-api' 
and level = 'error'
and message like '%auth%'

-- Track specific user journey by correlation ID
select * from stream 
where correlationId = 'your-correlation-id-here'
order by @t asc

-- Find slow API requests
select * from stream 
where has(responseTime) 
and responseTime > 1000
```

**Advanced Filtering:**
```sql
-- HIPAA audit events only
select * from stream 
where complianceLevel = 'HIPAA'
and auditAction is not null

-- Error patterns analysis
select errorName, count(*) as error_count
from stream 
where level = 'error'
and @t > now() - 1d
group by errorName
order by error_count desc

-- Performance monitoring
select 
  method, 
  url, 
  avg(responseTime) as avg_response_time,
  count(*) as request_count
from stream 
where has(responseTime)
and @t > now() - 1h
group by method, url
order by avg_response_time desc
```

**Creating Dashboards in Seq:**
1. **Go to Dashboards** → Create New
2. **Add Charts**:
   - Error Rate: `select count(*) from stream where level = 'error' and @t > now() - 1h`
   - Request Volume: `select count(*) from stream where has(method) and @t > now() - 1h`
   - Response Times: `select avg(responseTime) from stream where has(responseTime) and @t > now() - 1h`
3. **Set Refresh Interval**: Auto-refresh every 30s or 1min

**Setting Up Alerts:**
1. **Go to Settings** → Alerts
2. **Create Alert Rule**:
   ```sql
   -- Alert on high error rate
   select count(*) as error_count
   from stream 
   where level = 'error' 
   and @t > now() - 5m
   having count(*) > 10
   ```
3. **Configure Notifications**: Email, Slack, or webhook

### Option 2: Grafana + Loki (Cloud-native)

**Pros:**
- Cloud-native architecture
- Better for high-volume logging
- Prometheus-style querying
- Excellent visualization with Grafana

#### **Setup Steps:**

**1. Configure Environment:**
```bash
# Edit .env file
SEQ_ENABLED=false                # Disable Seq to avoid conflicts
LOG_CONSOLE_ENABLED=true         # Keep console logs for debugging
LOG_FILE_ENABLED=true            # Enable file logs for Promtail to collect
SERVICE_NAME=aegisx-api          # Important for log filtering
ENVIRONMENT=development          # Environment identifier
```

**2. Start Grafana + Loki Stack:**
```bash
# Start all services (Loki, Grafana, Promtail)
docker-compose -f docker-compose.loki.yml up -d

# Check if all services are running
docker-compose -f docker-compose.loki.yml ps

# Check individual service logs if needed
docker-compose -f docker-compose.loki.yml logs loki
docker-compose -f docker-compose.loki.yml logs grafana
docker-compose -f docker-compose.loki.yml logs promtail
```

**3. Verify Loki is Working:**
```bash
# Test Loki health
curl http://localhost:3100/ready

# Check available labels
curl http://localhost:3100/loki/api/v1/label

# Test log query (should return logs if API is running)
curl "http://localhost:3100/loki/api/v1/query_range?query=%7Bservice%3D%22aegisx-api%22%7D&start=$(date -v-5M +%s)000000000&end=$(date +%s)000000000"
```

**4. Access Grafana Interface:**
```bash
# Open Grafana web interface
open http://localhost:3001

# Login credentials:
# Username: admin
# Password: admin123
```

#### **Grafana Configuration & Usage:**

**Initial Setup in Grafana:**

**1. Verify Loki Data Source:**
- Go to **Configuration** → **Data Sources**
- Should see "Loki" data source already configured
- Test connection (should show green checkmark)

**2. Import AegisX Dashboard:**
- Go to **Dashboards** → **Import**
- The dashboard is automatically provisioned at startup
- Or manually import from `dashboards/aegisx-api-dashboard.json`

**3. Explore Logs:**
- Go to **Explore** tab
- Select **Loki** as data source
- Start with basic query: `{service="aegisx-api"}`

#### **LogQL Query Examples:**

**Basic Queries:**
```logql
# All logs from AegisX API
{service="aegisx-api"}

# Error logs only
{service="aegisx-api", level="error"}

# Specific HTTP methods
{service="aegisx-api"} | json | method="POST"

# HIPAA audit logs
{service="aegisx-api", complianceLevel="HIPAA"} |= "AUDIT:"

# Authentication-related logs
{service="aegisx-api"} |~ "(?i)(auth|login|logout)"
```

**Advanced Queries:**
```logql
# Find slow requests (>1000ms)
{service="aegisx-api"} | json | responseTime > 1000

# Track user journey by correlation ID
{service="aegisx-api"} | json | correlationId="your-correlation-id-here"

# Error rate calculation
rate({service="aegisx-api", level="error"}[5m])

# Request volume by status code
sum by (statusCode) (count_over_time({service="aegisx-api"} | json | __error__="" [1h]))

# Top error messages
topk(5, sum by (errorMessage) (count_over_time({service="aegisx-api", level="error"} | json | __error__="" [1h])))
```

**Creating Custom Dashboards:**

**1. Create New Dashboard:**
- **Dashboards** → **New** → **Dashboard**
- **Add Panel** → **Add Query**

**2. Example Panel Configurations:**

**Request Rate Panel:**
```logql
# Query
rate({service="aegisx-api"} |= "HTTP Request Completed" [5m])

# Panel settings:
- Visualization: Stat or Time series
- Unit: reqps (requests per second)
- Title: "Request Rate"
```

**Error Rate Panel:**
```logql
# Query
rate({service="aegisx-api", level="error"}[5m])

# Panel settings:
- Visualization: Stat
- Unit: reqps
- Thresholds: Green=0, Yellow=0.1, Red=1
- Title: "Error Rate"
```

**Response Time Distribution:**
```logql
# Query
histogram_quantile(0.95, sum(rate({service="aegisx-api"} | json | __error__="" | unwrap responseTime [5m])) by (le))

# Panel settings:
- Visualization: Gauge
- Unit: ms
- Title: "95th Percentile Response Time"
```

**Log Volume by Level:**
```logql
# Query
sum by (level) (count_over_time({service="aegisx-api"} | json [1h]))

# Panel settings:
- Visualization: Pie chart
- Title: "Log Volume by Level"
```

#### **Using the Pre-built Dashboard:**

The AegisX API Dashboard includes:

**1. Key Metrics:**
- Request Rate (requests/second)
- Error Rate (errors/second)
- Response time percentiles

**2. HTTP Status Codes:**
- Pie chart showing distribution of status codes
- Helps identify error patterns

**3. Recent Logs:**
- Live log stream with filtering
- Correlation ID tracking

**4. HIPAA Audit Events:**
- Table showing compliance-related events
- Audit trail monitoring

**5. Alert Configuration:**
- Go to **Alerting** → **Alert Rules**
- Create rules based on:
  - Error rate threshold
  - Response time SLA
  - Missing audit events

#### **Advanced Features:**

**1. Log Context:**
- Click on any log entry
- View surrounding log entries
- Trace correlation ID across requests

**2. Live Tailing:**
- Use "Live" mode in Explore
- See logs in real-time as they arrive

**3. Log Filtering:**
- Use label filters: `{service="aegisx-api", level="error"}`
- Use line filters: `|= "authentication"` or `|~ "error.*pattern"`
- JSON parsing: `| json | field="value"`

**4. Creating Alerts:**
```logql
# Alert Rule Example: High Error Rate
rate({service="aegisx-api", level="error"}[5m]) > 0.1

# Alert Rule Example: Missing Audit Logs
absent_over_time({service="aegisx-api", complianceLevel="HIPAA"}[10m])
```

#### **Components Details:**

**Loki Configuration:**
- **Storage**: Local filesystem with 30-day retention
- **Schema**: v13 with TSDB for optimal performance
- **API**: Available at http://localhost:3100

**Grafana Features:**
- **Dashboards**: Pre-configured AegisX monitoring
- **Data Sources**: Loki automatically configured
- **Users**: Admin access for dashboard management

**Promtail Setup:**
- **File Monitoring**: Watches `logs/*.log` files
- **Docker Logs**: Monitors container logs (optional)
- **Label Extraction**: Parses JSON logs and extracts labels
- **Push to Loki**: Real-time log streaming

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

#### **Seq-specific Issues:**

**1. Seq Not Receiving Logs:**
```bash
# Check if Seq is enabled
grep SEQ_ENABLED .env

# Verify Seq container is running
docker-compose -f docker-compose.seq.yml ps

# Check Seq container logs
docker-compose -f docker-compose.seq.yml logs seq

# Test Seq accessibility
curl -f http://localhost:5341 || echo "Seq not accessible"

# Verify API is sending logs
curl -X POST "http://localhost:5341/api/events/raw?clef" \
  -H "Content-Type: application/vnd.serilog.clef" \
  -d '{"@t":"2023-01-01T00:00:00.000Z","@m":"Test message","@l":"Information"}'
```

**2. Seq API Key Issues:**
```bash
# If using API key, verify it's correct
# In Seq: Settings → API Keys → verify key matches .env

# Test with API key
curl -X POST "http://localhost:5341/api/events/raw?clef" \
  -H "Content-Type: application/vnd.serilog.clef" \
  -H "X-Seq-ApiKey: your-api-key" \
  -d '{"@t":"2023-01-01T00:00:00.000Z","@m":"Test message","@l":"Information"}'
```

#### **Grafana + Loki Issues:**

**1. Loki Not Starting:**
```bash
# Check all containers status
docker-compose -f docker-compose.loki.yml ps

# Check Loki logs for errors
docker logs aegisx-loki

# Common fix: Remove volumes and restart
docker-compose -f docker-compose.loki.yml down -v
docker-compose -f docker-compose.loki.yml up -d
```

**2. Grafana Can't Connect to Loki:**
```bash
# Test Loki health
curl http://localhost:3100/ready

# Check if Loki is accessible from Grafana container
docker exec aegisx-grafana curl http://loki:3100/ready

# Verify network connectivity
docker network ls | grep loki
```

**3. No Logs in Grafana:**
```bash
# Check if logs are reaching Loki
curl "http://localhost:3100/loki/api/v1/label"

# Verify Promtail is running and collecting logs
docker logs aegisx-promtail

# Check if log files exist
ls -la logs/

# Test direct log ingestion
curl -X POST "http://localhost:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"job":"test"},"values":[["'$(date +%s%N)'","test message"]]}]}'
```

**4. Grafana Login Issues:**
```bash
# Reset Grafana admin password
docker exec aegisx-grafana grafana-cli admin reset-admin-password admin123

# Check Grafana logs
docker logs aegisx-grafana
```

#### **General Issues:**

**1. Character Corruption in Terminal:**
- Fixed with custom Winston formatter that removes ANSI codes
- Logs display as clean JSON in console
- If still seeing issues, check terminal encoding settings

**2. Missing Correlation IDs:**
```bash
# Verify correlation-id middleware is loaded
# Check in API startup logs for middleware registration

# Test correlation ID generation
curl -H "x-correlation-id: test-123" http://localhost:3000/api/v1/health
# Should see test-123 in logs
```

**3. Logs Not Appearing:**
```bash
# Check log level configuration
grep LOG_LEVEL .env

# Verify service name matches
grep SERVICE_NAME .env

# Test logging directly
npx nx serve api
# Make some API requests
curl http://localhost:3000/api/v1/health
```

**4. Performance Issues:**
```bash
# Check log volume
du -sh logs/

# Monitor log rate
tail -f logs/app.log | wc -l

# Adjust log levels for production
# Set LOG_LEVEL=warn or LOG_LEVEL=error
```

#### **Environment Verification:**

**Complete Health Check Script:**
```bash
#!/bin/bash
echo "=== AegisX Logging Health Check ==="

echo "1. Environment Configuration:"
grep -E "SEQ_ENABLED|LOG_.*_ENABLED|SERVICE_NAME" .env

echo -e "\n2. Container Status:"
if [ "$SEQ_ENABLED" = "true" ]; then
  docker-compose -f docker-compose.seq.yml ps
else
  docker-compose -f docker-compose.loki.yml ps
fi

echo -e "\n3. Service Health:"
curl -s http://localhost:3000/health && echo " ✓ API healthy"
if [ "$SEQ_ENABLED" = "true" ]; then
  curl -s http://localhost:5341 >/dev/null && echo " ✓ Seq accessible"
else
  curl -s http://localhost:3100/ready >/dev/null && echo " ✓ Loki healthy"
  curl -s http://localhost:3001/api/health >/dev/null && echo " ✓ Grafana healthy"
fi

echo -e "\n4. Log Files:"
ls -la logs/ 2>/dev/null || echo " ! No log files found"

echo -e "\n5. Recent Logs:"
tail -5 logs/app.log 2>/dev/null || echo " ! No recent logs"
```

#### **Performance Tuning:**

**For High-Volume Logging:**
```bash
# Increase log retention cleanup
# Edit docker-compose.loki.yml or Seq settings

# Implement log sampling (reduce debug logs in production)
LOG_LEVEL=warn

# Use async logging for better performance
# (Already implemented in Winston configuration)

# Monitor disk usage
df -h
```

#### **Migration Between Systems:**

**From Seq to Grafana + Loki:**
```bash
# 1. Stop Seq
docker-compose -f docker-compose.seq.yml down

# 2. Update environment
sed -i 's/SEQ_ENABLED=true/SEQ_ENABLED=false/' .env
echo "LOG_FILE_ENABLED=true" >> .env

# 3. Start Loki stack
docker-compose -f docker-compose.loki.yml up -d

# 4. Restart API
npx nx serve api
```

**From Grafana + Loki to Seq:**
```bash
# 1. Stop Loki stack
docker-compose -f docker-compose.loki.yml down

# 2. Update environment
sed -i 's/SEQ_ENABLED=false/SEQ_ENABLED=true/' .env
sed -i 's/LOG_FILE_ENABLED=true/LOG_FILE_ENABLED=false/' .env

# 3. Start Seq
docker-compose -f docker-compose.seq.yml up -d

# 4. Restart API
npx nx serve api
```

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

## Production Deployment

### Environment-Specific Configuration

#### **Development Environment:**
```bash
# .env for development
LOG_LEVEL=debug
LOG_CONSOLE_ENABLED=true
LOG_FILE_ENABLED=true
SEQ_ENABLED=true                    # Use Seq for detailed debugging
```

#### **Staging Environment:**
```bash
# .env for staging
LOG_LEVEL=info
LOG_CONSOLE_ENABLED=false           # Disable console logs
LOG_FILE_ENABLED=true
SEQ_ENABLED=false                   # Use Grafana + Loki for production-like setup
```

#### **Production Environment:**
```bash
# .env for production
LOG_LEVEL=warn                      # Reduce log volume
LOG_CONSOLE_ENABLED=false
LOG_FILE_ENABLED=true
SEQ_ENABLED=false                   # Use Grafana + Loki for scalability

# Additional production settings
STRUCTURED_LOGGING_ENABLED=true
SERVICE_NAME=aegisx-api-prod
ENVIRONMENT=production
```

### Security Hardening

#### **Seq Production Setup:**
```bash
# Use environment variables for sensitive data
SEQ_API_KEY=${SEQ_API_KEY}
SEQ_URL=https://seq.yourdomain.com

# Enable authentication in Seq
# Go to Seq Settings → Authentication → Enable

# Configure HTTPS with proper certificates
# Update docker-compose.seq.yml with SSL certificates
```

#### **Grafana + Loki Production Setup:**
```bash
# Secure Grafana
# Change default admin password
GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}

# Enable HTTPS
GF_SERVER_PROTOCOL=https
GF_SERVER_CERT_FILE=/etc/ssl/certs/grafana.crt
GF_SERVER_CERT_KEY=/etc/ssl/private/grafana.key

# Configure authentication (LDAP, OAuth, etc.)
GF_AUTH_LDAP_ENABLED=true
```

### Scaling Considerations

#### **High-Volume Scenarios (>1000 req/s):**

**Seq Scaling:**
- Use Seq clustering with shared storage
- Implement log sampling for non-critical logs
- Set up log retention policies (30-90 days)

**Loki Scaling:**
- Use object storage (S3, GCS) instead of local filesystem
- Implement horizontal scaling with multiple Loki instances
- Configure Grafana for multiple Loki data sources

#### **Multi-Instance Deployment:**
```yaml
# docker-compose.prod.yml example
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    replicas: 3
    deploy:
      placement:
        constraints:
          - node.role == worker
    environment:
      - LOKI_CONFIG_FILE=/etc/loki/loki-prod.yml
    volumes:
      - ./config/loki-prod.yml:/etc/loki/loki-prod.yml
      - loki-data:/loki
```

### Monitoring & Alerting

#### **Essential Alerts:**
```yaml
# Alert rules for production
alerts:
  - name: HighErrorRate
    condition: rate({service="aegisx-api", level="error"}[5m]) > 0.1
    notification: critical
    
  - name: MissingAuditLogs
    condition: absent_over_time({complianceLevel="HIPAA"}[10m])
    notification: compliance-team
    
  - name: HighLogVolume
    condition: rate({service="aegisx-api"}[5m]) > 100
    notification: ops-team
```

#### **Health Monitoring:**
```bash
# Monitor log pipeline health
# Check log ingestion rates
# Monitor storage usage
# Alert on pipeline failures
```

## Security Considerations

### HIPAA Compliance
- All audit logs include compliance level markers
- Sensitive data is sanitized before logging
- Correlation IDs allow audit trail tracking
- Implement log encryption at rest and in transit
- Regular audit log integrity checks

### Access Control
- **Seq**: Configure authentication and user roles, enable API key rotation
- **Grafana**: Use strong admin passwords, configure RBAC, enable 2FA
- **Log files**: Appropriate file permissions (600) and access controls
- **Network**: Use VPN or private networks for log access

### Data Privacy
- No sensitive data (passwords, tokens, PII) in logs
- Personal information is masked or excluded using data sanitization
- Audit logs track data access without exposing sensitive data
- Implement log retention policies for compliance
- Regular security audits of logging infrastructure

### Compliance Features
- **Data Residency**: Ensure logs stay within required geographic boundaries
- **Encryption**: All logs encrypted in transit (TLS) and at rest
- **Access Logging**: Track who accesses logs and when
- **Data Retention**: Automatic deletion after compliance periods
- **Backup & Recovery**: Secure backup procedures for audit logs