# 🎯 Logging Selector Usage Guide - AegisX Platform

## Overview

The Logging Selector (`./scripts/logging-selector.sh`) is an interactive tool that allows you to easily switch between different monitoring solutions without conflicts. It's designed to help you choose the right logging stack based on your needs.

## 🚀 Quick Start

### Basic Usage
```bash
# Make sure you're in the project root directory
cd /path/to/aegisx-boilerplate

# Run the logging selector
./scripts/logging-selector.sh
```

### First Time Setup
```bash
# If the script isn't executable, make it executable first
chmod +x scripts/logging-selector.sh

# Create .env if it doesn't exist
cp .env.example .env

# Run the selector
./scripts/logging-selector.sh
```

## 📋 Menu Options Detailed

### 🎛️ Main Menu
```
🎯 Select Logging Solution:
==========================
1) 🔍 Seq (SQL-based analysis)
2) 📈 Grafana + Loki (Simple)
3) 🚀 Fluent Bit + Loki (Advanced + HIPAA)
4) 📊 Fluent Bit + Elasticsearch (Analytics)
5) 🔍 Graylog (Centralized Log Management)
6) 🚀 Graylog + Fluent Bit (Advanced + HIPAA)
7) 📊 Show Current Status
8) 🛑 Stop All Monitoring
9) 🔄 Restart API
10) ❌ Exit

Choose option (1-10):
```

## 📖 Option-by-Option Guide

### Option 1: 🔍 Seq (SQL-based analysis)

**Best for:** Development, SQL-familiar teams, small applications

**What it does:**
- Stops all other monitoring services
- Updates `.env`: `SEQ_ENABLED=true`, `LOG_FILE_ENABLED=false`
- Starts Seq container on port 5341
- Prompts to restart API

**Usage Example:**
```bash
Choose option (1-10): 1

🛑 Stopping all monitoring services...
✅ All monitoring services stopped

🔍 Starting Seq (SQL-based log analysis)
========================================
✅ Seq started successfully!
🌐 Access: http://localhost:5341
📝 Direct Winston logs → Seq HTTP transport

🔄 Restarting API to apply new logging configuration...
Please restart API manually: npx nx serve api
```

**Access:**
- Web Interface: http://localhost:5341
- Default credentials: No authentication required in development
- SQL Query Interface: Built-in query editor

**Features:**
- Powerful SQL querying capabilities
- Real-time log streaming
- Built-in filtering and search
- Signal expressions for advanced queries
- Low resource usage (~100MB RAM)

---

### Option 2: 📈 Grafana + Loki (Simple)

**Best for:** Production environments, Prometheus ecosystem users

**What it does:**
- Stops all other monitoring services
- Updates `.env`: `SEQ_ENABLED=false`, `LOG_FILE_ENABLED=true`
- Starts Loki + Grafana + Promtail containers
- Uses Promtail for log collection

**Usage Example:**
```bash
Choose option (1-10): 2

🛑 Stopping all monitoring services...
✅ All monitoring services stopped

📈 Starting Grafana + Loki (Cloud-native)
==========================================
✅ Grafana + Loki started successfully!
🌐 Grafana: http://localhost:3001 (admin/admin123)
🔧 Loki API: http://localhost:3100
📝 File logs → Promtail → Loki → Grafana
```

**Access:**
- Grafana: http://localhost:3001
  - Username: `admin`
  - Password: `admin123`
- Loki API: http://localhost:3100

**Features:**
- Cloud-native architecture
- Excellent visualization with Grafana
- LogQL query language (similar to PromQL)
- Good for scaling
- Integration with Prometheus ecosystem

---

### Option 3: 🚀 Fluent Bit + Loki (Advanced + HIPAA)

**Best for:** Healthcare applications, compliance requirements

**What it does:**
- Stops all other monitoring services
- Updates `.env`: `FLUENT_BIT_ENABLED=true`, `LOG_FILE_ENABLED=true`
- Switches to `fluent-bit-simple.conf` configuration
- Starts Fluent Bit + Loki + Grafana containers

**Usage Example:**
```bash
Choose option (1-10): 3

🛑 Stopping all monitoring services...
✅ All monitoring services stopped

🚀 Starting Fluent Bit + Advanced Processing
=============================================
✅ Fluent Bit stack started successfully!
🌐 Grafana: http://localhost:3001 (admin/admin123)
⚡ Fluent Bit: http://localhost:2020 (monitoring)
🔧 Loki API: http://localhost:3100
📝 File logs → Fluent Bit (HIPAA + Processing) → Loki → Grafana
```

**Access:**
- Grafana: http://localhost:3001
- Fluent Bit Monitoring: http://localhost:2020
- Loki API: http://localhost:3100

