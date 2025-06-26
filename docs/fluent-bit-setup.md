# Fluent Bit Integration Guide

## Overview
Fluent Bit is a lightweight, high-performance log processor and forwarder that enhances the AegisX logging system with advanced features like HIPAA compliance sanitization, correlation tracking, and multi-destination log routing.

## Architecture

### Fluent Bit Position in AegisX Stack
```
AegisX API → Winston Logger → Log Files → Fluent Bit → Multiple Outputs
                                                     ├── Loki (Primary)
                                                     ├── Elasticsearch (Analytics)
                                                     ├── Seq (Alternative)
                                                     └── File Backup
```

### Key Features
- **HIPAA Compliance**: Automatic sanitization of sensitive healthcare data
- **Correlation Enhancement**: Advanced correlation ID tracking and session management
- **Multi-Output**: Send logs to multiple destinations simultaneously
- **Performance Monitoring**: Built-in metrics and monitoring endpoints
- **Flexible Parsing**: Support for various log formats and sources

## Quick Start

### Option 1: Fluent Bit with Loki (Recommended)
```bash
# Enable file logging for Fluent Bit to collect
echo "LOG_FILE_ENABLED=true" >> .env
echo "FLUENT_BIT_ENABLED=true" >> .env

# Start Fluent Bit stack
docker-compose -f docker-compose.fluent-bit.yml up -d

# Restart API to generate logs
npx nx serve api

# Access monitoring
open http://localhost:2020    # Fluent Bit monitoring
open http://localhost:3001    # Grafana dashboards
```

### Option 2: Fluent Bit with Elasticsearch
```bash
# Start with Elasticsearch profile
docker-compose -f docker-compose.fluent-bit.yml --profile elasticsearch up -d

# Access tools
open http://localhost:9200    # Elasticsearch
open http://localhost:5601    # Kibana
open http://localhost:2020    # Fluent Bit monitoring
```

### Option 3: Fluent Bit with Seq
```bash
# Start with Seq profile
docker-compose -f docker-compose.fluent-bit.yml --profile seq up -d

# Access tools
open http://localhost:5341    # Seq
open http://localhost:2020    # Fluent Bit monitoring
```

## Configuration

### Environment Variables
```bash
# Fluent Bit Core
FLUENT_BIT_ENABLED=true
CLUSTER_NAME=local              # Cluster identifier
SERVICE_VERSION=1.0.0           # Service version for tagging

# Elasticsearch (Optional)
ES_USER=elastic
ES_PASSWORD=changeme

# Seq (Optional)
SEQ_API_KEY=your-api-key
SEQ_ADMIN_PASSWORD_HASH=hashed-password
```

### Fluent Bit Configuration Structure

#### Main Configuration (`config/fluent-bit.conf`)
The configuration includes:

**Service Section:**
- HTTP monitoring server on port 2020
- Storage metrics enabled
- Log level and flush intervals

**Input Sources:**
- AegisX log files (`/var/log/aegisx/*.log`)
- Error logs with specific tagging
- Audit logs for compliance tracking
- Docker container logs (optional)

**Filters:**
- Kubernetes metadata (for K8s deployments)
- AegisX metadata enhancement
- JSON parsing and validation
- Correlation ID tracking
- HIPAA compliance sanitization
- Rate limiting for high-volume logs

**Output Destinations:**
- Loki (primary for Grafana)
- Elasticsearch (for advanced analytics)
- Seq (alternative monitoring)
- File backup (for debugging)

## HIPAA Compliance Features

### Automatic Data Sanitization
The `hipaa_sanitizer.lua` script automatically:

**Sensitive Field Detection:**
- SSN, DOB, Patient IDs
- Phone numbers, email addresses
- Medical record numbers
- Insurance information
- Diagnosis and treatment data

**Text Pattern Sanitization:**
- SSN patterns: `***-**-****`
- Phone numbers: `(***) ***-****`
- Email addresses: `***@***.***`
- Credit cards: `**** **** **** ****`
- Dates: `**/**/****`

