# Report Builder System Documentation

## 📋 Overview

Report Builder System เป็นระบบสร้างรายงานแบบ Low-Code ที่ออกแบบมาสำหรับ Healthcare Information Systems (HIS) และ ERP applications พร้อมด้วย HIPAA compliance และ enterprise-grade security

## 🏗️ Architecture

### System Components
- **Backend API**: Fastify-based REST API with TypeScript
- **Database**: PostgreSQL with 8 specialized tables
- **Authentication**: JWT + API Key dual authentication
- **Authorization**: RBAC with permission model `resource:action:scope`
- **Audit System**: Comprehensive audit trails with multiple adapters
- **Caching**: Redis-based caching strategy

### Domain Structure
```
apps/api/src/app/domains/reports/
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── routes/          # Route definitions
├── schemas/         # Validation schemas
└── types/           # TypeScript interfaces
```

## 🗄️ Database Schema

### Core Tables (8 Tables)
1. **report_data_sources** - Data source connections (Database, API, File, Static)
2. **report_templates** - Report templates with versioning
3. **report_parameters** - Template parameters with validation
4. **report_instances** - Generated report instances
5. **report_schedules** - Automated report scheduling
6. **report_exports** - Export history and file tracking
7. **report_shares** - Report sharing and permissions
8. **report_analytics** - Usage tracking and metrics

## 🔌 API Endpoints

### Template Management
```
POST   /api/v1/reports/templates              # Create template
GET    /api/v1/reports/templates              # List templates
GET    /api/v1/reports/templates/:id          # Get template
PUT    /api/v1/reports/templates/:id          # Update template
DELETE /api/v1/reports/templates/:id          # Delete template
POST   /api/v1/reports/templates/:id/duplicate # Duplicate template
GET    /api/v1/reports/templates/search       # Search templates
GET    /api/v1/reports/templates/popular      # Popular templates
GET    /api/v1/reports/templates/:id/parameters # Get parameters
GET    /api/v1/reports/templates/:id/versions # Template versions
```

### Data Source Management
```
POST   /api/v1/reports/data-sources           # Create data source
GET    /api/v1/reports/data-sources           # List data sources
GET    /api/v1/reports/data-sources/:id       # Get data source
PUT    /api/v1/reports/data-sources/:id       # Update data source
DELETE /api/v1/reports/data-sources/:id       # Delete data source
POST   /api/v1/reports/data-sources/:id/test  # Test connection
POST   /api/v1/reports/data-sources/:id/query # Execute query
GET    /api/v1/reports/data-sources/:id/health # Health check
GET    /api/v1/reports/data-sources/:id/schema # Discover schema
```

### Report Generation
```
POST   /api/v1/reports/generate/:templateId   # Generate report (auth)
GET    /api/v1/reports/public/:templateId     # Public report access
GET    /api/v1/reports/slug/:slug             # Generate by slug
GET    /api/v1/reports/instances/:instanceId  # Get report instance
POST   /api/v1/reports/instances/:instanceId/regenerate # Regenerate
POST   /api/v1/reports/schedule               # Schedule generation
POST   /api/v1/reports/batch                  # Batch generation
POST   /api/v1/reports/preview/:templateId    # Preview report
POST   /api/v1/reports/validate/:templateId   # Validate parameters
GET    /api/v1/reports/status/:correlationId  # Generation status
```

### WebSocket Endpoints
```
WS     /api/v1/reports/progress/:reportId     # Real-time report generation progress
WS     /api/v1/reports/stream/:templateId     # Live data streaming for real-time reports
WS     /api/v1/reports/notifications          # System notifications and alerts
WS     /ws                                    # General WebSocket endpoint
WS     /ws/health                            # WebSocket health check
```

## 🔧 Core Features

### 1. **Template Management**
- ✅ Create, read, update, delete report templates
- ✅ Template versioning system
- ✅ Template duplication
- ✅ Search and filtering
- ✅ Parameter management with validation rules

### 2. **Data Source Integration**
- ✅ **Database Connections**: PostgreSQL, MySQL, MongoDB
- ✅ **REST API Integration**: External API calls with authentication
- ✅ **File Data Sources**: CSV, JSON, Excel files
- ✅ **Static Data**: Embedded data within templates
- ✅ Connection health monitoring
- ✅ Query execution and schema discovery

### 3. **Report Generation**
- ✅ **URL-based Generation**: `GET /reports/public/:templateId?param1=value1`
- ✅ **Parameter Filtering**: Dynamic parameter validation
- ✅ **Multiple Formats**: HTML, PDF, Excel, CSV, JSON
- ✅ **Template Types**: Table, Chart, Dashboard, Document
- ✅ **Caching Strategy**: Redis-based performance optimization

### 4. **Security & Compliance**
- ✅ **Authentication**: JWT + API Key support
- ✅ **Authorization**: RBAC with granular permissions
- ✅ **Data Classification**: Public, Internal, Confidential, Restricted
- ✅ **Audit Trails**: Complete operation logging
- ✅ **HIPAA Compliance**: Healthcare data protection
- ✅ **Access Control**: Template and data source level permissions

### 5. **Advanced Features**
- ✅ **Background Processing**: Async report generation
- ✅ **Scheduling**: Automated report generation with cron
- ✅ **Batch Generation**: Multiple reports at once
- ✅ **Report Sharing**: Public links and user sharing
- ✅ **Analytics**: Usage tracking and performance metrics
- ✅ **Export Management**: File storage integration

### 6. **Real-time Features** 🆕
- ✅ **WebSocket Support**: Real-time communication for live updates
- ✅ **Progress Tracking**: Live report generation progress updates
- ✅ **Live Data Streaming**: Real-time data updates for dynamic reports
- ✅ **System Notifications**: Real-time alerts and maintenance notices
- ✅ **Connection Management**: Automatic cleanup and health monitoring
- ✅ **Channel Subscriptions**: Topic-based message routing

