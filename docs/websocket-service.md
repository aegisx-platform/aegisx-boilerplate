# WebSocket Service Documentation

## 📋 Overview

WebSocket Service เป็นระบบ real-time communication ที่ออกแบบมาสำหรับ AegisX Boilerplate โดยให้บริการการติดต่อสื่อสารแบบ real-time สำหรับ Healthcare Information Systems (HIS) และ ERP applications พร้อมด้วย enterprise-grade features

## 🏗️ Architecture

### System Components
- **WebSocket Plugin**: Core real-time communication infrastructure
- **Connection Management**: Automatic connection tracking and cleanup
- **Channel Subscriptions**: Topic-based message routing system
- **Health Monitoring**: Connection health checks and status monitoring
- **Error Handling**: Comprehensive error tracking and logging

### Integration Points
```typescript
// Access WebSocket manager through Fastify instance
fastify.websocketManager.broadcast('channel-name', message);
fastify.websocketManager.sendToUser('userId', message);
fastify.websocketManager.subscribeToChannel('connectionId', 'channel');
```

## 🔌 Core Plugin

### File Location
```
apps/api/src/app/core/plugins/websocket.ts
```

### Plugin Features
- **Connection Registry**: Tracks all active WebSocket connections
- **Channel Management**: Topic-based message subscriptions
- **Automatic Cleanup**: Removes inactive connections (5-minute timeout)
- **Health Checks**: Built-in health monitoring endpoints
- **Message Broadcasting**: Send messages to channels or specific users

### FastifyInstance Decorators
```typescript
interface FastifyInstance {
  websocketManager: {
    broadcast: (channel: string, message: any, excludeConnection?: string) => void;
    sendToUser: (userId: string, message: any) => void;
    sendToConnection: (connectionId: string, message: any) => void;
    subscribeToChannel: (connectionId: string, channel: string) => void;
    unsubscribeFromChannel: (connectionId: string, channel: string) => void;
    getConnectionsByChannel: (channel: string) => WebSocketConnection[];
    getConnectionsByUser: (userId: string) => WebSocketConnection[];
    getActiveConnections: () => number;
    cleanupInactiveConnections: () => void;
  };
}
```

## 🌐 WebSocket Endpoints

### General Endpoints

#### Main WebSocket Connection
```
WS /ws
```
**Purpose**: General-purpose WebSocket endpoint for basic real-time communication

**Messages Supported**:
- `subscribe`: Subscribe to a channel
- `unsubscribe`: Unsubscribe from a channel  
- `ping`: Health check ping
- `get_status`: Get connection status

