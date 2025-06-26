# 🎯 AegisX Logging System Selector

## Overview
AegisX รองรับ monitoring solutions หลายแบบที่สามารถเลือกใช้ได้ตามความต้องการ โดย**ไม่รันพร้อมกัน**เพื่อประหยัด resources และหลีกเลี่ยง conflicts

## 🚀 Quick Start

### การใช้งาน Logging Selector Script
```bash
# รันจาก project root directory
./scripts/logging-selector.sh
```

## 📊 Monitoring Solutions

### 1. 🔍 **Seq (SQL-based analysis)**
**เหมาะสำหรับ:** Small to medium applications, SQL-familiar teams
- **Pros:** 
  - Powerful SQL querying
  - Rich filtering capabilities  
  - Built-in alerting
  - Easy setup
- **Architecture:** `API → Winston → Seq HTTP transport`
- **Access:** http://localhost:5341
- **Resources:** Low (~100MB RAM)

### 2. 📈 **Grafana + Loki (Simple)**
**เหมาะสำหรับ:** Production environments, Prometheus ecosystem
- **Pros:**
  - Cloud-native architecture
  - Excellent visualization
  - Prometheus-style querying
  - Good for scaling
- **Architecture:** `API → Winston → Files → Promtail → Loki → Grafana`
- **Access:** 
  - Grafana: http://localhost:3001 (admin/admin123)
  - Loki API: http://localhost:3100
- **Resources:** Medium (~300MB RAM)

### 3. 🚀 **Fluent Bit + Loki (Advanced + HIPAA)**
**เหมาะสำหรับ:** Healthcare applications, compliance requirements
- **Pros:**
  - **HIPAA compliance** with automatic data sanitization
  - **Advanced correlation tracking**
  - **High performance** (2x faster than Promtail)
  - **Multi-destination** output support
  - **Lua scripting** for complex processing
- **Architecture:** `API → Winston → Files → Fluent Bit (HIPAA + Processing) → Loki → Grafana`
- **Access:**
  - Grafana: http://localhost:3001 (admin/admin123)
  - Fluent Bit monitoring: http://localhost:2020
  - Loki API: http://localhost:3100
- **Resources:** Medium (~350MB RAM)

### 4. 📊 **Fluent Bit + Elasticsearch (Analytics)**
**เหมาะสำหรับ:** Big data analytics, complex search requirements
- **Pros:**
  - **Advanced analytics** with Elasticsearch
  - **Complex search capabilities**
  - **Data visualization** with Kibana
  - **Full-text search** across all logs
  - **HIPAA compliance** + **Business intelligence**
- **Architecture:** `API → Winston → Files → Fluent Bit → Elasticsearch + Loki`
- **Access:**
  - Elasticsearch: http://localhost:9200
  - Kibana: http://localhost:5601
  - Fluent Bit monitoring: http://localhost:2020
- **Resources:** High (~1GB RAM)

## 🎛️ Selector Menu Options

### Main Menu Commands
```
1) 🔍 Seq (SQL-based analysis)
2) 📈 Grafana + Loki (Simple)  
3) 🚀 Fluent Bit + Loki (Advanced + HIPAA)
4) 📊 Fluent Bit + Elasticsearch (Analytics)
5) 📊 Show Current Status
6) 🛑 Stop All Monitoring
7) 🔄 Restart API
8) ❌ Exit
```

### What Happens When You Select:

#### Option 1: Seq
- Stops all other monitoring services
- Updates `.env`: `SEQ_ENABLED=true`, `LOG_FILE_ENABLED=false`
- Starts `docker-compose.seq.yml`
- Prompts to restart API

#### Option 2: Grafana + Loki
- Stops all other monitoring services  
- Updates `.env`: `SEQ_ENABLED=false`, `LOG_FILE_ENABLED=true`
- Starts `docker-compose.loki.yml`
- Uses Promtail for log collection

#### Option 3: Fluent Bit + Loki
- Stops all other monitoring services
- Updates `.env`: `SEQ_ENABLED=false`, `LOG_FILE_ENABLED=true`, `FLUENT_BIT_ENABLED=true`
- Switches to `fluent-bit-simple.conf`
- Starts `docker-compose.fluent-bit.yml`

#### Option 4: Fluent Bit + Elasticsearch
- Stops all other monitoring services
- Updates `.env` for file logging
- Switches to full `fluent-bit.conf`
- Starts with `--profile elasticsearch`

## 🔧 Manual Commands

