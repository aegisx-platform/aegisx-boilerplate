# 🚀 Production Deployment Guide - AegisX Logging System

## ⚠️ Production Readiness Status

**Current Status: 80% Ready** - Requires additional hardening and configuration

### ✅ What's Ready
- Complete logging selector system with 4 monitoring options
- HIPAA-compliant data sanitization
- Correlation tracking and audit trails
- Docker containerization with health checks
- Comprehensive documentation

### 🔧 What Needs Configuration
- Production security hardening
- Resource limits and optimization
- Network security and SSL/TLS
- Log retention and backup strategy
- Environment-specific configurations

---

## 📋 Pre-Production Checklist

### 🔒 Security Configuration

#### 1. Environment Variables
Create production-specific environment file:

```bash
# Create production environment
cp .env.example .env.production

# Configure production settings
cat >> .env.production << EOF
# Production Environment
ENVIRONMENT=production
NODE_ENV=production
CLUSTER_NAME=production-cluster

# Security
CORS_ORIGIN=https://your-domain.com
API_KEY_ENCRYPTION_SECRET=your-256-bit-secret-here

# Database (Use managed services)
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_NAME=aegisx_production
DB_USER=aegisx_prod_user
DB_PASSWORD=strong-database-password

# Logging Authentication
ES_USER=elastic_prod_user
ES_PASSWORD=complex-elasticsearch-password
SEQ_ADMIN_PASSWORD_HASH=bcrypt-hashed-password
SEQ_API_KEY=production-seq-api-key

# APM (Enable for production monitoring)
APM_ENABLED=true
APM_SERVICE_NAME=aegisx-api-prod
EOF
```

#### 2. Docker Security Hardening

Update `docker-compose.fluent-bit.yml` for production:

```yaml
# Production security additions
services:
  fluent-bit:
    # Remove public monitoring port in production
    ports:
      # - "2020:2020"  # Comment out for production
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  elasticsearch:
    # Increase heap size for production
    environment:
      - "ES_JAVA_OPTS=-Xms1g -Xmx2g"
      - xpack.security.enabled=true  # Enable security
      - ELASTIC_PASSWORD=${ES_PASSWORD}
    # Remove public ports
    ports: []  # Use internal network only
    deploy:
      resources:
        limits:
          memory: 3g
          cpus: '2'

  loki:
    deploy:
      resources:
        limits:
          memory: 1g
          cpus: '1'
    command: 
      - -config.file=/etc/loki/local-config.yaml
      - -log.level=warn  # Reduce log verbosity
```

### 🌐 Network Security

#### 1. Reverse Proxy Configuration (Nginx)

```nginx
# /etc/nginx/sites-available/aegisx-monitoring
server {
    listen 80;
    server_name monitoring.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name monitoring.your-domain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Grafana
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Loki API (restricted access)
    location /loki/ {
        allow 10.0.0.0/8;    # Internal network only
        allow 172.16.0.0/12;
        allow 192.168.0.0/16;
        deny all;
        
        proxy_pass http://localhost:3100/;
    }
}
```

#### 2. Firewall Rules

```bash
# UFW Configuration
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Application ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # API (internal)

# Deny direct access to monitoring ports
sudo ufw deny 3001  # Grafana
sudo ufw deny 3100  # Loki
sudo ufw deny 5341  # Seq
sudo ufw deny 9200  # Elasticsearch

sudo ufw enable
```

---

## 🏥 Healthcare Production Setup

### Recommended Configuration: Fluent Bit + Loki

**Why this configuration:**
- ✅ HIPAA compliance with automatic PII sanitization
- ✅ Moderate resource usage (~500MB total)
- ✅ Comprehensive audit trails
- ✅ High performance log processing
- ✅ Cloud-native architecture

### Setup Steps

