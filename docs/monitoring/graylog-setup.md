# 🔍 Graylog Integration Guide - AegisX Healthcare Logging

## Overview

Graylog is a powerful, enterprise-grade log management platform that provides centralized log collection, real-time analysis, and powerful search capabilities. This guide shows how to integrate Graylog with the AegisX platform for comprehensive log management.

## 🚀 Quick Start

### Option 1: Graylog Only (Simple)
```bash
# Use the logging selector
./scripts/logging-selector.sh

# Choose Option 5: Graylog (Centralized Log Management)
```

### Option 2: Graylog + Fluent Bit (Advanced + HIPAA)
```bash
# Use the logging selector  
./scripts/logging-selector.sh

# Choose Option 6: Graylog + Fluent Bit (Advanced + HIPAA)
```

### Manual Setup
```bash
# Start Graylog stack
docker-compose -f docker-compose.graylog.yml up -d

# With Fluent Bit processing
docker-compose -f docker-compose.graylog.yml --profile fluent-bit up -d
```

## 🏗️ Architecture

### Graylog Simple Architecture
```
API → Winston → File Logs → Direct GELF → Graylog → MongoDB + Elasticsearch
```

### Graylog + Fluent Bit Architecture
```
API → Winston → File Logs → Fluent Bit (HIPAA Processing) → Graylog → Storage
```

## 🛠️ Configuration

### Environment Variables

Add to your `.env` file:

```bash
# Graylog Configuration
GRAYLOG_ENABLED=true
GRAYLOG_HOST=graylog
GRAYLOG_PORT=12201

# Graylog Security (Production)
GRAYLOG_PASSWORD_SECRET=your-password-pepper-min-16-chars
GRAYLOG_ROOT_PASSWORD_SHA2=your-sha2-password-hash
GRAYLOG_HTTP_EXTERNAL_URI=https://your-domain.com/graylog/

# MongoDB (Graylog metadata storage)
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=secure-mongo-password

# Elasticsearch (Graylog log storage)
ES_JAVA_OPTS=-Xms512m -Xmx512m

# Timezone
GRAYLOG_TIMEZONE=Asia/Bangkok
```

### Generate Password Hash
```bash
# Generate SHA2 password hash for Graylog admin
echo -n "your-password" | sha256sum
```

## 📊 Services & Ports

| Service | Port | Description | URL |
|---------|------|-------------|-----|
| **Graylog Web** | 9000 | Web Interface | http://localhost:9000 |
| **GELF TCP** | 12201 | Log Input (TCP) | Direct log shipping |
| **GELF UDP** | 12201 | Log Input (UDP) | Direct log shipping |
| **Syslog TCP** | 1514 | Syslog Input | Traditional syslog |
| **Syslog UDP** | 1514 | Syslog Input | Traditional syslog |
| **Raw TCP** | 5555 | Raw Text Input | Plaintext logs |
| **Elasticsearch** | 9201 | Search Engine | http://localhost:9201 |
| **MongoDB** | 27017 | Metadata Store | Internal only |
| **Fluent Bit** | 2021 | Monitoring | http://localhost:2021 |

## 🔑 Initial Setup

### 1. Access Graylog Web Interface

```bash
# Default credentials
URL: http://localhost:9000
Username: admin
Password: admin
```

### 2. Configure Inputs

#### GELF TCP Input (Recommended)
1. Go to **System → Inputs**
2. Select **GELF TCP** from dropdown
3. Click **Launch new input**
4. Configure:
   ```
   Title: AegisX API Logs
   Bind address: 0.0.0.0
   Port: 12201
   ```
5. Click **Save**

#### Syslog UDP Input (Optional)
1. Select **Syslog UDP** from dropdown
2. Configure:
   ```
   Title: AegisX Syslog
   Bind address: 0.0.0.0
   Port: 1514
   ```

### 3. Set Up Log Streams

#### Healthcare Logs Stream
1. Go to **Streams**
2. Click **Create Stream**
3. Configure:
   ```
   Title: Healthcare Logs
   Description: HIPAA-compliant healthcare logs
   ```
4. Add Rules:
   ```
   _aegisx_context must match healthcare
   OR
   _aegisx_hipaa must match compliant
   ```

#### Error Logs Stream
1. Create another stream:
   ```
   Title: Error Logs
   Description: Application errors and exceptions
   ```
2. Add Rules:
   ```
   level must be less than or equal to 3
   OR
   _aegisx_error must match true
   ```

#### API Performance Stream
1. Create stream:
   ```
   Title: API Performance
   Description: Request performance monitoring
   ```