**Usage Example**:
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  // Subscribe to a channel
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'system:notifications'
  }));
  
  // Send ping
  ws.send(JSON.stringify({
    type: 'ping'
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

#### Health Check Endpoint
```
WS /ws/health
```
**Purpose**: Quick WebSocket health check - connects, sends status, and disconnects

**Response**:
```json
{
  "type": "health",
  "status": "ok",
  "timestamp": "2024-01-07T10:30:00.000Z"
}
```

## 📊 Report Builder WebSocket Routes

### Real-time Report Progress
```
WS /api/v1/reports/progress/:reportId
```

**Purpose**: Track report generation progress in real-time

**Features**:
- Live progress updates (0-100%)
- Status notifications (pending, running, completed, error)
- Cancel report generation capability
- Manual status refresh

**Message Types**:

**Incoming Messages**:
```javascript
// Subscribe to template updates
{
  type: 'subscribe_template',
  templateId: 'template-uuid'
}

// Cancel report generation
{
  type: 'cancel_report'
}

// Request manual status update
{
  type: 'request_update'
}
```

**Outgoing Messages**:
```javascript
// Welcome message
{
  type: 'welcome',
  data: {
    connectionId: 'ws_123_abc',
    userId: 'user-uuid',
    serverTime: '2024-01-07T10:30:00.000Z',
    availableChannels: [
      'reports:progress',
      'reports:data-updates',
      'system:notifications',
      'user:alerts'
    ]
  }
}

// Report status update
{
  type: 'report_status',
  data: {
    reportId: 'report-uuid',
    status: 'running',
    progress: 75,
    message: 'Generating charts and visualizations...'
  },
  timestamp: '2024-01-07T10:30:00.000Z'
}

// Report completed
{
  type: 'report_completed',
  data: {
    reportId: 'report-uuid',
    downloadUrl: '/api/v1/reports/download/report-uuid',
    format: 'pdf',
    fileSize: 1024000
  },
  timestamp: '2024-01-07T10:30:00.000Z'
}
```

**Usage Example**:
```javascript
const reportWs = new WebSocket('ws://localhost:3000/api/v1/reports/progress/report-uuid');

reportWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'report_status':
      updateProgressBar(data.data.progress);
      updateStatusMessage(data.data.message);
      break;
      
    case 'report_completed':
      showDownloadLink(data.data.downloadUrl);
      break;
      
    case 'error':
      showErrorMessage(data.message);
      break;
  }
};

// Cancel report if needed
document.getElementById('cancelBtn').onclick = () => {
  reportWs.send(JSON.stringify({
    type: 'cancel_report'
  }));
};
```

### Live Data Streaming
```
WS /api/v1/reports/stream/:templateId
```

**Purpose**: Stream live data updates for real-time reports and dashboards

**Features**:
- Initial data load on connection
- Real-time data updates
- Configurable update intervals
- Real-time filtering capabilities

**Message Types**:

**Incoming Messages**:
```javascript
// Set update interval
{
  type: 'update_interval',
  interval: 5000  // milliseconds
}

// Apply real-time filter
{
  type: 'apply_filter',
  filter: {
    status: 'active',
    department: 'sales'
  }
}
```

**Outgoing Messages**:
```javascript
// Initial data
{
  type: 'initial_data',
  data: [
    { timestamp: '2024-01-07T10:30:00.000Z', value: 100 },
    { timestamp: '2024-01-07T10:29:00.000Z', value: 95 }
  ],
  timestamp: '2024-01-07T10:30:00.000Z'
}

// Live data update
{
  type: 'data_update',
  data: {
    timestamp: '2024-01-07T10:31:00.000Z',
    value: 105,
    change: '+5%'
  },
  timestamp: '2024-01-07T10:31:00.000Z'
}
```

**Usage Example**:
```javascript
const streamWs = new WebSocket('ws://localhost:3000/api/v1/reports/stream/template-uuid');

streamWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'initial_data':
      initializeChart(data.data);
      break;
      
    case 'data_update':
      updateChart(data.data);
      break;
  }
};

// Set 10-second update interval
streamWs.send(JSON.stringify({
  type: 'update_interval',
  interval: 10000
}));
```

### System Notifications
```
WS /api/v1/reports/notifications
```

**Purpose**: Receive system-wide notifications related to reports

**Features**:
- System alerts and maintenance notices
- User-specific notifications
- Report system status updates

**Auto-subscribed Channels**:
- `reports:system` - System-wide report notifications
- `reports:maintenance` - Maintenance and update notices
- `reports:alerts` - Critical alerts and warnings
- `user:{userId}:reports` - User-specific report notifications

**Message Types**:
```javascript
// System alert
{
  type: 'system_alert',
  data: {
    level: 'warning',
    message: 'Report generation service experiencing high load',
    action: 'Consider scheduling reports for off-peak hours'
  },
  timestamp: '2024-01-07T10:30:00.000Z'
}

// Maintenance notice
{
  type: 'maintenance_notice',
  data: {
    message: 'Scheduled maintenance in 30 minutes',
    startTime: '2024-01-07T11:00:00.000Z',
    duration: 'PT30M',
    affectedServices: ['report-generation', 'data-sources']
  },
  timestamp: '2024-01-07T10:30:00.000Z'
}
```

## 🔧 Connection Management

### Connection Lifecycle

#### Connection Establishment
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  console.log('WebSocket connected');
  // Connection is automatically registered with unique ID
};
```

#### Connection Tracking
Each connection is tracked with:
```typescript
interface WebSocketConnection {
  id: string;              // Unique connection ID
  userId?: string;         // Associated user ID (if authenticated)
  channels: Set<string>;   // Subscribed channels
  lastActivity: Date;      // Last activity timestamp
  metadata: {              // Additional connection info
    userAgent: string;
    ip: string;
    connectedAt: string;
  };
}
```

#### Automatic Cleanup
- **Timeout**: 5 minutes of inactivity
- **Cleanup Interval**: Every 5 minutes
- **Manual Cleanup**: Available via `cleanupInactiveConnections()`

### Channel Subscription System

#### Subscribe to Channels
```javascript
// Through WebSocket message
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'reports:progress'
}));

// Programmatically via manager
fastify.websocketManager.subscribeToChannel(connectionId, 'reports:progress');
```

#### Channel Naming Conventions
```
{domain}:{feature}:{specific}

Examples:
- reports:progress:report-uuid    # Specific report progress
- reports:data:template-uuid      # Template data updates  
- system:notifications           # System-wide notifications
- user:user-uuid:alerts         # User-specific alerts
```

## 📡 Broadcasting Messages

### Broadcast to Channel
```typescript
// Send message to all connections subscribed to a channel
fastify.websocketManager.broadcast('reports:system', {
  type: 'maintenance_notice',
  message: 'System maintenance in 30 minutes',
  level: 'info'
});