### Direct Docker Compose Commands
```bash
# Seq only
docker-compose -f docker-compose.seq.yml up -d

# Loki + Grafana + Promtail
docker-compose -f docker-compose.loki.yml up -d

# Fluent Bit + Loki + Grafana (default)
docker-compose -f docker-compose.fluent-bit.yml up -d

# Fluent Bit + Elasticsearch + Kibana
docker-compose -f docker-compose.fluent-bit.yml --profile elasticsearch up -d

# Fluent Bit + Seq (alternative output)
docker-compose -f docker-compose.fluent-bit.yml --profile seq up -d
```

### Stop All Monitoring
```bash
docker-compose -f docker-compose.seq.yml down
docker-compose -f docker-compose.loki.yml down  
docker-compose -f docker-compose.fluent-bit.yml down
```

## 📋 Environment Variables

### Automatic Configuration
The selector script automatically updates `.env` with appropriate settings:

```bash
# For Seq
SEQ_ENABLED=true
LOG_FILE_ENABLED=false
LOG_CONSOLE_ENABLED=true

# For Loki/Fluent Bit
SEQ_ENABLED=false  
LOG_FILE_ENABLED=true
LOG_CONSOLE_ENABLED=true

# For Fluent Bit
FLUENT_BIT_ENABLED=true
CLUSTER_NAME=local
SERVICE_VERSION=1.0.0
```

## 🏥 Healthcare Compliance

### HIPAA-Ready Configurations
For healthcare applications, use options with **Fluent Bit**:

#### **Option 3: Fluent Bit + Loki**
- ✅ Automatic PII sanitization
- ✅ Correlation ID tracking
- ✅ Compliance markers in logs
- ✅ Performance monitoring

#### **Option 4: Fluent Bit + Elasticsearch**  
- ✅ All HIPAA features above
- ✅ Advanced search capabilities
- ✅ Business intelligence
- ✅ Audit trail analytics

### Compliance Features
```lua
-- Automatic sanitization examples
"SSN: 123-45-6789" → "SSN: ***-**-****"
"Phone: 555-123-4567" → "Phone: (***) ***-****"
"Email: patient@email.com" → "Email: ***@***.***"
```

## 🔍 Monitoring & Health Checks

### Health Check Commands
```bash
# Check container status
docker ps | grep -E "(seq|loki|grafana|fluent-bit|elasticsearch)"

# Test endpoints
curl http://localhost:5341      # Seq
curl http://localhost:3100/ready # Loki
curl http://localhost:2020      # Fluent Bit
curl http://localhost:9200      # Elasticsearch
```

### Log Flow Verification
```bash
# Generate test logs
curl http://localhost:3000/api/v1/health

# Check logs in destination
curl "http://localhost:3100/loki/api/v1/query?query={service=\"aegisx-api\"}" # Loki
curl "http://localhost:9200/aegisx-logs-*/_search" # Elasticsearch
```

## 🚨 Troubleshooting

### Common Issues

**Port Conflicts:**
- Make sure only one monitoring solution runs at a time
- Use `./scripts/logging-selector.sh` option 6 to stop all

**Resource Issues:**
- Elasticsearch stack requires ~1GB RAM
- Use Seq or simple Loki for resource-constrained environments

**Permission Issues:**
- Fluent Bit volumes are handled automatically
- Log files need to be readable: `chmod 644 logs/*.log`

### Quick Fix Commands
```bash
# Reset everything
./scripts/logging-selector.sh
# Choose option 6 (Stop All)
# Then choose your preferred option

# Manual cleanup
docker system prune -f
docker volume prune -f
```

## 📚 Further Reading

- [Logging System Documentation](./logging-system.md) - Complete technical guide
- [Fluent Bit Setup Guide](./fluent-bit-setup.md) - Advanced configuration
- [HIPAA Compliance Features](./fluent-bit-setup.md#hipaa-compliance-features) - Healthcare compliance

## 💡 Recommendations

### By Use Case

| Use Case | Recommended Solution | Reason |
|----------|---------------------|---------|
| **Development** | Seq | Easy setup, powerful querying |
| **Small Production** | Grafana + Loki | Good balance of features/resources |
| **Healthcare Production** | Fluent Bit + Loki | HIPAA compliance required |
| **Enterprise Analytics** | Fluent Bit + Elasticsearch | Advanced analytics needs |

### By Team Expertise

| Team Background | Recommended Solution |
|----------------|---------------------|
| **SQL-familiar** | Seq |
| **Prometheus/Grafana** | Loki options |
| **ELK Stack** | Fluent Bit + Elasticsearch |
| **Healthcare** | Fluent Bit (any variant) |