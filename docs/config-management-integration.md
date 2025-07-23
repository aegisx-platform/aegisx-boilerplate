# Configuration Management Integration Guide

## 📋 Overview

This guide demonstrates how to integrate the Dynamic Configuration Management System with existing services and build new features that leverage dynamic configuration capabilities.

## 🔌 Integration Patterns

### 1. Service Integration Pattern

Services can integrate with the configuration system in two ways:
- **Pull Pattern**: Service requests configuration when needed
- **Push Pattern**: Service receives notifications when configuration changes

#### Pull Pattern Example

```typescript
// Example: Database Service Configuration
export class DatabaseService {
  private configService: ConfigService;
  private currentConfig: any = null;

  constructor(fastify: FastifyInstance) {
    this.configService = fastify.configService;
  }

  async getConnection() {
    // Get current database configuration
    const config = await this.configService.getMergedConfiguration('database', 'production');
    
    // Create connection with dynamic config
    return createConnection({
      host: config.merged.host,
      port: parseInt(config.merged.port),
      database: config.merged.name,
      user: config.merged.user,
      password: config.merged.password
    });
  }
}
```

#### Push Pattern Example (Hot Reload)

```typescript
// Example: Email Service with Hot Reload
export class DynamicEmailService {
  private transporter: nodemailer.Transporter | null = null;
  private configService: ConfigService;

  constructor(fastify: FastifyInstance) {
    this.configService = fastify.configService;
    
    // Register for configuration change notifications
    this.registerHotReload(fastify);
  }

  private async registerHotReload(fastify: FastifyInstance) {
    // Subscribe to configuration change events
    await fastify.eventBus.subscribe('config.smtp.changed', async (event) => {
      fastify.log.info('SMTP configuration updated, reloading email service', {
        category: event.category,
        environment: event.environment
      });
      
      await this.reloadConfiguration(event.environment);
    });
  }

  private async reloadConfiguration(environment: string = 'production') {
    try {
      // Get updated SMTP configuration
      const config = await this.configService.getConfigValues('smtp', environment);
      
      // Recreate transporter with new configuration
      this.transporter = nodemailer.createTransport({
        host: config.values.host,
        port: parseInt(config.values.port),
        secure: config.values.secure === 'true',
        auth: {
          user: config.values.auth_user,
          pass: config.values.auth_pass
        }
      });

      // Verify new configuration
      await this.transporter.verify();
      
      fastify.log.info('Email service configuration reloaded successfully');
    } catch (error) {
      fastify.log.error('Failed to reload email service configuration:', error);
      throw error;
    }
  }

  async sendEmail(to: string, subject: string, content: string) {
    if (!this.transporter) {
      await this.reloadConfiguration();
    }
    
    return this.transporter.sendMail({
      from: this.configService.get('smtp.from_email'),
      to,
      subject,
      html: content
    });
  }
}
```

### 2. Plugin Integration Pattern

Create Fastify plugins that automatically configure themselves from the configuration system:

```typescript
// Example: Redis Plugin with Dynamic Configuration
import fp from 'fastify-plugin';
import Redis from 'ioredis';

export default fp(async function redisPlugin(fastify: FastifyInstance) {
  // Get Redis configuration
  const config = await fastify.configService.getMergedConfiguration('redis', process.env.NODE_ENV);
  
  // Create Redis connection
  const redis = new Redis({
    host: config.merged.host,
    port: parseInt(config.merged.port),
    password: config.merged.password,
    db: parseInt(config.merged.database || '0'),
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  });

  // Register hot reload handler
  if (fastify.configHotReloadService) {
    fastify.configHotReloadService.registerHandler({
      serviceName: 'redis-service',
      categories: ['redis'],
      handler: async (updatedConfig) => {
        fastify.log.info('Redis configuration updated, reconnecting...');
        
        // Disconnect old connection
        await redis.disconnect();
        
        // Create new connection with updated config
        redis.connect({
          host: updatedConfig.host,
          port: parseInt(updatedConfig.port),
          password: updatedConfig.password,
          db: parseInt(updatedConfig.database || '0')
        });
      },
      priority: 2
    });
  }

  // Decorate fastify instance
  fastify.decorate('redis', redis);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await redis.disconnect();
  });
});
```

### 3. Middleware Integration Pattern

Create middleware that uses dynamic configuration:

```typescript
// Example: Rate Limiting Middleware with Dynamic Config
export function createRateLimitMiddleware(fastify: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Get current rate limiting configuration
    const config = await fastify.configService.getConfigValues('rate_limit', 'production');
    
    const maxRequests = parseInt(config.values.max_requests_per_minute || '100');
    const windowMs = parseInt(config.values.window_ms || '60000');
    
    // Apply rate limiting based on dynamic configuration
    const clientId = request.ip;
    const key = `rate_limit:${clientId}`;
    
    const current = await fastify.redis.incr(key);
    if (current === 1) {
      await fastify.redis.expire(key, windowMs / 1000);
    }
    
    if (current > maxRequests) {
      reply.code(429).send({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        statusCode: 429
      });
      return;
    }
    
    // Add rate limit headers
    reply.header('X-RateLimit-Limit', maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - current));
  };
}
```

## 🏥 Healthcare System Integration

### Patient Management System Example

```typescript
// Example: Patient Data Privacy Configuration
export class PatientService {
  private configService: ConfigService;
  private auditService: AuditService;

  constructor(fastify: FastifyInstance) {
    this.configService = fastify.configService;
    this.auditService = fastify.auditService;
  }

  async getPatientData(patientId: string, requesterId: string) {
    // Get HIPAA compliance configuration
    const config = await this.configService.getMergedConfiguration('hipaa', 'production');
    
    const encryptionRequired = config.merged.encrypt_patient_data === 'true';
    const auditLoggingLevel = config.merged.audit_logging_level || 'detailed';
    const dataRetentionDays = parseInt(config.merged.data_retention_days || '2555'); // 7 years default
    
    // Log access attempt based on configuration
    if (auditLoggingLevel === 'detailed') {
      await this.auditService.log({
        action: 'patient.data.access',
        resource: 'patients',
        resourceId: patientId,
        userId: requesterId,
        details: {
          encryptionEnabled: encryptionRequired,
          complianceLevel: auditLoggingLevel
        }
      });
    }
    
    // Get patient data
    let patientData = await this.getPatientFromDatabase(patientId);
    
    // Apply encryption if required
    if (encryptionRequired && patientData.sensitiveData) {
      patientData.sensitiveData = await this.encryptSensitiveData(patientData.sensitiveData);
    }
    
    return patientData;
  }

  private async encryptSensitiveData(data: any): Promise<any> {
    const config = await this.configService.getConfigValues('encryption', 'production');
    const algorithm = config.values.algorithm || 'aes-256-gcm';
    const key = config.values.patient_data_key;
    
    // Encrypt using configured algorithm and key
    return encrypt(data, algorithm, key);
  }
}
```

### Medical Device Integration Example 

```typescript
// Example: Medical Device Configuration Management
export class MedicalDeviceService {
  private devices: Map<string, DeviceConnection> = new Map();
  private configService: ConfigService;

  constructor(fastify: FastifyInstance) {
    this.configService = fastify.configService;
    this.initializeDevices();
    this.setupConfigurationWatcher();
  }

  private async initializeDevices() {
    // Get all device configurations
    const deviceConfigs = await this.configService.searchConfigurations({
      category: 'medical_devices',
      isActive: true
    });

    for (const config of deviceConfigs.configurations) {
      await this.connectDevice(config);
    }
  }

  private async setupConfigurationWatcher() {
    // Watch for device configuration changes
    await fastify.eventBus.subscribe('config.medical_devices.changed', async (event) => {
      const deviceId = event.configKey;
      
      fastify.log.info(`Medical device ${deviceId} configuration updated`, {
        deviceId,
        environment: event.environment
      });
      
      // Reconnect device with new configuration
      await this.reconnectDevice(deviceId, event.environment);
    });
  }

  private async connectDevice(config: any) {
    const deviceConfig = JSON.parse(config.configValue);
    
    // Create device connection based on type
    const connection = await this.createDeviceConnection(config.configKey, deviceConfig);
    this.devices.set(config.configKey, connection);
    
    fastify.log.info(`Connected to medical device: ${config.configKey}`, {
      deviceType: deviceConfig.type,
      endpoint: deviceConfig.endpoint
    });
  }

  private async createDeviceConnection(deviceId: string, config: any): Promise<DeviceConnection> {
    // Get device-specific configuration
    const securityConfig = await this.configService.getConfigValues('device_security', 'production');
    
    return new DeviceConnection({
      deviceId,
      type: config.type,
      endpoint: config.endpoint,
      protocol: config.protocol,
      credentials: {
        username: config.username,
        password: config.password,
        certificate: securityConfig.values.device_certificate
      },
      timeout: parseInt(securityConfig.values.connection_timeout || '30000'),
      encryption: securityConfig.values.encrypt_device_communication === 'true'
    });
  }
}
```