**HIPAA Features:**
- Automatic PII sanitization
- Correlation ID tracking
- Compliance markers in logs
- Performance monitoring
- High-performance log processing

**Example of Data Sanitization:**
```json
// Before processing
{"ssn": "123-45-6789", "phone": "555-123-4567", "email": "john@example.com"}

// After Fluent Bit processing
{"ssn": "***-**-****", "phone": "(***) ***-****", "email": "***@***.***"}
```

---

### Option 4: 📊 Fluent Bit + Elasticsearch (Analytics)

**Best for:** Big data analytics, complex search requirements, business intelligence

**What it does:**
- Stops all other monitoring services
- Updates `.env` for file logging
- Switches to full `fluent-bit.conf` configuration
- Starts with `--profile elasticsearch`
- Downloads Elasticsearch and Kibana (large images ~1GB)

**Usage Example:**
```bash
Choose option (1-10): 4

🛑 Stopping all monitoring services...
✅ All monitoring services stopped

📊 Starting Fluent Bit + Elasticsearch
=======================================
[Downloading Elasticsearch and Kibana images...]
✅ Fluent Bit + Elasticsearch started successfully!
🔍 Elasticsearch: http://localhost:9200
📊 Kibana: http://localhost:5601
⚡ Fluent Bit: http://localhost:2020
📝 File logs → Fluent Bit → Elasticsearch + Loki
```

**Access:**
- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601
- Fluent Bit Monitoring: http://localhost:2020

**Analytics Features:**
- Advanced analytics and aggregations
- Complex search capabilities
- Data visualization with Kibana
- Full-text search across all logs
- Business intelligence dashboards
- Index lifecycle management

**Resource Requirements:**
- RAM: ~1GB+ (Elasticsearch is memory-intensive)
- Storage: Large log retention capabilities
- CPU: Higher processing power for analytics

---

### Option 5: 🔍 Graylog (Centralized Log Management)

**Best for:** Enterprise centralized logging, real-time analysis, operations teams

**What it does:**
- Stops all other monitoring services
- Updates `.env`: `GRAYLOG_ENABLED=true`, `LOG_FILE_ENABLED=true`
- Starts Graylog + MongoDB + Elasticsearch containers
- Sets up multiple input types (GELF, Syslog, Raw)

**Usage Example:**
```bash
Choose option (1-10): 5

🛑 Stopping all monitoring services...
✅ All monitoring services stopped

🔍 Starting Graylog (Centralized Log Management)
===============================================
✅ Graylog started successfully!
🌐 Graylog Web: http://localhost:9000 (admin/admin)
📊 Elasticsearch: http://localhost:9201
📥 GELF Input: localhost:12201 (TCP/UDP)
📥 Syslog Input: localhost:1514 (TCP/UDP)
📥 Raw Input: localhost:5555 (TCP)
📝 File logs → Fluent Bit → Graylog → MongoDB/Elasticsearch

Note: Initial startup may take 2-3 minutes
```

**Access:**
- Graylog Web: http://localhost:9000
  - Username: `admin`
  - Password: `admin`
- Elasticsearch: http://localhost:9201

**Enterprise Features:**
- Centralized log management
- Real-time alerting and notifications
- Stream processing for log organization
- Role-based access control
- Multiple input protocols
- Dashboard and reporting
- Search and analytics

**Input Types:**
- **GELF (12201):** Structured logging format
- **Syslog (1514):** Traditional syslog protocol
- **Raw TCP (5555):** Plain text logs

---

### Option 6: 🚀 Graylog + Fluent Bit (Advanced + HIPAA) ⭐

**Best for:** Enterprise healthcare with compliance requirements

**What it does:**
- Stops all other monitoring services
- Updates `.env` for Graylog + Fluent Bit integration
- Starts with `--profile fluent-bit`
- Combines enterprise logging with HIPAA compliance

**Usage Example:**
```bash
Choose option (1-10): 6

🛑 Stopping all monitoring services...
✅ All monitoring services stopped

🚀 Starting Graylog + Fluent Bit (Advanced Processing)
=====================================================
✅ Graylog + Fluent Bit started successfully!
🌐 Graylog Web: http://localhost:9000 (admin/admin)
⚡ Fluent Bit: http://localhost:2021 (monitoring)
📊 Elasticsearch: http://localhost:9201
📥 GELF Input: localhost:12201 (TCP/UDP)
📝 File logs → Fluent Bit (HIPAA + Processing) → Graylog

Note: Initial startup may take 2-3 minutes
```

**Access:**
- Graylog Web: http://localhost:9000
- Fluent Bit Monitoring: http://localhost:2021
- Elasticsearch: http://localhost:9201

