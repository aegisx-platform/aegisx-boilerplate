# 🪶 ทางเลือกที่เบากว่า ELK Stack สำหรับ Log Monitoring

## 📋 เปรียบเทียบ Solutions

| **Solution** | **ขนาด** | **ความง่าย** | **ราคา** | **เหมาะกับ** |
|--------------|-----------|-------------|----------|-------------|
| **ELK Stack** | 🔴 หนักมาก (4GB+ RAM) | 🔴 ซับซ้อน | 🔴 แพง | Enterprise ขนาดใหญ่ |
| **Grafana + Loki** | 🟡 ปานกลาง (1GB RAM) | 🟡 ปานกลาง | 🟢 ฟรี | Production scale |
| **Seq** | 🟢 เบา (500MB RAM) | 🟢 ง่าย | 🟡 ฟรี+Pro | .NET developers |
| **Graylog** | 🟡 ปานกลาง (2GB RAM) | 🟡 ปานกลาง | 🟢 ฟรี | Medium teams |
| **Fluent Bit + File** | 🟢 เบามาก (50MB) | 🟢 ง่าย | 🟢 ฟรี | Small teams |
| **Simple File + grep** | 🟢 เบาที่สุด | 🟢 ง่ายที่สุด | 🟢 ฟรี | Development |

---

## 🌟 แนะนำ: ทางเลือกที่เบาและง่าย

### **1. 🥇 Grafana Loki (แนะนำที่สุด)**

**ทำไมดี:**
- 🪶 เบากว่า ELK มาก (ใช้ RAM แค่ ~1GB)
- 🔍 Search ได้เร็ว เป็น indexes แค่ labels
- 📊 UI สวย เหมือน Grafana
- 🆓 ฟรีทั้งหมด

**Setup:**

```yaml
# docker-compose.loki.yml
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - loki_data:/tmp/loki

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"  # ไม่ชนกับ API port 3000
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - grafana_data:/var/lib/grafana

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./logs:/var/log/aegisx:ro
      - ./promtail-config.yml:/etc/promtail/config.yml:ro
    command: -config.file=/etc/promtail/config.yml

volumes:
  loki_data:
  grafana_data:
```

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: aegisx-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: aegisx-api
          __path__: /var/log/aegisx/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            correlationId: correlationId
            userId: userId
            operation: operation
      - labels:
          level:
          correlationId:
          userId:
          operation:
```

**การใช้งาน:**
```bash
# 1. Start Loki stack
docker-compose -f docker-compose.loki.yml up -d

# 2. เปิด file logging
LOG_FILE_ENABLED=true

# 3. เข้า Grafana: http://localhost:3001 (admin/admin123)
# 4. Add Loki datasource: http://loki:3100
# 5. Query logs: {job="aegisx-api"} |= "patient"
```

---

### **2. 🥈 Seq (เบาและง่ายมาก)**

**ทำไมดี:**
- 🪶 เบามาก (ใช้ RAM แค่ ~500MB)
- 🎯 ออกแบบมาสำหรับ structured logs
- 🔍 Search ดีมาก แบบ SQL-like
- 🎨 UI สวยและใช้ง่าย

**Setup:**

```yaml
# docker-compose.seq.yml
version: '3.8'
services:
  seq:
    image: datalust/seq:latest
    ports:
      - "5341:80"      # Seq UI
      - "5342:5342"    # Seq ingestion
    environment:
      - ACCEPT_EULA=Y
      - SEQ_FIRSTRUN_ADMINUSERNAME=admin
      - SEQ_FIRSTRUN_ADMINPASSWORD=admin123
    volumes:
      - seq_data:/data

volumes:
  seq_data:
```

**ส่ง logs ไป Seq:**

```bash
# ติดตั้ง seq transport สำหรับ Winston
npm install winston-seq
```

```typescript
// เพิ่มใน structured-logger.ts
import SeqTransport from 'winston-seq'

const transports: winston.transport[] = []

// เพิ่ม Seq transport
if (this.options.enableSeq) {
  transports.push(new SeqTransport({
    serverUrl: 'http://localhost:5342',
    apiKey: process.env.SEQ_API_KEY,
    onError: (e) => console.error('[SEQ]', e)
  }))
}
```

**Environment:**
```bash
# เพิ่มใน .env
SEQ_ENABLED=true
SEQ_URL=http://localhost:5342
```

**การใช้งาน:**
```bash
# 1. Start Seq
docker-compose -f docker-compose.seq.yml up -d

# 2. เข้า Seq UI: http://localhost:5341
# 3. Search: correlationId = "abc-123" and operation = "patient.view"
```

---

### **3. 🥉 Simple File-based (เบาที่สุด)**

**ทำไมดี:**
- 🪶 เบาที่สุด ไม่ต้องใช้ resources เพิ่ม
- 🔧 ใช้ tools ที่มีอยู่แล้ว (grep, jq, tail)
- 💰 ฟรี 100%
- 🚀 Setup ง่ายมาก

**Setup:**

```bash
# 1. เปิด file logging
LOG_FILE_ENABLED=true

# 2. ใช้ commands เหล่านี้ดู logs
```

**Commands สำหรับ analysis:**

```bash
# ดู logs real-time
tail -f logs/app.log | jq .

# หา errors
grep -i "error" logs/app.log | jq .

# หา correlation ID เฉพาะ
grep "abc-123-def" logs/app.log | jq .