## 🔄 Event-Driven Integration

### Configuration Change Events

The system publishes events when configurations change, allowing services to react accordingly:

```typescript
// Event Types
interface ConfigurationChangeEvent {
  category: string;
  configKey: string;
  environment: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: Date;
  changeReason?: string;
}

interface ConfigurationReloadEvent {
  category: string;
  environment: string;
  configs: Record<string, any>;
  reloadedAt: Date;
  requestedBy: string;
}

// Event Subscribers
export class ConfigurationEventHandler {
  constructor(fastify: FastifyInstance) {
    this.setupEventHandlers(fastify);
  }

  private async setupEventHandlers(fastify: FastifyInstance) {
    // Listen for specific configuration changes
    await fastify.eventBus.subscribe('config.changed', this.handleConfigChange.bind(this));
    await fastify.eventBus.subscribe('config.smtp.changed', this.handleSmtpChange.bind(this));
    await fastify.eventBus.subscribe('config.database.changed', this.handleDatabaseChange.bind(this));
    
    // Listen for bulk reload events
    await fastify.eventBus.subscribe('config.reloaded', this.handleConfigReload.bind(this));
  }

  private async handleConfigChange(event: ConfigurationChangeEvent) {
    fastify.log.info('Configuration changed', {
      category: event.category,
      key: event.configKey,
      environment: event.environment,
      changedBy: event.changedBy
    });

    // Route to specific handlers based on category
    switch (event.category) {
      case 'smtp':
        await this.notifyEmailService(event);
        break;
      case 'database':
        await this.notifyDatabaseService(event);
        break;
      case 'redis':
        await this.notifyRedisService(event);
        break;
      default:
        fastify.log.debug(`No specific handler for category: ${event.category}`);
    }
  }

  private async notifyEmailService(event: ConfigurationChangeEvent) {
    // Notify email service about SMTP configuration change
    await fastify.eventBus.publish('email.service.reload', {
      reason: 'SMTP configuration updated',
      config: event,
      timestamp: new Date()
    });
  }

  private async handleConfigReload(event: ConfigurationReloadEvent) {
    fastify.log.info('Configuration reload completed', {
      category: event.category,
      environment: event.environment,
      configCount: Object.keys(event.configs).length
    });

    // Update application caches
    await this.updateApplicationCaches(event.category, event.configs);
  }
}
```

## 🎯 Template Integration Examples

### Custom Provider Templates

```typescript
// Example: Creating Custom Provider Templates
export class CustomTemplateService {
  private configTemplateService: ConfigTemplateService;

  constructor(fastify: FastifyInstance) {
    this.configTemplateService = fastify.configTemplateService;
    this.registerCustomTemplates();
  }

  private async registerCustomTemplates() {
    // Register custom hospital system template
    await this.configTemplateService.createTemplate({
      providerName: 'hospital_his',
      category: 'integration',
      description: 'Hospital Information System integration template',
      templateData: {
        configs: {
          api_endpoint: '{{HIS_API_ENDPOINT}}',
          api_key: '{{HIS_API_KEY}}',
          api_version: 'v2',
          timeout: '30000',
          retry_attempts: '3',
          ssl_verify: 'true'
        },
        variables: [
          {
            name: 'HIS_API_ENDPOINT',
            description: 'Hospital Information System API endpoint',
            required: true,
            example: 'https://his.hospital.com/api'
          },
          {
            name: 'HIS_API_KEY',
            description: 'HIS API authentication key',
            required: true,
            example: 'his_key_123456789'
          }
        ],
        instructions: [
          '1. Contact your HIS administrator for API credentials',
          '2. Ensure your server IP is whitelisted in HIS firewall',
          '3. Test connection using the provided health check endpoint'
        ]
      }
    });

    // Register payment gateway template
    await this.configTemplateService.createTemplate({
      providerName: 'payment_stripe',
      category: 'payment',
      description: 'Stripe payment gateway configuration',
      templateData: {
        configs: {
          publishable_key: '{{STRIPE_PUBLISHABLE_KEY}}',
          secret_key: '{{STRIPE_SECRET_KEY}}',
          webhook_secret: '{{STRIPE_WEBHOOK_SECRET}}',
          api_version: '2023-10-16',
          currency: 'usd',
          capture_method: 'automatic'
        },
        variables: [
          {
            name: 'STRIPE_PUBLISHABLE_KEY',
            description: 'Stripe publishable key (starts with pk_)',
            required: true,
            validation: {
              pattern: '^pk_(test_|live_)[a-zA-Z0-9]+$'
            }
          },
          {
            name: 'STRIPE_SECRET_KEY',
            description: 'Stripe secret key (starts with sk_)',
            required: true,
            validation: {
              pattern: '^sk_(test_|live_)[a-zA-Z0-9]+$'
            }
          },
          {
            name: 'STRIPE_WEBHOOK_SECRET',
            description: 'Stripe webhook signing secret',
            required: true
          }
        ]
      }
    });
  }
}
```