**Combined Features:**
- All HIPAA compliance features from Fluent Bit
- All enterprise features from Graylog
- Advanced correlation tracking
- Real-time compliance alerting
- Stream processing for healthcare workflows
- Comprehensive audit trails

**Healthcare Compliance:**
- Automatic PII sanitization
- HIPAA violation alerts
- Compliance stream processing
- Audit trail generation
- Role-based access for healthcare roles

---

### Option 7: 📊 Show Current Status

**What it does:**
- Shows all currently running monitoring containers
- Displays service status and health
- No changes to configuration

**Usage Example:**
```bash
Choose option (1-10): 7

📊 Current Status:
==================
Running monitoring services:
NAMES                    IMAGE                      STATUS
aegisx-graylog          graylog/graylog:5.2        Up 5 minutes
aegisx-mongodb          mongo:5.0                  Up 5 minutes
aegisx-elasticsearch-graylog docker.elastic.co/... Up 5 minutes
```

**Information Displayed:**
- Container names and images
- Running status and uptime
- Port mappings
- Resource usage (if available)

---

### Option 8: 🛑 Stop All Monitoring

**What it does:**
- Stops all monitoring services safely
- Removes containers but keeps volumes/data
- Cleans up networks
- Does not modify .env configuration

**Usage Example:**
```bash
Choose option (1-10): 8

🛑 Stopping all monitoring services...
✅ All monitoring services stopped
```

**Services Stopped:**
- Seq containers
- Loki + Grafana + Promtail
- Fluent Bit stacks
- Graylog + MongoDB + Elasticsearch
- All associated networks

**Data Preservation:**
- Log data in volumes is preserved
- Configuration files remain unchanged
- Can restart any service later without data loss

---

### Option 9: 🔄 Restart API

**What it does:**
- Attempts to restart the AegisX API to apply new logging configuration
- Finds running API process and stops it
- Provides instruction for manual restart

**Usage Example:**
```bash
Choose option (1-10): 9

🔄 Restarting API to apply new logging configuration...
Stopping current API (PID: 12345)...
Please restart API manually: npx nx serve api
```

**Manual Restart:**
```bash
# Start the API with new logging configuration
npx nx serve api
```

---

### Option 10: ❌ Exit

**What it does:**
- Exits the logging selector
- No changes to running services
- Returns to command line

## 🔍 Advanced Usage

### Script Command Line Options

While the script is primarily interactive, you can check requirements:

```bash
# Check if running from correct directory
./scripts/logging-selector.sh
# Error: Please run this script from the AegisX project root directory

# Check Docker availability
docker --version
docker-compose --version
```

### Environment File Management

The script automatically manages your `.env` file:

```bash
# Before running selector - create from example
cp .env.example .env

# Script will automatically update relevant settings:
# - SEQ_ENABLED=true/false
# - LOG_FILE_ENABLED=true/false
# - FLUENT_BIT_ENABLED=true/false
# - GRAYLOG_ENABLED=true/false
```

### Multiple Environment Support

For different environments:

```bash
# Development
cp .env.example .env.development
# Edit for development settings
./scripts/logging-selector.sh

# Production
cp .env.example .env.production
# Edit for production settings
cp .env.production .env
./scripts/logging-selector.sh
```

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Permission Denied
```bash
# Problem
bash: ./scripts/logging-selector.sh: Permission denied

# Solution
chmod +x scripts/logging-selector.sh
```

#### 2. Docker Not Running
```bash
# Problem
Cannot connect to the Docker daemon

# Solution
# Start Docker Desktop or Docker service
sudo systemctl start docker  # Linux
# Or start Docker Desktop application
```

#### 3. Port Conflicts
```bash
# Problem
Port 9000 is already in use

# Solution
# Stop other services using the port
sudo lsof -i :9000
# Kill the process or change configuration
```

#### 4. Out of Disk Space
```bash
# Problem
No space left on device

# Solution
# Clean Docker system
docker system prune -f
docker volume prune -f

# Check disk usage
df -h
```

#### 5. Memory Issues
```bash
# Problem
Container killed due to OOM

# Solution
# Check available memory
free -h

# For Elasticsearch, reduce heap size in docker-compose.yml:
# ES_JAVA_OPTS: "-Xms512m -Xmx512m"
```

#### 6. Network Issues
```bash
# Problem
Network conflicts or containers can't communicate

# Solution
# Reset Docker networks
docker network prune -f

# Restart Docker
sudo systemctl restart docker
```

### Service-Specific Troubleshooting