```bash
# 1. Configure production environment
cp .env.example .env.production
# Edit .env.production with production values

# 2. Deploy with logging selector
./scripts/logging-selector.sh

# Choose Option 3: Fluent Bit + Loki (Advanced + HIPAA)

# 3. Verify HIPAA compliance
curl -X POST http://localhost:3000/api/v1/test \
  -H "Content-Type: application/json" \
  -d '{"ssn": "123-45-6789", "phone": "555-123-4567"}'

# 4. Check sanitized logs in Grafana
# Should show: "ssn": "***-**-****", "phone": "(***) ***-****"
```

### HIPAA Compliance Verification

```bash
# Test PII sanitization
echo '{"patient_ssn": "123-45-6789", "email": "john@example.com"}' | \
docker exec -i aegisx-fluent-bit /fluent-bit/bin/fluent-bit \
  -c /fluent-bit/etc/test-config.conf

# Expected output: PII should be masked
```

---

## 🏢 Enterprise Production Setup

### Recommended Configuration: Fluent Bit + Elasticsearch

**Why this configuration:**
- ✅ Advanced analytics and business intelligence
- ✅ Full-text search across all logs
- ✅ Complex data relationships and reporting
- ✅ Scalable for high-volume environments

### Resource Requirements

```yaml
# Minimum production resources
CPU: 4 cores
RAM: 8GB (4GB for Elasticsearch + 2GB for other services)
Storage: 100GB+ SSD for log retention
Network: 1Gbps for log ingestion
```

### Setup with High Availability

```bash
# 1. Configure for high volume
export ES_JAVA_OPTS="-Xms2g -Xmx4g"
export FLUENT_BIT_WORKERS=4

# 2. Deploy with analytics profile
docker-compose -f docker-compose.fluent-bit.yml \
  --profile elasticsearch \
  --profile analytics \
  up -d

# 3. Configure index lifecycle management
curl -X PUT "localhost:9200/_ilm/policy/aegisx-policy" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_size": "5GB",
              "max_age": "7d"
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "allocate": {
              "number_of_replicas": 0
            }
          }
        },
        "delete": {
          "min_age": "90d"
        }
      }
    }
  }'
```

---

## 📊 Monitoring & Maintenance

### Health Check Script

Create `/opt/aegisx/health-check.sh`:

```bash
#!/bin/bash

# Health check script for AegisX logging system
LOG_FILE="/var/log/aegisx-health.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting health check..." >> $LOG_FILE

# Check API health
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health)
if [ "$API_STATUS" = "200" ]; then
    echo "[$DATE] ✅ API: Healthy" >> $LOG_FILE
else
    echo "[$DATE] ❌ API: Failed (Status: $API_STATUS)" >> $LOG_FILE
fi

# Check logging services
SERVICES=("aegisx-loki" "aegisx-grafana" "aegisx-fluent-bit")
for service in "${SERVICES[@]}"; do
    if docker ps | grep -q "$service"; then
        echo "[$DATE] ✅ $service: Running" >> $LOG_FILE
    else
        echo "[$DATE] ❌ $service: Not running" >> $LOG_FILE
        # Restart service
        docker-compose -f docker-compose.fluent-bit.yml restart $service
    fi
done

# Check disk space
DISK_USAGE=$(df /var/lib/docker | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "[$DATE] ⚠️  Disk usage high: ${DISK_USAGE}%" >> $LOG_FILE
fi

echo "[$DATE] Health check completed" >> $LOG_FILE
```

### Log Rotation Configuration

```bash
# /etc/logrotate.d/aegisx-logs
/var/log/aegisx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
    postrotate
        docker kill -s USR1 aegisx-fluent-bit 2>/dev/null || true
    endscript
}
```

### Backup Strategy