**Compliance Markers:**
- `hipaa_sanitized: true`
- `compliance_processed: true`
- `sanitized_fields: field1,field2`

### Example Sanitization
```json
// Before sanitization
{
  "message": "Patient John Doe (SSN: 123-45-6789) called 555-123-4567",
  "patient_id": "P123456",
  "phone": "555-123-4567"
}

// After sanitization
{
  "message": "Patient John Doe (SSN: ***-**-****) called (***) ***-****",
  "patient_id": "****",
  "phone": "****",
  "hipaa_sanitized": true,
  "sanitized_fields": "patient_id,phone"
}
```

## Correlation Enhancement

### Advanced Correlation Tracking
The `correlation.lua` script adds:

**Session Management:**
- `sessionKey`: correlationId + userId
- `flowKey`: correlationId + operation
- `hasCorrelation`: boolean flag

**Performance Monitoring:**
- `severity_score`: 1-4 based on log level
- `performance_alert`: normal/slow/warning/critical
- Response time categorization

**Healthcare Context:**
- `healthcare_context`: true for HIPAA logs
- `compliance_required`: flag for audit requirements

### Example Enhancement
```json
// Original log
{
  "correlationId": "abc-123",
  "userId": "user456", 
  "level": "error",
  "responseTime": 3000
}

// Enhanced log
{
  "correlationId": "abc-123",
  "userId": "user456",
  "sessionKey": "abc-123:user456",
  "hasCorrelation": true,
  "severity_score": 4,
  "performance_alert": "warning",
  "processed_by": "fluent-bit",
  "processed_at": "2025-06-26T12:00:00.000Z"
}
```

## Multi-Destination Routing

### Loki Output (Primary)
```ini
[OUTPUT]
    Name                loki
    Match               aegisx.*
    Host                loki
    Port                3100
    Labels              job=aegisx-api, service=$service, level=$level
    Label_keys          $correlationId, $method, $statusCode
    Line_format         json
```

### Elasticsearch Output (Analytics)
```ini
[OUTPUT]
    Name                es
    Match               aegisx.*
    Host                elasticsearch
    Port                9200
    Index               aegisx-logs
    Logstash_Format     On
    Logstash_Prefix     aegisx
```

### Seq Output (Alternative)
```ini
[OUTPUT]
    Name                http
    Match               aegisx.*
    Host                seq
    Port                5341
    URI                 /api/events/raw?clef
    Format              json
    Header              Content-Type application/vnd.serilog.clef
```

## Monitoring & Debugging

### Fluent Bit Monitoring
```bash
# Check Fluent Bit status
curl http://localhost:2020

# View metrics
curl http://localhost:2020/api/v1/metrics

# Check storage usage
curl http://localhost:2020/api/v1/storage

# View uptime
curl http://localhost:2020/api/v1/uptime
```

### Health Checks
```bash
# Verify all services
docker-compose -f docker-compose.fluent-bit.yml ps

# Check Fluent Bit logs
docker logs aegisx-fluent-bit

# Test log flow
echo '{"level":"info","message":"test log","service":"aegisx-api"}' >> logs/app.log

# Verify in destinations
curl "http://localhost:3100/loki/api/v1/query?query={service=\"aegisx-api\"}"  # Loki
curl "http://localhost:9200/aegisx-logs-*/_search"                           # Elasticsearch
```

### Performance Tuning

#### High-Volume Scenarios
```ini
# Increase buffer sizes
[INPUT]
    Mem_Buf_Limit     50MB
    storage.type      filesystem

# Batch processing
[OUTPUT]
    Batch_size        102400
    Batch_wait        5

# Rate limiting
[FILTER]
    Name              throttle
    Rate              10000
    Window            60
```