#### Seq Issues
```bash
# Check Seq logs
docker logs aegisx-seq

# Test Seq endpoint
curl http://localhost:5341

# Common issue: API not sending logs
# Check .env: SEQ_ENABLED=true, SEQ_URL=http://localhost:5341
```

#### Grafana + Loki Issues
```bash
# Check all services
docker-compose -f docker-compose.loki.yml logs

# Test Loki
curl http://localhost:3100/ready

# Grafana login issues
# Default: admin/admin123
```

#### Fluent Bit Issues
```bash
# Check Fluent Bit logs
docker logs aegisx-fluent-bit

# Check monitoring endpoint
curl http://localhost:2020

# Common issue: Log files not found
# Ensure API is writing to ./logs/ directory
```

#### Graylog Issues
```bash
# Check all Graylog services
docker-compose -f docker-compose.graylog.yml logs

# Check if all services are up
docker ps | grep -E "(graylog|mongodb|elasticsearch)"

# Test Graylog API
curl http://localhost:9000/api/system/cluster/nodes

# MongoDB connection issues
# Check MONGO_ROOT_USER and MONGO_ROOT_PASSWORD in .env
```

## 📊 Performance Monitoring

### Resource Usage by Option

| Option | RAM Usage | CPU Usage | Startup Time | Best For |
|--------|-----------|-----------|--------------|----------|
| **Seq** | ~100MB | Low | 10s | Development |
| **Grafana + Loki** | ~300MB | Medium | 30s | Small Production |
| **Fluent Bit + Loki** | ~350MB | Medium | 45s | Healthcare |
| **Fluent Bit + ES** | ~1GB+ | High | 2-3min | Analytics |
| **Graylog** | ~800MB | Medium | 2-3min | Enterprise |
| **Graylog + Fluent Bit** | ~900MB | Medium-High | 3-4min | Enterprise Healthcare |

### Monitoring Resource Usage

```bash
# Check container resource usage
docker stats

# Check system resources
htop  # or top

# Check disk usage
docker system df
```

## 🎯 Best Practices

### Development Workflow

1. **Start Simple:**
   ```bash
   # Begin with Seq for development
   ./scripts/logging-selector.sh
   # Choose option 1
   ```

2. **Test with Production-like Setup:**
   ```bash
   # Switch to Grafana + Loki
   ./scripts/logging-selector.sh
   # Choose option 2
   ```

3. **Validate Compliance (Healthcare):**
   ```bash
   # Test HIPAA features
   ./scripts/logging-selector.sh
   # Choose option 6 (Graylog + Fluent Bit)
   ```

### Production Deployment

1. **Choose Right Option:**
   - Small apps: Grafana + Loki (Option 2)
   - Healthcare: Graylog + Fluent Bit (Option 6)
   - Analytics: Fluent Bit + Elasticsearch (Option 4)

2. **Security Configuration:**
   ```bash
   # Update .env for production
   GRAYLOG_PASSWORD_SECRET=your-secure-pepper
   GRAYLOG_ROOT_PASSWORD_SHA2=your-hashed-password
   MONGO_ROOT_PASSWORD=secure-mongo-password
   ```

3. **Resource Planning:**
   - Monitor resource usage during testing
   - Plan for log retention and storage
   - Set up alerting and monitoring

### Switching Between Options

```bash
# Safe switching workflow:
1. ./scripts/logging-selector.sh
2. Choose option 8 (Stop All)
3. Choose your new option
4. Restart API when prompted

# This ensures no conflicts and clean transitions
```

## 📚 Integration Examples

### API Integration

Ensure your API is configured to work with the selected option:

```typescript
// In your API code
import { logger } from './core/plugins/logging'

// This will work with all logging options
logger.info('User login', { 
  userId: '12345',
  correlationId: req.correlationId,
  ip: req.ip 
})
```

### Health Check Integration

```bash
# Create a health check script
#!/bin/bash
# health-check.sh

# Check current logging service
CURRENT_SERVICE=$(docker ps --format "{{.Names}}" | grep -E "(seq|graylog|grafana)" | head -1)

if [ -n "$CURRENT_SERVICE" ]; then
    echo "✅ Logging service running: $CURRENT_SERVICE"
else
    echo "❌ No logging service detected"
    exit 1
fi
```

### Monitoring Integration

```bash
# Add to your monitoring stack
curl -f http://localhost:5341 || echo "Seq down"      # Seq
curl -f http://localhost:3001 || echo "Grafana down"  # Grafana
curl -f http://localhost:9000 || echo "Graylog down"  # Graylog
```

---

**🎉 Complete!** You now have comprehensive knowledge of how to use the AegisX Logging Selector for all your monitoring needs, from development to enterprise production environments.