2. Add Rules:
   ```
   _aegisx_context must match api
   AND
   _aegisx_duration_ms must be present
   ```

## 🏥 HIPAA Compliance Features

### Automatic Data Sanitization

When using **Graylog + Fluent Bit** option, sensitive data is automatically sanitized:

```lua
-- Examples of automatic sanitization
"ssn": "123-45-6789" → "ssn": "***-**-****"
"phone": "555-123-4567" → "phone": "(***) ***-****"
"email": "patient@example.com" → "email": "***@***.***"
"credit_card": "4111111111111111" → "credit_card": "****-****-****-1111"
```

### Compliance Fields

Graylog automatically receives compliance fields:

- `_aegisx_hipaa`: Compliance status
- `_aegisx_context`: Log context (healthcare, api, database)
- `_aegisx_sanitized`: Data sanitization applied
- `_aegisx_audit_trail`: Audit trail marker

## 📈 Dashboards & Visualizations

### Default AegisX Dashboard

Create a dashboard with these widgets:

#### 1. Message Count Over Time
```
Query: *
Visualization: Line Chart
Time: Last 24 hours
```

#### 2. Log Levels Distribution
```
Query: *
Visualization: Pie Chart
Field: level
```

#### 3. Top Error Messages
```
Query: level:<=3
Visualization: Data Table
Fields: timestamp, short_message, _aegisx_context
```

#### 4. API Performance
```
Query: _aegisx_context:api AND _aegisx_duration_ms:[0 TO *]
Visualization: Histogram
Field: _aegisx_duration_ms
```

#### 5. Healthcare Activity
```
Query: _aegisx_context:healthcare
Visualization: Line Chart
Field: timestamp
```

### Import Dashboard JSON

Create `config/graylog/dashboards/aegisx-dashboard.json`:

```json
{
  "title": "AegisX Healthcare API Monitoring",
  "description": "Comprehensive monitoring for AegisX healthcare platform",
  "dashboard_widgets": [
    {
      "description": "Message volume over time",
      "type": "QUICKVALUES",
      "configuration": {
        "timerange": {
          "type": "relative",
          "range": 3600
        },
        "query": "*",
        "field": "level"
      }
    }
  ]
}
```

## 🚨 Alerting & Notifications

### 1. Error Rate Alert

Create alert for high error rates:

1. Go to **Alerts → Event Definitions**
2. Click **Create Event Definition**
3. Configure:
   ```
   Title: High Error Rate
   Description: Error rate exceeds threshold
   
   Condition:
   - Query: level:<=3
   - Aggregation: count()
   - Time Window: 5 minutes
   - Threshold: > 10 errors
   ```

### 2. HIPAA Violation Alert

Create alert for compliance violations:

```
Title: HIPAA Compliance Violation
Query: _aegisx_hipaa:violation OR _aegisx_sanitized:failed
Threshold: > 0 occurrences in 1 minute
```

### 3. API Performance Alert

Create alert for slow responses:

```
Title: Slow API Performance
Query: _aegisx_context:api AND _aegisx_duration_ms:>5000
Threshold: > 5 occurrences in 10 minutes
```

### Notification Configuration

1. Go to **Alerts → Notifications**
2. Create notifications for:
   - Email alerts
   - Slack integration
   - Webhook notifications

## 🔍 Advanced Search Examples

### Healthcare Logs
```
# Find all patient-related activities
_aegisx_context:healthcare AND patient_id:*

# Search for specific medical procedures
message:"procedure" AND _aegisx_context:healthcare

# Find HIPAA compliance logs
_aegisx_hipaa:compliant AND timestamp:[now-1h TO now]
```

### API Performance
```
# Slow API requests
_aegisx_context:api AND _aegisx_duration_ms:>1000

# Specific endpoint performance
url:"/api/v1/patients" AND method:"GET"

# Error responses
_aegisx_context:api AND status_code:>=400
```

### Security & Audit
```
# Authentication events
message:"authentication" OR message:"login" OR message:"logout"

# Database operations
_aegisx_context:database AND query:*

# Error patterns
level:<=3 AND message:"error"
```

## 🛡️ Security Configuration

### Production Security

1. **Change Default Credentials**
   ```bash
   # Generate secure password hash
   echo -n "secure-admin-password" | sha256sum
   ```

2. **Enable HTTPS**
   ```yaml
   # docker-compose.graylog.yml
   environment:
     - GRAYLOG_HTTP_EXTERNAL_URI=https://logs.yourdomain.com/
     - GRAYLOG_HTTP_ENABLE_TLS=true
     - GRAYLOG_HTTP_TLS_CERT_FILE=/path/to/cert.pem
     - GRAYLOG_HTTP_TLS_KEY_FILE=/path/to/key.pem
   ```

