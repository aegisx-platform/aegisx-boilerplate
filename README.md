# 🏥 AegisX Boilerplate

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Production-ready Fastify API boilerplate for Healthcare Information Systems (HIS) and ERP applications**

[🚀 Quick Start](#-quick-start) • [📚 Documentation](#-documentation) • [🏗️ Architecture](#️-architecture) • [🏥 Healthcare](#-healthcare-features)

</div>

---

## 🌟 What is AegisX Boilerplate?

AegisX Boilerplate is an **enterprise-grade Fastify API framework** specifically designed for **Healthcare Information Systems** and **ERP applications**. Built with **production readiness**, **HIPAA compliance**, and **scalability** in mind.

### 🎯 **Perfect for:**
- 🏥 **Healthcare Management Systems** - Patient records, appointments, medical data
- 🏢 **Enterprise Resource Planning** - Business operations, inventory, finance
- 🔒 **Compliance-Critical Applications** - HIPAA, SOX, regulatory requirements
- ⚡ **High-Performance APIs** - Banking, fintech, real-time systems

---

## ✨ Key Features

### 🚀 **Performance & Scale**
- ⚡ **Fastify Framework** - 3x faster than Express.js (65,000+ req/sec)
- 🏗️ **4-Layer Architecture** - Core, Domains, Features, Infrastructure
- 📦 **Nx Monorepo** - Scalable development workflow
- 🔄 **Event-Driven Architecture** - Loose coupling with event bus

### 🔒 **Security & Compliance**
- 🔐 **JWT + RBAC** - Role-based access control (`resource:action:scope`)
- 🛡️ **Multi-Layer Security** - Helmet, rate limiting, input sanitization
- 📋 **Comprehensive Audit System** - HIPAA-compliant audit trails
- 🔍 **Cryptographic Integrity** - Tamper-proof audit logs

### 🏥 **Healthcare Ready**
- 📊 **HIPAA Compliance** - Built-in audit trails and data protection
- 👥 **Healthcare RBAC** - Doctor, nurse, admin, patient roles
- 📝 **Medical Data Models** - Patient, appointment, prescription schemas
- 🔗 **HL7 FHIR Ready** - Healthcare interoperability standards

### 📈 **Production Features**
- 📝 **Structured Logging** - Winston + correlation ID tracking
- 📊 **APM Integration** - OpenTelemetry + performance monitoring
- 🗄️ **Multi-Adapter Support** - Database, Redis, RabbitMQ options
- 🐳 **Docker Ready** - Complete containerization setup

---

## 🚀 Quick Start

### **Option 1: 5-Minute Setup**

```bash
# 1. Clone and setup
git clone https://github.com/your-org/aegisx-boilerplate.git
cd aegisx-boilerplate
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start infrastructure
npm run db:setup

# 4. Setup database
npm run db:migrate
npm run db:seed

# 5. Start development server
npx nx serve api
```

### **Option 2: Docker Setup**

```bash
# Start all services (API + Database + Redis + RabbitMQ)
docker-compose up -d

# Setup database
npm run db:migrate
npm run db:seed
```

### **🌐 Access Points**
- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs
- **Database Admin**: http://localhost:8080 (pgAdmin)
- **Log Monitoring**: http://localhost:5341 (optional Seq)

---

## 🏗️ Architecture

### **4-Layer Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                        🔧 CORE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Security │ Logging │ Database │ Events │ Monitoring │ Docs    │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      🏢 DOMAINS LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│   Authentication │ RBAC │ User Management │ Audit Logs         │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      🏥 FEATURES LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│ Patients │ Appointments │ Medical Records │ Billing │ Reports   │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                   🗄️ INFRASTRUCTURE LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL │ Redis │ RabbitMQ │ File Storage │ External APIs  │
└─────────────────────────────────────────────────────────────────┘
```

### **Technology Stack**
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Fastify 5.2.1 (high-performance)
- **Database**: PostgreSQL 16 + Knex.js migrations
- **Caching**: Redis 7 with connection pooling
- **Message Queue**: RabbitMQ 3.13 for enterprise messaging
- **Monitoring**: Winston + OpenTelemetry + health checks

---

## 🔒 Security Features

### **Multi-Layer Security**
```
🌐 Network Layer     → Firewall, DDoS protection
🛡️ Application Layer → Rate limiting, CORS, Helmet
🔐 Authentication    → JWT tokens + refresh tokens
👥 Authorization     → RBAC with fine-grained permissions
🗄️ Data Layer        → Encryption, audit trails, sanitization
```

### **RBAC Permission Model**
```typescript
// Permission format: resource:action:scope
"patients:read:own"          // Read own patients
"patients:read:department"   // Read department patients  
"patients:write:all"         // Write all patients
"reports:generate:hospital"  // Generate hospital reports
"users:manage:department"    // Manage department users
```

---

## 🏥 Healthcare Features

### **✅ Implemented (Ready to Use)**
- 🔐 **Authentication System** - Login, registration, JWT tokens
- 👥 **RBAC System** - Healthcare roles (doctor, nurse, admin, patient)
- 📋 **Audit System** - HIPAA-compliant audit trails with integrity checking
- 📝 **Structured Logging** - Correlation ID tracking for compliance
- 🚌 **Event Bus** - Event-driven architecture for loose coupling

### **🚧 Structured (Ready for Development)**
- 👩‍⚕️ **Patient Management** - Patient profiles, medical history
- 📅 **Appointment Scheduling** - Calendar integration, notifications
- 📋 **Medical Records** - Clinical notes, lab results, prescriptions
- 💰 **Billing System** - Insurance claims, payment processing
- 📊 **Healthcare Reports** - Analytics, compliance reports
- 💊 **Prescription Management** - Drug interactions, dosage tracking

### **HIPAA Compliance Features**
- 📝 **Complete Audit Trails** - Every data access logged with who, what, when, where
- 🔒 **Data Encryption** - At rest and in transit
- 👤 **User Attribution** - All actions tied to specific users
- ⏰ **Precise Timestamping** - Audit trail integrity
- 🔍 **Integrity Verification** - Cryptographic audit log verification

---

## 📚 Documentation

### **📖 Complete Documentation Hub**
🎯 **[📚 Documentation Index](./docs/readme.md)** - **START HERE** - Complete navigation to all guides

### **🚀 Essential Guides**
| Guide | Description | Quick Link |
|-------|-------------|------------|
| **🏗️ Architecture** | 4-layer system design | [View Guide](./docs/architecture_overview.md) |
| **📂 Project Structure** | Folder organization | [View Guide](./docs/folder_structure_guide.md) |
| **📋 Feature Overview** | Complete feature summary | [View Guide](./docs/feature-summary.md) |
| **🔐 Authentication** | JWT + API key system | [View Guide](./docs/core/api-key-authentication.md) |

### **🔧 Core Systems**
| System | Description | Quick Link |
|--------|-------------|------------|
| **📝 Logging** | Structured logging & monitoring | [View Guide](./docs/monitoring/logging-system.md) |
| **📊 Audit System** | HIPAA-compliant audit trails | [View Guide](./docs/core/audit-logging.md) |
| **👥 RBAC** | Role-based access control | [View Guide](./docs/core/rbac-system.md) |
| **🗄️ Database** | PostgreSQL integration | [View Guide](./docs/core/database.md) |

### **🏥 Healthcare Features**
| Feature | Description | Quick Link |
|---------|-------------|------------|
| **📁 Storage** | File management & sharing | [View Guide](./docs/features/storage-service.md) |
| **🎨 Image Processing** | Medical image manipulation | [View Guide](./docs/features/image-processing-service.md) |
| **📊 Report Builder** | Low-code analytics | [View Guide](./docs/features/report-builder.md) |
| **🌐 WebSocket** | Real-time communication | [View Guide](./docs/features/websocket-service.md) |

### **🚀 Development & Deployment**
| Topic | Description | Quick Link |
|-------|-------------|------------|
| **🗺️ Roadmap** | Development priorities | [View Guide](./docs/core_development_roadmap.md) |
| **🐳 Docker** | Container orchestration | [View Guide](./docs/core/docker.md) |
| **⚙️ Environment** | Configuration reference | [View File](./.env.example) |
| **🚀 Production** | Deployment guide | [View Guide](./docs/setup/production-deployment-guide.md) |

---

## 🛠️ Development

### **Common Commands**

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Production build
npm run test                   # Run test suite
npm run lint                   # Code quality check

# Database
npm run db:migrate             # Run database migrations
npm run db:seed               # Seed test data
npm run db:reset              # Reset database completely
npm run db:status             # Check migration status

# Docker
npm run docker:up             # Start all services
npm run docker:down           # Stop all services
npm run docker:logs           # View container logs
```

### **Development Workflow**

1. **Setup Environment**
   ```bash
   cp .env.example .env
   # Configure database and service settings
   ```

2. **Start Infrastructure**
   ```bash
   npm run db:setup              # PostgreSQL
   # OR
   docker-compose up -d          # Full stack
   ```

3. **Initialize Database**
   ```bash
   npm run db:migrate            # Schema
   npm run db:seed               # Test data
   ```

4. **Start Development**
   ```bash
   npx nx serve api              # API server
   # Visit http://localhost:3000/docs for Swagger UI
   ```

---

## 📊 Project Status

### **🟢 Production Ready**
- ✅ Core infrastructure (authentication, security, logging)
- ✅ Database schema and migrations
- ✅ RBAC system with healthcare roles
- ✅ Comprehensive audit system
- ✅ API documentation (Swagger/OpenAPI 3.0)
- ✅ Docker containerization
- ✅ Testing infrastructure

### **🟡 In Development**
- 🚧 Healthcare-specific features (patient management, appointments)
- 🚧 Advanced monitoring dashboards
- 🚧 Mobile app backend APIs
- 🚧 HL7 FHIR integration

### **🔵 Planned Features**
- 🔮 Telemedicine support
- 🔮 Advanced analytics and reporting
- 🔮 Machine learning integration
- 🔮 Multi-tenant architecture

---

## 🎯 Use Cases

### **🏥 Healthcare Systems**
```typescript
// Patient record access with HIPAA audit
request.server.structuredLogger.audit('patient.access', {
  userId: 'doc-123',
  patientId: 'patient-456',
  operation: 'view_medical_record',
  department: 'cardiology'
})
```

### **🏢 Enterprise Applications**
```typescript
// Business operation with correlation tracking
request.server.structuredLogger.business('order.created', {
  correlationId: request.correlationId,
  orderId: 'order-789',
  customerId: 'customer-123',
  amount: 1500.00
})
```

### **📊 Compliance Reporting**
```typescript
// Generate compliance reports
const auditReport = await auditService.generateComplianceReport({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  complianceStandard: 'HIPAA'
})
```

---

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with tests
4. Commit: `git commit -m "feat: add amazing feature"`
5. Push: `git push origin feature/amazing-feature`
6. Open Pull Request

### **Code Standards**
- ✅ TypeScript strict mode
- ✅ ESLint + Prettier formatting
- ✅ 80%+ test coverage
- ✅ Comprehensive documentation
- ✅ Security-first development

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### **Built With**
- [Fastify](https://www.fastify.io/) - High-performance web framework
- [Nx](https://nx.dev/) - Extensible dev tools for monorepos
- [PostgreSQL](https://www.postgresql.org/) - Advanced open source database
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

### **Inspired By**
- Healthcare industry requirements for HIPAA compliance
- Enterprise software development best practices
- Modern API development patterns

---

## 📞 Support

### **Documentation**
- 📖 [Complete Documentation](./docs/) - All guides and references
- 🏗️ [Architecture Guide](./docs/ARCHITECTURE_OVERVIEW.md) - System design
- 💡 [Usage Examples](./docs/HOW_TO_USE_LOGGING.md) - Practical examples

### **Community**
- 💬 [Discussions](https://github.com/your-org/aegisx-boilerplate/discussions) - Q&A and ideas
- 🐛 [Issues](https://github.com/your-org/aegisx-boilerplate/issues) - Bug reports
- 📧 [Email](mailto:support@aegisx.com) - Direct support

---

<div align="center">

**🏥 Built for Healthcare • 🔒 Security First • ⚡ Production Ready**

[⭐ Star this repo](https://github.com/your-org/aegisx-boilerplate) if it helps your project!

</div>