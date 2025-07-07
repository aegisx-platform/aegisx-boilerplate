# 🚀 Logging Quick Reference - AegisX Platform

## 📋 Quick Commands

### Start Logging Selector
```bash
./scripts/logging-selector.sh
```

### Manual Commands
```bash
# Seq (Development)
docker-compose -f docker-compose.seq.yml up -d

# Grafana + Loki (Simple Production) 
docker-compose -f docker-compose.loki.yml up -d

# Fluent Bit + Loki (HIPAA)
docker-compose -f docker-compose.fluent-bit.yml up -d

# Fluent Bit + Elasticsearch (Analytics)
docker-compose -f docker-compose.fluent-bit.yml --profile elasticsearch up -d

# Graylog (Enterprise)
docker-compose -f docker-compose.graylog.yml up -d

# Graylog + Fluent Bit (Enterprise + HIPAA) ⭐
docker-compose -f docker-compose.graylog.yml --profile fluent-bit up -d

# Stop All
docker-compose -f docker-compose.seq.yml down
docker-compose -f docker-compose.loki.yml down  
docker-compose -f docker-compose.fluent-bit.yml down
docker-compose -f docker-compose.graylog.yml down
```

## 🌐 Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Seq** | http://localhost:5341 | No auth (dev) |
| **Grafana** | http://localhost:3001 | admin/admin123 |
| **Loki API** | http://localhost:3100 | API endpoint |
| **Fluent Bit** | http://localhost:2020 | Monitoring |
| **Graylog** | http://localhost:9000 | admin/admin |
| **Elasticsearch** | http://localhost:9200 | API endpoint |
| **Kibana** | http://localhost:5601 | Web interface |
| **Graylog ES** | http://localhost:9201 | API endpoint |

## 📊 Resource Requirements

| Solution | RAM | CPU | Startup | Best For |
|----------|-----|-----|---------|----------|
| **Seq** | ~100MB | Low | 10s | Development |
| **Grafana + Loki** | ~300MB | Medium | 30s | Small Production |
| **Fluent Bit + Loki** | ~350MB | Medium | 45s | Healthcare |
| **Fluent Bit + ES** | ~1GB+ | High | 2-3min | Analytics |
| **Graylog** | ~800MB | Medium | 2-3min | Enterprise |
| **Graylog + Fluent Bit** | ~900MB | Medium-High | 3-4min | Enterprise Healthcare |

## 🏥 HIPAA Compliance

### Ready-to-Use Options
- ✅ **Option 3:** Fluent Bit + Loki
- ✅ **Option 6:** Graylog + Fluent Bit ⭐ **Recommended**

### Sanitization Examples
```json
// Before
{"ssn": "123-45-6789", "phone": "555-123-4567", "email": "john@example.com"}

// After
{"ssn": "***-**-****", "phone": "(***) ***-****", "email": "***@***.***"}
```

## 🚨 Quick Troubleshooting

### Common Issues
```bash
# Permission denied
chmod +x scripts/logging-selector.sh

# Docker not running
sudo systemctl start docker  # Linux
# Or start Docker Desktop

# Port conflicts
sudo lsof -i :9000  # Check what's using port
docker ps  # Check running containers

# Out of space
docker system prune -f
docker volume prune -f

# Memory issues
free -h  # Check available memory
docker stats  # Check container usage
```

### Health Checks
```bash
# Check running services
docker ps | grep -E "(seq|loki|grafana|fluent-bit|graylog)"

# Test endpoints
curl http://localhost:5341      # Seq
curl http://localhost:3100/ready # Loki
curl http://localhost:2020      # Fluent Bit
curl http://localhost:9000      # Graylog

# Check logs
docker logs aegisx-seq
docker logs aegisx-loki
docker logs aegisx-fluent-bit
docker logs aegisx-graylog
```

## 📈 Recommendations

### By Use Case
| Use Case | Choose | Reason |
|----------|--------|--------|
| **Development** | Option 1 (Seq) | Easy setup, SQL queries |
| **Small Production** | Option 2 (Grafana + Loki) | Good balance |
| **Healthcare** | Option 6 (Graylog + Fluent Bit) | HIPAA + enterprise |
| **Analytics** | Option 4 (Fluent Bit + ES) | Advanced analytics |
| **Enterprise** | Option 5 (Graylog) | Centralized management |

### By Team Background
| Team | Choose | Why |
|------|--------|-----|
| **SQL-familiar** | Seq | SQL querying interface |
| **Ops Teams** | Graylog | Enterprise features |
| **DevOps** | Grafana + Loki | Cloud-native |
| **Healthcare** | Graylog + Fluent Bit | Compliance ready |

## 🔗 Documentation Links

- 📖 [Detailed Usage Guide](./logging-selector-usage.md)
- 🎯 [Selector Overview](./logging-selector-guide.md)
- 🔍 [Graylog Setup](./graylog-setup.md)
- 🚀 [Fluent Bit Guide](./fluent-bit-setup.md)
- 🏭 [Production Guide](./production-deployment-guide.md)

## 💡 Pro Tips

1. **Start Simple:** Begin with Seq for development
2. **Test Early:** Try HIPAA features before production
3. **Monitor Resources:** Check RAM/CPU usage
4. **Use Selector:** Always use `./scripts/logging-selector.sh` to avoid conflicts
5. **Check Status:** Use option 7 to see what's running
6. **Clean Shutdown:** Use option 8 to stop all before switching