3. **Network Security**
   ```bash
   # Restrict access to internal network only
   # Remove public port exposure for production
   ```

### User Management

1. **Create User Roles**
   - Healthcare Admin: Full access to healthcare streams
   - API Developer: Access to API performance data
   - Security Analyst: Access to security and audit logs

2. **Configure LDAP/AD** (Optional)
   ```
   System → Authentication → Configure LDAP
   ```

## 📊 Performance Optimization

### Elasticsearch Tuning

```yaml
# Production Elasticsearch settings
environment:
  - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
  - cluster.routing.allocation.disk.threshold_enabled=false
  - action.auto_create_index=false
```

### Graylog Tuning

```yaml
# Production Graylog settings
environment:
  - GRAYLOG_PROCESSBUFFER_PROCESSORS=8
  - GRAYLOG_OUTPUTBUFFER_PROCESSORS=4
  - GRAYLOG_OUTPUT_BATCH_SIZE=1000
  - GRAYLOG_RING_SIZE=131072
```

### MongoDB Optimization

```yaml
# MongoDB performance tuning
environment:
  - MONGO_INITDB_ROOT_USERNAME=graylog_admin
  - MONGO_INITDB_ROOT_PASSWORD=secure_password
volumes:
  - mongodb-data:/data/db
command: mongod --wiredTigerCacheSizeGB 1
```

## 🔧 Maintenance & Backup

### Regular Maintenance

```bash
#!/bin/bash
# graylog-maintenance.sh

# Clean old indices (older than 30 days)
curl -X DELETE "localhost:9201/graylog_*-$(date -d '30 days ago' '+%Y-%m-%d')*"

# Restart services if needed
docker-compose -f docker-compose.graylog.yml restart graylog

# Check disk usage
df -h /var/lib/docker/volumes/
```

### Backup Strategy

```bash
#!/bin/bash
# graylog-backup.sh

BACKUP_DIR="/opt/backups/graylog/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
docker exec aegisx-mongodb mongodump --out /backup
docker cp aegisx-mongodb:/backup "$BACKUP_DIR/mongodb"

# Backup Elasticsearch
docker exec aegisx-elasticsearch-graylog \
  elasticsearch-dump \
  --input=http://localhost:9200 \
  --output="$BACKUP_DIR/elasticsearch.json"

# Backup Graylog config
docker cp aegisx-graylog:/usr/share/graylog/data/config "$BACKUP_DIR/graylog-config"
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Graylog Won't Start
```bash
# Check logs
docker-compose -f docker-compose.graylog.yml logs graylog

# Common causes:
# - MongoDB not ready
# - Elasticsearch not healthy
# - Invalid password secret
```

#### 2. No Logs Received
```bash
# Check input status
curl http://localhost:9000/api/system/inputs

# Test GELF input
echo '{"version":"1.1","host":"test","short_message":"test message"}' | \
  nc localhost 12201

# Check Fluent Bit connection
docker logs aegisx-fluent-bit-graylog
```

#### 3. High Memory Usage
```bash
# Check Elasticsearch heap
docker stats aegisx-elasticsearch-graylog

# Optimize indices
curl -X POST "localhost:9201/_forcemerge?only_expunge_deletes=true"
```

#### 4. Slow Search Performance
```bash
# Check index health
curl http://localhost:9201/_cluster/health

# Optimize search
curl -X POST "localhost:9201/graylog_*/_refresh"
```

## 📋 Integration Checklist

- [ ] Graylog stack deployed and accessible
- [ ] GELF input configured and receiving logs
- [ ] Healthcare logs stream created
- [ ] Error monitoring alerts configured
- [ ] HIPAA compliance verified (if using Fluent Bit)
- [ ] Dashboards created for key metrics
- [ ] User roles and permissions configured
- [ ] Backup strategy implemented
- [ ] Performance tuning applied

## 🎯 Best Practices

### Log Design
- Use structured logging with consistent field names
- Include correlation IDs for request tracing
- Add contextual information for easier filtering
- Implement log levels consistently

### Search Optimization
- Use specific field searches instead of full-text
- Limit time ranges for better performance
- Create saved searches for common queries
- Use streams to organize logs by type

### Security
- Change default passwords immediately
- Use HTTPS in production
- Implement proper user access controls
- Regular security updates and monitoring

---

**🎉 Graylog integration complete!** Your AegisX platform now has enterprise-grade log management with powerful search, alerting, and compliance features.

For production deployment, refer to the [Production Deployment Guide](./production-deployment-guide.md) for additional hardening and optimization.