### Template Application Workflow

```typescript
// Example: Automated Template Application
export class TemplateApplicationService {
  constructor(private configService: ConfigService) {}

  async setupHospitalIntegration(hospitalId: string, credentials: any) {
    try {
      // Apply HIS template
      const hisConfig = await this.configService.applyTemplate({
        provider: 'hospital_his',
        environment: 'production',
        variables: {
          HIS_API_ENDPOINT: credentials.hisEndpoint,
          HIS_API_KEY: credentials.hisApiKey
        },
        changeReason: `Setup HIS integration for hospital ${hospitalId}`
      });

      // Apply payment template if payment integration needed
      if (credentials.stripeKeys) {
        const paymentConfig = await this.configService.applyTemplate({
          provider: 'payment_stripe',
          environment: 'production',
          variables: {
            STRIPE_PUBLISHABLE_KEY: credentials.stripeKeys.publishable,
            STRIPE_SECRET_KEY: credentials.stripeKeys.secret,
            STRIPE_WEBHOOK_SECRET: credentials.stripeKeys.webhook
          },
          changeReason: `Setup Stripe payment for hospital ${hospitalId}`
        });
      }

      // Apply notification template
      const notificationConfig = await this.configService.applyTemplate({
        provider: 'gmail',
        environment: 'production',
        variables: {
          EMAIL_USER: credentials.email.user,
          EMAIL_PASS: credentials.email.appPassword
        },
        changeReason: `Setup email notifications for hospital ${hospitalId}`
      });

      return {
        success: true,
        configurations: {
          his: hisConfig,
          payment: paymentConfig,
          notification: notificationConfig
        },
        message: `Hospital ${hospitalId} integration setup completed`
      };

    } catch (error) {
      fastify.log.error(`Failed to setup hospital ${hospitalId} integration:`, error);
      throw error;
    }
  }
}
```

## 🔐 Security Integration

### Configuration-Based Access Control

```typescript
// Example: Dynamic RBAC Configuration
export class SecurityConfigService {
  private configService: ConfigService;

  constructor(fastify: FastifyInstance) {
    this.configService = fastify.configService;
  }

  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    // Get security configuration
    const securityConfig = await this.configService.getMergedConfiguration('security', 'production');
    
    const roleBasedAccessEnabled = securityConfig.merged.rbac_enabled === 'true';
    const permissionCacheTTL = parseInt(securityConfig.merged.permission_cache_ttl || '300');
    const auditAllAccess = securityConfig.merged.audit_all_permissions === 'true';
    
    // Check cached permissions first
    const cacheKey = `permissions:${userId}:${resource}:${action}`;
    let hasPermission = await fastify.redis.get(cacheKey);
    
    if (hasPermission === null) {
      // Get user permissions from database
      hasPermission = await this.getUserPermission(userId, resource, action, roleBasedAccessEnabled);
      
      // Cache the result
      await fastify.redis.setex(cacheKey, permissionCacheTTL, hasPermission ? '1' : '0');
    }
    
    // Audit permission check if required
    if (auditAllAccess) {
      await this.auditPermissionCheck(userId, resource, action, hasPermission === '1');
    }
    
    return hasPermission === '1';
  }

  private async getUserPermission(userId: string, resource: string, action: string, rbacEnabled: boolean): Promise<boolean> {
    if (!rbacEnabled) {
      // If RBAC is disabled, allow all authenticated users
      return true;
    }

    // Get user roles and check permissions
    const userRoles = await this.getUserRoles(userId);
    const requiredPermission = `${resource}:${action}`;
    
    return userRoles.some(role => 
      role.permissions.includes(requiredPermission) || 
      role.permissions.includes(`${resource}:*`) ||
      role.permissions.includes('*:*')
    );
  }
}
```