// Exclude specific connection from broadcast
fastify.websocketManager.broadcast(
  'reports:progress', 
  message, 
  excludeConnectionId
);
```

### Send to Specific User
```typescript
// Send message to all connections for a specific user
fastify.websocketManager.sendToUser('user-uuid', {
  type: 'user_notification',
  message: 'Your report is ready for download'
});
```

### Send to Specific Connection
```typescript
// Send message to a specific connection
fastify.websocketManager.sendToConnection('connection-id', {
  type: 'direct_message',
  message: 'Connection-specific message'
});
```

## 🔍 Monitoring & Debugging

### Health Monitoring
```typescript
// Get active connection count
const activeConnections = fastify.websocketManager.getActiveConnections();

// Get connections by channel
const channelConnections = fastify.websocketManager.getConnectionsByChannel('reports:system');

// Get connections by user
const userConnections = fastify.websocketManager.getConnectionsByUser('user-uuid');
```

### Logging Integration
WebSocket events are automatically logged with structured logging:

```typescript
// Connection events
fastify.log.info('WebSocket connection established', {
  connectionId: 'ws_123_abc',
  userId: 'user-uuid',
  totalConnections: 15
});

// Message events
fastify.log.debug('WebSocket message received', {
  connectionId: 'ws_123_abc',
  messageType: 'subscribe',
  channel: 'reports:progress'
});

// Error events
fastify.log.error('WebSocket connection error', {
  connectionId: 'ws_123_abc',
  error: errorObject
});
```

## 🔐 Security & Authentication

### Authentication Integration
WebSocket connections automatically inherit authentication from the HTTP upgrade request:

```typescript
// User information available in WebSocket handlers
fastify.get('/ws', { websocket: true }, (connection, request) => {
  const userId = (request as any).user?.id;
  const userRoles = (request as any).user?.roles;
  
  // Use authentication info for connection setup
});
```

### Channel Access Control
```typescript
// Example: Only allow authenticated users to subscribe to user-specific channels
if (data.channel.startsWith('user:') && !userId) {
  connection.socket.send(JSON.stringify({
    type: 'error',
    message: 'Authentication required for user channels'
  }));
  return;
}

// Example: Role-based channel access
if (data.channel.startsWith('admin:') && !userRoles.includes('admin')) {
  connection.socket.send(JSON.stringify({
    type: 'error',
    message: 'Insufficient permissions for admin channels'
  }));
  return;
}
```

## ⚙️ Configuration

### Environment Variables
```bash
# WebSocket Configuration (optional - uses defaults)
WEBSOCKET_MAX_PAYLOAD=1048576          # 1MB max payload size
WEBSOCKET_CLEANUP_INTERVAL=300000      # 5 minutes cleanup interval
WEBSOCKET_CONNECTION_TIMEOUT=300000    # 5 minutes connection timeout
WEBSOCKET_PING_INTERVAL=30000          # 30 seconds ping interval
```

### Plugin Registration
WebSocket plugin is automatically registered in the core plugins system:

```typescript
// apps/api/src/app/core/plugins/index.ts
import websocket from './websocket';

await fastify.register(websocket);
```

## 🚀 Usage Examples

### Healthcare Dashboard Example
```javascript
// Real-time patient monitoring dashboard
const patientWs = new WebSocket('ws://localhost:3000/ws');

patientWs.onopen = () => {
  // Subscribe to patient vital signs
  patientWs.send(JSON.stringify({
    type: 'subscribe',
    channel: 'patients:vitals:room-101'
  }));
  
  // Subscribe to alerts
  patientWs.send(JSON.stringify({
    type: 'subscribe',
    channel: 'alerts:critical'
  }));
};

patientWs.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'vital_signs_update':
      updateVitalSignsChart(data.data);
      break;
      
    case 'critical_alert':
      showCriticalAlert(data.data);
      break;
  }
};
```

### Report Generation Progress Example
```javascript
// Track multiple report generations
class ReportProgressTracker {
  constructor() {
    this.connections = new Map();
  }
  