# หาข้อมูลผู้ป่วยที่ถูกเข้าถึง
jq 'select(.operation == "patient.view")' logs/app.log

# Count operations by type
jq -r '.operation' logs/app.log | sort | uniq -c

# หา slow requests (> 1000ms)
jq 'select(.duration > 1000)' logs/app.log

# หา failed requests
jq 'select(.statusCode >= 400)' logs/app.log

# Group by user
jq -r '.userId' logs/app.log | sort | uniq -c

# ดู audit logs ของ patient เฉพาะ
jq 'select(.patientId == "patient-123")' logs/app.log
```

**สร้าง Scripts สำหรับ analysis:**

```bash
#!/bin/bash
# log-analyzer.sh

echo "=== AegisX Log Analysis ==="

echo "📊 Top Operations:"
jq -r '.operation // "unknown"' logs/app.log | sort | uniq -c | sort -nr | head -10

echo -e "\n🚨 Recent Errors (last 10):"
grep -i "error" logs/app.log | tail -10 | jq -r '"\(.timestamp) [\(.level)] \(.message)"'

echo -e "\n👤 Top Users:"
jq -r '.userId // "anonymous"' logs/app.log | sort | uniq -c | sort -nr | head -5

echo -e "\n⏱️ Slow Requests (>2s):"
jq 'select(.duration > 2000) | "\(.timestamp) \(.operation) \(.duration)ms"' logs/app.log | tail -5

echo -e "\n🏥 Patient Access Today:"
today=$(date '+%Y-%m-%d')
jq -r "select(.message | contains(\"AUDIT\")) | select(.timestamp | startswith(\"$today\")) | \"\(.userId) accessed \(.patientId // \"unknown\")\"" logs/app.log | tail -10
```

**Dashboard ง่ายๆ ด้วย HTML:**

```html
<!-- simple-dashboard.html -->
<!DOCTYPE html>
<html>
<head>
    <title>AegisX Logs Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <h1>📊 AegisX Simple Dashboard</h1>
    
    <div>
        <h2>Recent Activity</h2>
        <textarea id="logs" rows="20" cols="100"></textarea>
        <button onclick="refreshLogs()">🔄 Refresh</button>
    </div>

    <script>
        async function refreshLogs() {
            // ดึงข้อมูลจาก logs/app.log via simple API
            const response = await fetch('/api/v1/admin/logs/recent')
            const logs = await response.json()
            document.getElementById('logs').value = 
                logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`).join('\n')
        }
        
        // Auto refresh ทุก 30 วินาที
        setInterval(refreshLogs, 30000)
        refreshLogs()
    </script>
</body>
</html>
```

---

### **4. 🔧 Fluent Bit (สำหรับ Advanced แต่เบา)**

**ทำไมดี:**
- 🪶 เบามาก (ใช้ RAM แค่ ~50MB)
- ⚡ เร็วมาก written ด้วย C
- 🔌 Plugin เยอะ (ส่งไปได้หลายที่)
- 🎯 ออกแบบมาสำหรับ containers

**Setup:**

```yaml
# docker-compose.fluentbit.yml
version: '3.8'
services:
  fluent-bit:
    image: fluent/fluent-bit:latest
    volumes:
      - ./logs:/var/log/aegisx:ro
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf:ro
    ports:
      - "2020:2020"

  # ส่งไป multiple destinations
  # - File
  # - HTTP endpoint  
  # - Cloud services
```

```ini
# fluent-bit.conf
[SERVICE]
    Flush         5
    Daemon        off
    Log_Level     info
    HTTP_Server   On
    HTTP_Listen   0.0.0.0
    HTTP_Port     2020

[INPUT]
    Name              tail
    Path              /var/log/aegisx/*.log
    Parser            json
    Tag               aegisx.*

[OUTPUT]
    Name              file
    Match             *
    Path              /tmp/
    File              processed-logs.json

[OUTPUT]
    Name              http
    Match             *
    Host              your-log-server.com
    Port              443
    URI               /logs
    tls               On
```

---

## 🎯 แนะนำการเลือก

### **สำหรับ Development:**
```bash
# Simple file + grep/jq
LOG_FILE_ENABLED=true
tail -f logs/app.log | jq .
```

### **สำหรับ Small Team:**
```bash
# Seq - ง่ายมาก
docker-compose -f docker-compose.seq.yml up -d
```

### **สำหรับ Production:**
```bash
# Grafana + Loki - balance ระหว่างความสามารถและ resource
docker-compose -f docker-compose.loki.yml up -d
```

### **สำหรับ Enterprise:**
```bash
# Cloud Solutions
# - AWS CloudWatch
# - Google Cloud Logging  
# - Azure Monitor
```

---

## 🚀 Quick Start (แนะนำ: Seq)

```bash
# 1. Start Seq
curl -o docker-compose.seq.yml https://raw.githubusercontent.com/your-repo/docker-compose.seq.yml
docker-compose -f docker-compose.seq.yml up -d

# 2. เพิ่ม Seq transport
npm install winston-seq

# 3. Update .env
echo "SEQ_ENABLED=true" >> .env
echo "LOG_FILE_ENABLED=true" >> .env

# 4. Start API
npx nx serve api

# 5. เข้า Seq UI: http://localhost:5341
# 6. ทดสอบ: curl http://localhost:3000/health
# 7. ดู logs ใน Seq UI!
```

**เบา เร็ว ง่าย และฟรี! 🎉**