## 🚀 Getting Started

### 1. **Database Setup**
```bash
# Run migrations to create report tables
npm run db:dev:migrate
```

### 2. **Start Server**
```bash
# Development
npx nx serve api

# Production
node apps/api/dist/main.js
```

### 3. **Access API**
- **Server**: http://localhost:3000
- **Documentation**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health

## 📊 Usage Examples

### Create a Data Source
```bash
POST /api/v1/reports/data-sources
{
  "name": "Sales Database",
  "type": "database",
  "connectionConfig": {
    "host": "localhost",
    "database": "sales",
    "username": "user",
    "password": "pass"
  },
  "dataClassification": "internal"
}
```

### Create a Report Template
```bash
POST /api/v1/reports/templates
{
  "name": "Monthly Sales Report",
  "type": "table",
  "format": "html",
  "templateConfig": {
    "columns": [
      {"name": "product", "label": "Product"},
      {"name": "sales", "label": "Sales Amount"}
    ]
  },
  "dataSourceId": "uuid-of-data-source",
  "queryTemplate": "SELECT product, SUM(amount) as sales FROM sales WHERE date >= {{startDate}} GROUP BY product"
}
```

### Generate a Report
```bash
# Authenticated generation
POST /api/v1/reports/generate/template-uuid
{
  "parameters": {
    "startDate": "2024-01-01"
  },
  "format": "html"
}

# Public access with URL parameters
GET /api/v1/reports/public/template-uuid?startDate=2024-01-01&format=pdf
```

### WebSocket Usage Examples

#### Real-time Report Progress
```javascript
// Connect to report progress WebSocket
const ws = new WebSocket('ws://localhost:3000/api/v1/reports/progress/report-uuid');

ws.onopen = () => {
  console.log('Connected to report progress updates');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'report_status':
      console.log(`Report progress: ${data.data.progress}%`);
      console.log(`Status: ${data.data.status}`);
      break;
    case 'report_completed':
      console.log('Report generation completed!');
      break;
    case 'error':
      console.error('Report generation error:', data.message);
      break;
  }
};

// Request manual status update
ws.send(JSON.stringify({
  type: 'request_update'
}));

// Cancel report generation
ws.send(JSON.stringify({
  type: 'cancel_report'
}));
```

#### Live Data Streaming
```javascript
// Connect to live data stream for a template
const streamWs = new WebSocket('ws://localhost:3000/api/v1/reports/stream/template-uuid');

streamWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'initial_data':
      console.log('Initial data:', data.data);
      break;
    case 'data_update':
      console.log('Live data update:', data.data);
      break;
  }
};

// Set update interval
streamWs.send(JSON.stringify({
  type: 'update_interval',
  interval: 5000 // 5 seconds
}));

// Apply real-time filter
streamWs.send(JSON.stringify({
  type: 'apply_filter',
  filter: { status: 'active' }
}));
```

#### System Notifications
```javascript
// Connect to general report notifications
const notifyWs = new WebSocket('ws://localhost:3000/api/v1/reports/notifications');

notifyWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'system_alert':
      console.log('System alert:', data.message);
      break;
    case 'maintenance_notice':
      console.log('Maintenance notice:', data.message);
      break;
  }
};
```

## 🔐 Permission Model

### RBAC Permissions
```
reports:create:template    # Create report templates
reports:read:template      # View report templates
reports:update:template    # Edit report templates
reports:delete:template    # Delete report templates
reports:generate:own       # Generate own reports
reports:generate:any       # Generate any reports
reports:schedule:own       # Schedule own reports
reports:monitor:system     # Monitor system metrics
```

## 📈 Performance Features

### Caching Strategy
- **Template Caching**: Redis-based template storage
- **Query Result Caching**: Configurable TTL per template
- **Generated Report Caching**: Instance-based caching
- **Connection Pooling**: Optimized database connections

### Background Processing
- **Async Generation**: Large reports processed in background
- **Queue Management**: Job scheduling and monitoring
- **Batch Processing**: Multiple reports generation
- **Resource Management**: Memory and CPU optimization

## 🔮 Future Roadmap

### Phase 1: Core Enhancement
- [x] **Real-time Data Sources**: WebSocket support implemented
- [ ] **Advanced Visualizations**: Chart.js and D3.js integration
- [ ] **Template Builder UI**: Drag-and-drop interface
- [ ] **Data Transformation**: ETL capabilities

### Phase 2: Enterprise Features
- [ ] **Multi-tenant Support**: Organization isolation
- [ ] **Advanced Scheduling**: Complex scheduling rules
- [ ] **Report Distribution**: Email and notification delivery
- [ ] **Custom Plugins**: Extensible architecture

### Phase 3: Analytics & AI
- [ ] **Smart Insights**: Automated data analysis
- [ ] **Predictive Analytics**: ML-powered forecasting
- [ ] **Report Optimization**: Performance recommendations
- [ ] **Natural Language Queries**: AI-powered query building

## 📞 Technical Support

### Development Commands
```bash
# Build API
npx nx build api

# Run tests
npx nx test api

# Database operations
npm run db:dev:migrate    # Run migrations
npm run db:dev:seed       # Seed data
npm run db:dev:reset      # Reset database
```

### Monitoring & Debugging
- **Structured Logging**: Winston with correlation IDs
- **Health Checks**: Comprehensive system monitoring
- **Error Tracking**: Centralized error management
- **Performance Metrics**: Custom business metrics

---

**Report Builder System** - Enterprise-grade reporting solution for Healthcare and ERP applications 🏥📊