```bash
#!/bin/bash
# /opt/aegisx/backup-logs.sh

BACKUP_DIR="/opt/backups/aegisx-logs"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

# Backup Loki data
docker run --rm \
  -v aegisx-boilerplate_loki-data:/data \
  -v "$BACKUP_DIR/$DATE":/backup \
  alpine:latest \
  tar czf /backup/loki-data-$DATE.tar.gz -C /data .

# Backup Grafana dashboards
docker run --rm \
  -v aegisx-boilerplate_grafana-data:/data \
  -v "$BACKUP_DIR/$DATE":/backup \
  alpine:latest \
  tar czf /backup/grafana-data-$DATE.tar.gz -C /data .

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR/$DATE"
```

---

## 🚨 Troubleshooting

### Common Production Issues

#### 1. High Memory Usage
```bash
# Check container memory usage
docker stats --no-stream

# If Elasticsearch using too much memory:
docker-compose -f docker-compose.fluent-bit.yml \
  exec elasticsearch \
  curl -X PUT "localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -d '{"transient": {"indices.memory.index_buffer_size": "10%"}}'
```

#### 2. Log Ingestion Lag
```bash
# Check Fluent Bit metrics
curl http://localhost:2020/api/v1/metrics

# Check buffer usage
docker-compose -f docker-compose.fluent-bit.yml logs fluent-bit | grep buffer
```

#### 3. Disk Space Issues
```bash
# Clean old Docker logs
docker system prune -f
docker volume prune -f

# Clean old application logs
find /var/log/aegisx -name "*.log" -mtime +7 -delete
```

---

## 📈 Performance Optimization

### Production Tuning

#### 1. Fluent Bit Optimization
```ini
# config/fluent-bit-production.conf
[SERVICE]
    Flush        1
    Daemon       off
    Log_Level    warn
    Parsers_File parsers.conf
    HTTP_Server  On
    HTTP_Listen  0.0.0.0
    HTTP_Port    2020
    storage.path /var/log/fluent-bit/
    storage.sync normal
    storage.checksum off
    storage.backlog.mem_limit 50M
```

#### 2. Loki Configuration
```yaml
# config/loki-production.yml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 720h  # 30 days
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
  max_query_parallelism: 32
```

---

## 🎯 Deployment Recommendations

### By Environment Size

| Environment | Recommended Solution | Resources | Notes |
|-------------|---------------------|-----------|-------|
| **Development** | Seq | 512MB RAM | Easy setup, SQL querying |
| **Staging** | Grafana + Loki | 1GB RAM | Production-like testing |
| **Small Production** | Fluent Bit + Loki | 2GB RAM | HIPAA ready, moderate resources |
| **Large Production** | Fluent Bit + Elasticsearch | 8GB+ RAM | Full analytics, high performance |

### By Industry

| Industry | Recommended Solution | Key Features |
|----------|---------------------|--------------|
| **Healthcare** | Fluent Bit + Loki | HIPAA compliance, PII sanitization |
| **Financial** | Fluent Bit + Elasticsearch | Audit trails, compliance reporting |
| **E-commerce** | Fluent Bit + Loki | Performance monitoring, correlation |
| **SaaS** | Grafana + Loki | Cost-effective, cloud-native |

---

## 📋 Final Production Checklist

### Pre-Launch
- [ ] Environment variables configured for production
- [ ] Resource limits set appropriately
- [ ] Security hardening applied
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Log retention policies set
- [ ] Backup strategy implemented
- [ ] Health checks configured
- [ ] Monitoring alerts set up

### Post-Launch
- [ ] Monitor resource usage for first 24 hours
- [ ] Verify log ingestion and processing
- [ ] Test alert notifications
- [ ] Validate backup and restore procedures
- [ ] Review security logs
- [ ] Performance optimization if needed

### Ongoing Maintenance
- [ ] Weekly health check reviews
- [ ] Monthly security updates
- [ ] Quarterly capacity planning
- [ ] Annual security audits

---

**🎯 Summary:** The AegisX logging system is 80% production-ready. Complete the security hardening and environment-specific configuration above for full production deployment.

For immediate production use, start with **Fluent Bit + Loki** configuration for the best balance of features, security, and resource efficiency.