#### Memory Optimization
```ini
[SERVICE]
    storage.path              /var/log/fluent-bit/
    storage.sync              normal
    storage.checksum          off
    storage.max_chunks_up     128
```

## Production Deployment

### Security Configuration
```bash
# Use environment variables for sensitive data
ES_USER=${ES_USER}
ES_PASSWORD=${ES_PASSWORD}
SEQ_API_KEY=${SEQ_API_KEY}

# Enable TLS for outputs
[OUTPUT]
    tls                on
    tls.verify         on
    tls.ca_file        /etc/ssl/certs/ca.crt
```

### Scaling Considerations
```bash
# Multiple Fluent Bit instances
docker-compose -f docker-compose.fluent-bit.yml up -d --scale fluent-bit=3

# Load balancing outputs
[OUTPUT]
    Name               loki
    Host               loki-1,loki-2,loki-3
    Port               3100
```

### Backup and Recovery
```bash
# Backup configurations
tar -czf fluent-bit-config-backup.tar.gz config/ scripts/

# Backup processed logs
tar -czf fluent-bit-data-backup.tar.gz /var/log/fluent-bit/

# Recovery procedure
docker-compose -f docker-compose.fluent-bit.yml down
# Restore configurations
docker-compose -f docker-compose.fluent-bit.yml up -d
```

## Troubleshooting

### Common Issues

**1. Fluent Bit Not Processing Logs:**
```bash
# Check file permissions
ls -la logs/
sudo chmod 644 logs/*.log

# Verify configuration
docker exec aegisx-fluent-bit fluent-bit --config=/fluent-bit/etc/fluent-bit.conf --dry-run

# Check input files
docker exec aegisx-fluent-bit ls -la /var/log/aegisx/
```

**2. Output Destination Issues:**
```bash
# Test Loki connectivity
docker exec aegisx-fluent-bit curl http://loki:3100/ready

# Test Elasticsearch connectivity  
docker exec aegisx-fluent-bit curl http://elasticsearch:9200/_cluster/health

# Verify Seq connectivity
docker exec aegisx-fluent-bit curl http://seq:5341/api/events
```

**3. Lua Script Errors:**
```bash
# Check script syntax
lua scripts/correlation.lua
lua scripts/hipaa_sanitizer.lua

# View script logs
docker logs aegisx-fluent-bit | grep -i lua
```

**4. Performance Issues:**
```bash
# Monitor resource usage
docker stats aegisx-fluent-bit

# Check processing rates
curl http://localhost:2020/api/v1/metrics | grep input_records

# Adjust buffer sizes and batch settings
# Edit config/fluent-bit.conf and restart
```

### Log Level Debugging
```ini
[SERVICE]
    Log_Level    debug    # Enable debug logging

# Check debug output
docker logs aegisx-fluent-bit | grep -i debug
```

## Integration Examples

### Custom Parser for New Log Format
```ini
[PARSER]
    Name        custom_app_log
    Format      regex
    Regex       ^(?<timestamp>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z) \[(?<level>\w+)\] (?<message>.*)$
    Time_Key    timestamp
    Time_Format %Y-%m-%dT%H:%M:%S.%LZ
```

### Custom Filter for Business Logic
```lua
-- custom_filter.lua
function custom_business_filter(tag, timestamp, record)
    local new_record = record
    
    -- Add business-specific metadata
    if record["operation"] == "payment" then
        new_record["business_critical"] = true
        new_record["alert_priority"] = "high"
    end
    
    return 1, timestamp, new_record
end
```

### Alert Integration
```ini
[OUTPUT]
    Name                webhook
    Match               aegisx.*.errors
    Host                alerts.company.com
    Port                443
    URI                 /webhooks/fluent-bit
    Format              json
    Header              Authorization Bearer ${ALERT_TOKEN}
```

This comprehensive Fluent Bit integration provides enterprise-grade log processing with healthcare compliance, advanced correlation tracking, and flexible output routing for the AegisX platform.