### Encryption Configuration Integration

```typescript
// Example: Dynamic Encryption Service
export class EncryptionService {
  private configService: ConfigService;
  private currentConfig: any = null;

  constructor(fastify: FastifyInstance) {
    this.configService = fastify.configService;
    this.loadEncryptionConfig();
    this.setupConfigWatcher(fastify);
  }

  private async loadEncryptionConfig() {
    this.currentConfig = await this.configService.getMergedConfiguration('encryption', 'production');
  }

  private setupConfigWatcher(fastify: FastifyInstance) {
    fastify.eventBus.subscribe('config.encryption.changed', async () => {
      fastify.log.info('Encryption configuration updated, reloading...');
      await this.loadEncryptionConfig();
    });
  }

  async encryptSensitiveData(data: string, context: string = 'default'): Promise<string> {
    const algorithm = this.currentConfig.merged[`${context}_algorithm`] || 'aes-256-gcm';
    const key = this.currentConfig.merged[`${context}_key`];
    const rotationEnabled = this.currentConfig.merged.key_rotation_enabled === 'true';
    
    if (rotationEnabled) {
      // Check if key rotation is due
      const lastRotation = new Date(this.currentConfig.merged.last_key_rotation || '1970-01-01');
      const rotationInterval = parseInt(this.currentConfig.merged.rotation_interval_days || '90');
      const daysSinceRotation = (Date.now() - lastRotation.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRotation > rotationInterval) {
        fastify.log.warn(`Encryption key rotation overdue by ${Math.floor(daysSinceRotation - rotationInterval)} days`);
        // Trigger key rotation notification
        await fastify.eventBus.publish('encryption.key_rotation_due', {
          context,
          daysSinceRotation,
          rotationInterval
        });
      }
    }
    
    return this.encrypt(data, algorithm, key);
  }

  private encrypt(data: string, algorithm: string, key: string): string {
    // Implementation depends on algorithm
    // This is a simplified example
    const crypto = require('crypto');
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `encrypted:${algorithm}:${encrypted}`;
  }
}
```

## 📊 Monitoring Integration

### Configuration Change Monitoring

```typescript
// Example: Configuration Change Monitoring Service
export class ConfigMonitoringService {
  constructor(fastify: FastifyInstance) {
    this.setupMonitoring(fastify);
  }

  private setupMonitoring(fastify: FastifyInstance) {
    // Monitor configuration changes
    fastify.eventBus.subscribe('config.changed', this.trackConfigChange.bind(this));
    
    // Monitor reload statistics
    setInterval(() => {
      this.collectReloadMetrics(fastify);
    }, 60000); // Every minute
    
    // Monitor configuration validation failures
    fastify.eventBus.subscribe('config.validation.failed', this.trackValidationFailure.bind(this));
  }

  private async trackConfigChange(event: ConfigurationChangeEvent) {
    // Send metrics to monitoring system
    await fastify.metrics.recordEvent('config.change', {
      category: event.category,
      environment: event.environment,
      changedBy: event.changedBy,
      hasChangeReason: !!event.changeReason
    });

    // Alert on critical configuration changes
    const criticalCategories = ['database', 'security', 'payment'];
    if (criticalCategories.includes(event.category)) {
      await this.sendCriticalChangeAlert(event);
    }
  }

  private async collectReloadMetrics(fastify: FastifyInstance) {
    try {
      const reloadStats = await fastify.configHotReloadService?.getReloadStats();
      if (reloadStats) {
        for (const [serviceName, stats] of Object.entries(reloadStats)) {
          await fastify.metrics.recordGauge('config.reload.success_count', stats.successCount, {
            service: serviceName
          });
          await fastify.metrics.recordGauge('config.reload.error_count', stats.errorCount, {
            service: serviceName
          });
        }
      }
    } catch (error) {
      fastify.log.error('Failed to collect reload metrics:', error);
    }
  }

  private async sendCriticalChangeAlert(event: ConfigurationChangeEvent) {
    const alertMessage = `🚨 Critical Configuration Change Alert
    
**Category**: ${event.category}
**Key**: ${event.configKey}
**Environment**: ${event.environment}
**Changed By**: ${event.changedBy}
**Time**: ${event.changedAt.toISOString()}
**Reason**: ${event.changeReason || 'No reason provided'}
**Old Value**: ${event.oldValue || 'null'}
**New Value**: ${event.newValue || 'null'}