  trackReport(reportId) {
    const ws = new WebSocket(`ws://localhost:3000/api/v1/reports/progress/${reportId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleReportUpdate(reportId, data);
    };
    
    this.connections.set(reportId, ws);
  }
  
  handleReportUpdate(reportId, data) {
    const progressElement = document.getElementById(`progress-${reportId}`);
    
    switch (data.type) {
      case 'report_status':
        progressElement.style.width = `${data.data.progress}%`;
        progressElement.textContent = data.data.message;
        break;
        
      case 'report_completed':
        this.showDownloadButton(reportId, data.data.downloadUrl);
        this.connections.get(reportId)?.close();
        this.connections.delete(reportId);
        break;
    }
  }
  
  cancelReport(reportId) {
    const ws = this.connections.get(reportId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'cancel_report'
      }));
    }
  }
}

// Usage
const tracker = new ReportProgressTracker();
tracker.trackReport('report-uuid-1');
tracker.trackReport('report-uuid-2');
```

## 🔧 Development Guidelines

### Best Practices

#### 1. Message Structure
Always use consistent message structure:
```javascript
{
  type: 'message_type',        // Required: message type
  data: { /* payload */ },     // Optional: message data
  timestamp: '2024-01-07T10:30:00.000Z',  // Auto-added by server
  channel?: 'channel-name'     // Optional: source channel
}
```

#### 2. Error Handling
Always handle WebSocket errors:
```javascript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Implement reconnection logic
};

ws.onclose = (event) => {
  if (event.code !== 1000) {
    console.log('WebSocket closed unexpectedly, reconnecting...');
    // Implement reconnection with backoff
  }
};
```

#### 3. Connection Management
Implement proper connection lifecycle:
```javascript
class WebSocketManager {
  constructor(url) {
    this.url = url;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => this.onOpen();
    this.ws.onclose = (event) => this.onClose(event);
    this.ws.onerror = (error) => this.onError(error);
    this.ws.onmessage = (event) => this.onMessage(event);
  }
  
  onClose(event) {
    if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    }
  }
}
```

### Testing WebSocket Connections

#### Manual Testing with wscat
```bash
# Install wscat
npm install -g wscat

# Connect to general WebSocket
wscat -c ws://localhost:3000/ws

# Send messages
> {"type": "subscribe", "channel": "test:channel"}
> {"type": "ping"}

# Connect to report progress
wscat -c ws://localhost:3000/api/v1/reports/progress/report-uuid
```

#### Automated Testing
```javascript
// Jest WebSocket testing example
const WebSocket = require('ws');

describe('WebSocket Service', () => {
  let ws;
  
  beforeEach(() => {
    ws = new WebSocket('ws://localhost:3000/ws');
  });
  
  afterEach(() => {
    ws.close();
  });
  
  test('should connect and receive welcome message', (done) => {
    ws.on('open', () => {
      // Connection opened
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'welcome') {
        expect(message.data.connectionId).toBeDefined();
        done();
      }
    });
  });
  
  test('should subscribe to channel', (done) => {
    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        channel: 'test:channel'
      }));
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'subscribed') {
        expect(message.channel).toBe('test:channel');
        done();
      }
    });
  });
});
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Connection Drops
**Problem**: WebSocket connections drop frequently
**Solution**: 
- Check firewall settings
- Implement heartbeat/ping mechanism
- Add connection retry logic with exponential backoff

#### 2. Memory Leaks
**Problem**: Memory usage increases over time
**Solution**:
- Verify automatic cleanup is working
- Check for unclosed connections
- Monitor connection registry size

#### 3. Message Delivery Issues
**Problem**: Messages not reaching subscribers
**Solution**:
- Verify channel subscription
- Check connection state before sending
- Implement message acknowledgment

### Debugging Commands

#### Check Active Connections
```javascript
// In browser console or Node.js REPL
fetch('/api/v1/debug/websocket/connections')
  .then(res => res.json())
  .then(data => console.log('Active connections:', data));
```

#### Monitor Channel Subscriptions
```javascript
// Custom debug endpoint (would need to be implemented)
fetch('/api/v1/debug/websocket/channels')
  .then(res => res.json())
  .then(data => console.log('Channel subscriptions:', data));
```

## 📈 Performance Considerations

### Scaling WebSocket Connections
- **Horizontal Scaling**: Use Redis adapter for multi-instance deployments
- **Load Balancing**: Implement sticky sessions for WebSocket connections
- **Connection Limits**: Monitor and limit connections per user/IP

### Message Optimization
- **Batch Messages**: Group multiple updates into single messages
- **Compression**: Enable WebSocket compression for large payloads
- **Filtering**: Only send relevant data to subscribers

### Resource Management
- **Memory Monitoring**: Track connection registry size
- **CPU Usage**: Monitor message processing overhead
- **Network Bandwidth**: Optimize message frequency and size

---

**WebSocket Service** - Enterprise-grade real-time communication for AegisX Healthcare Information Systems 🌐⚡