Please review this change immediately.`;

    // Send to notification service
    await fastify.notification.send('email', {
      to: 'admin@hospital.com',
      subject: `Critical Config Change: ${event.category}.${event.configKey}`,
      template: 'system-alert',
      data: {
        alert_type: 'critical_config_change',
        message: alertMessage,
        event
      }
    });

    // Send to Slack if configured
    const slackConfig = await fastify.configService.getConfigValues('slack', 'production');
    if (slackConfig.values.alerts_enabled === 'true') {
      await fastify.notification.send('slack', {
        channel: slackConfig.values.alerts_channel || '#alerts',
        message: alertMessage,
        priority: 'high'
      });
    }
  }
}
```

## 📚 Best Practices for Integration

### 1. Graceful Degradation

Always implement fallback mechanisms when dynamic configuration is not available:

```typescript
export class ResilientService {
  async getConfig(category: string, key: string, defaultValue: any) {
    try {
      const config = await fastify.configService.getConfigValues(category, 'production');
      return config.values[key] || defaultValue;
    } catch (error) {
      fastify.log.warn(`Failed to load dynamic config ${category}.${key}, using default:`, error);
      return defaultValue;
    }
  }
}
```

### 2. Configuration Validation

Validate configurations before applying them:

```typescript
export class ConfigValidator {
  async validateSmtpConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!config.host) errors.push('SMTP host is required');
    if (!config.port || isNaN(parseInt(config.port))) errors.push('Valid SMTP port is required');
    if (!config.auth_user) errors.push('SMTP username is required');
    if (!config.auth_pass) errors.push('SMTP password is required');
    
    // Test connection if basic validation passes
    if (errors.length === 0) {
      try {
        const transporter = nodemailer.createTransporter(config);
        await transporter.verify();
      } catch (error) {
        errors.push(`SMTP connection test failed: ${error.message}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### 3. Configuration Caching

Implement intelligent caching to reduce database load:

```typescript
export class ConfigCache {
  private cache = new Map<string, { value: any; expires: number }>();
  private defaultTTL = 300000; // 5 minutes

  async get(key: string): Promise<any> {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.value;
    }
    
    // Cache miss or expired, fetch from service
    const value = await fastify.configService.getConfigValues(...key.split(':'));
    
    // Cache with TTL
    this.cache.set(key, {
      value,
      expires: Date.now() + this.defaultTTL
    });
    
    return value;
  }

  invalidate(pattern: string) {
    // Invalidate cache entries matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
```

## 🔄 Testing Integration

### Integration Testing Examples

```typescript
// Example: Testing Configuration Integration
describe('Configuration Integration', () => {
  let fastify: FastifyInstance;
  let configService: ConfigService;

  beforeEach(async () => {
    fastify = await buildTestApp();
    configService = fastify.configService;
  });

  test('should reload email service when SMTP config changes', async () => {
    // Arrange: Set initial SMTP configuration
    await configService.createConfiguration({
      category: 'smtp',
      configKey: 'host',
      configValue: 'smtp.gmail.com',
      environment: 'test'
    });

    // Act: Update SMTP host
    await configService.updateConfiguration(1, {
      configValue: 'smtp.sendgrid.net',
      changeReason: 'Switch to SendGrid for testing'
    });

    // Assert: Verify email service received reload event
    await waitFor(() => {
      expect(fastify.emailService.currentHost).toBe('smtp.sendgrid.net');
    });
  });

  test('should apply template correctly', async () => {
    // Act: Apply Gmail template
    const result = await configService.applyTemplate({
      provider: 'gmail',
      environment: 'test',
      variables: {
        EMAIL_USER: 'test@gmail.com',
        EMAIL_PASS: 'test-app-password'
      },
      changeReason: 'Setup test email'
    });

    // Assert: Verify configurations were created
    expect(result.configurationsCreated).toHaveLength(5);
    expect(result.configurationsCreated[0]).toMatchObject({
      category: 'smtp',
      configKey: 'host',
      configValue: 'smtp.gmail.com'
    });
  });
});
```

---

## 📚 Related Documentation

- [Main Documentation](./dynamic-configuration-management.md) - System overview
- [API Documentation](./config-management-api.md) - API endpoints  
- [Database Schema](./config-management-database.md) - Database structure

---

**Created**: 2025-01-21  
**Last Updated**: 2025-01-21  
**Version**: 1.0.0