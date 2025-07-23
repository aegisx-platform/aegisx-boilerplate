import { FastifyInstance } from 'fastify';
import * as nodemailer from 'nodemailer';
import { Notification } from '../../../core/shared/types/notification.types';
import { ConfigService } from '../../config-management/services/config-service';
import { ConfigHotReloadService } from '../../config-management/services/config-hot-reload.service';

export interface DynamicEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromName: string;
  fromEmail: string;
  // Advanced options
  requireAuth?: boolean;
  connectionTimeout?: number;
  greetingTimeout?: number;
  socketTimeout?: number;
  // Provider-specific settings
  provider?: string;
  customOptions?: Record<string, any>;
}

export class DynamicEmailService {
  private fastify: FastifyInstance;
  private configService: ConfigService;
  private hotReloadService: ConfigHotReloadService;
  private transporter: nodemailer.Transporter | null = null;
  private currentConfig: DynamicEmailConfig | null = null;
  private lastConfigUpdate: Date = new Date();

  constructor(
    fastify: FastifyInstance,
    configService: ConfigService,
    hotReloadService: ConfigHotReloadService
  ) {
    this.fastify = fastify;
    this.configService = configService;
    this.hotReloadService = hotReloadService;
    
    this.initialize();
  }

  /**
   * เริ่มต้นระบบ dynamic email service
   */
  private async initialize(): Promise<void> {
    try {
      // Load initial configuration
      await this.loadConfiguration();

      // Register for hot reload events
      this.registerHotReloadHandler();

      this.fastify.log.info('Dynamic Email Service initialized successfully', {
        hasConfig: !!this.currentConfig,
        hasTransporter: !!this.transporter,
        provider: this.currentConfig?.provider,
      });
    } catch (error) {
      this.fastify.log.error('Failed to initialize Dynamic Email Service:', error);
      // Fallback to environment variables
      await this.loadFallbackConfiguration();
    }
  }

  /**
   * โหลด configuration จาก database
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const environment = process.env.NODE_ENV || 'development';
      const smtpConfig = await this.configService.getConfigValues('smtp', environment as any);
      
      if (Object.keys(smtpConfig).length === 0) {
        this.fastify.log.warn('No SMTP configuration found in database, using fallback');
        await this.loadFallbackConfiguration();
        return;
      }

      // Map database config to our format (adjust field names to match database)
      const config: DynamicEmailConfig = {
        host: smtpConfig.host || 'localhost',
        port: parseInt(smtpConfig.port || '587'),
        secure: smtpConfig.secure === 'true' || smtpConfig.secure === true,
        username: smtpConfig.auth_user, // Changed from username
        password: smtpConfig.auth_pass, // Changed from password
        fromName: smtpConfig.from_name || 'AegisX System', // Changed from fromName
        fromEmail: smtpConfig.from_email || 'noreply@aegisx.com', // Changed from fromEmail
        requireAuth: smtpConfig.requireAuth !== 'false',
        connectionTimeout: parseInt(smtpConfig.connectionTimeout || '60000'),
        greetingTimeout: parseInt(smtpConfig.greetingTimeout || '30000'),
        socketTimeout: parseInt(smtpConfig.socketTimeout || '60000'),
        provider: smtpConfig.provider,
        customOptions: smtpConfig.customOptions ? JSON.parse(smtpConfig.customOptions) : {},
      };

      await this.updateConfiguration(config);
      
      this.fastify.log.info('SMTP configuration loaded from database', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        provider: config.provider,
        hasAuth: !!(config.username && config.password),
      });

    } catch (error) {
      this.fastify.log.error('Failed to load SMTP configuration from database:', error);
      throw error;
    }
  }

  /**
   * โหลด fallback configuration จาก environment variables
   */
  private async loadFallbackConfiguration(): Promise<void> {
    const config: DynamicEmailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      username: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      fromName: process.env.EMAIL_FROM_NAME || 'AegisX System',
      fromEmail: process.env.EMAIL_FROM_ADDRESS || 'noreply@aegisx.com',
      requireAuth: true,
      provider: 'environment',
    };

    await this.updateConfiguration(config);
    
    this.fastify.log.info('SMTP configuration loaded from environment variables', {
      host: config.host,
      port: config.port,
      secure: config.secure,
      hasAuth: !!(config.username && config.password),
    });
  }

  /**
   * อัพเดท configuration และสร้าง transporter ใหม่
   */
  private async updateConfiguration(config: DynamicEmailConfig): Promise<void> {
    const oldConfig = this.currentConfig;
    this.currentConfig = config;
    this.lastConfigUpdate = new Date();

    // Create new transporter
    await this.createTransporter();

    // Log configuration change
    if (oldConfig) {
      this.fastify.log.info('SMTP configuration updated', {
        changes: this.getConfigurationChanges(oldConfig, config),
        timestamp: this.lastConfigUpdate,
      });
    }
  }

  /**
   * สร้าง nodemailer transporter ใหม่
   */
  private async createTransporter(): Promise<void> {
    try {
      if (!this.currentConfig) {
        throw new Error('No SMTP configuration available');
      }

      const config = this.currentConfig;

      // Base transport options
      const transportOptions: any = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        connectionTimeout: config.connectionTimeout || 60000,
        greetingTimeout: config.greetingTimeout || 30000,
        socketTimeout: config.socketTimeout || 60000,
        tls: {
          rejectUnauthorized: false,
        },
      };

      // Add authentication if required
      if (config.requireAuth !== false && config.username && config.password) {
        transportOptions.auth = {
          user: config.username,
          pass: config.password,
        };
      }

      // Provider-specific configurations
      if (config.provider) {
        switch (config.provider) {
          case 'gmail':
            transportOptions.service = 'gmail';
            break;
          case 'sendgrid':
            transportOptions.host = 'smtp.sendgrid.net';
            transportOptions.auth = {
              user: 'apikey',
              pass: config.password,
            };
            break;
          case 'mailgun':
            transportOptions.host = 'smtp.mailgun.org';
            break;
          case 'postmark':
            transportOptions.host = 'smtp.postmarkapp.com';
            transportOptions.auth = {
              user: config.username,
              pass: config.username, // Postmark uses token as both user and pass
            };
            break;
          case 'amazon-ses':
            // Keep host and auth as configured
            break;
          case 'mailtrap':
            transportOptions.host = 'smtp.mailtrap.io';
            transportOptions.port = 2525;
            transportOptions.secure = false;
            break;
        }
      }

      // Apply custom options
      if (config.customOptions) {
        Object.assign(transportOptions, config.customOptions);
      }

      // Close existing transporter
      if (this.transporter) {
        this.transporter.close();
      }

      // Create new transporter
      this.transporter = nodemailer.createTransport(transportOptions);

      this.fastify.log.debug('SMTP transporter created successfully', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        provider: config.provider,
        hasAuth: !!transportOptions.auth,
      });

    } catch (error) {
      this.fastify.log.error('Failed to create SMTP transporter:', error);
      throw error;
    }
  }

  /**
   * ลงทะเบียน hot reload handler
   */
  private registerHotReloadHandler(): void {
    this.hotReloadService.registerHandler({
      serviceName: 'dynamic-email-service',
      categories: ['smtp'],
      handler: async (config: Record<string, any>) => {
        this.fastify.log.info('Received SMTP configuration hot reload event');
        
        // Map config to our format (adjust field names to match database)
        const emailConfig: DynamicEmailConfig = {
          host: config.host || 'localhost',
          port: parseInt(config.port || '587'),
          secure: config.secure === 'true' || config.secure === true,
          username: config.auth_user, // Changed from username
          password: config.auth_pass, // Changed from password
          fromName: config.from_name || 'AegisX System', // Changed from fromName
          fromEmail: config.from_email || 'noreply@aegisx.com', // Changed from fromEmail
          requireAuth: config.requireAuth !== 'false',
          connectionTimeout: parseInt(config.connectionTimeout || '60000'),
          greetingTimeout: parseInt(config.greetingTimeout || '30000'),
          socketTimeout: parseInt(config.socketTimeout || '60000'),
          provider: config.provider,
          customOptions: config.customOptions ? JSON.parse(config.customOptions) : {},
        };

        await this.updateConfiguration(emailConfig);
        
        this.fastify.log.info('SMTP configuration hot reload completed successfully');
      },
      priority: 10, // High priority for email service
      timeout: 10000, // 10 seconds timeout
    });
  }

  /**
   * ส่งอีเมล
   */
  async sendEmail(notification: Notification): Promise<void> {
    try {
      if (!this.transporter || !this.currentConfig) {
        this.fastify.log.warn('No SMTP transporter available, attempting to reinitialize');
        await this.loadConfiguration();
        
        if (!this.transporter) {
          throw new Error('SMTP service is not properly configured');
        }
      }

      const config = this.currentConfig!;

      // Check if we have authentication when required
      if (config.requireAuth !== false && (!config.username || !config.password)) {
        this.fastify.log.info('Using mock email service (no SMTP authentication configured)', {
          notificationId: notification.id,
          to: notification.recipient.email,
        });
        await this.mockSendEmail(notification);
        return;
      }

      this.fastify.log.info('Sending email via dynamic SMTP service', {
        notificationId: notification.id,
        to: notification.recipient.email,
        provider: config.provider,
        host: config.host,
      });

      await this.sendEmailWithTransporter(notification);

    } catch (error) {
      this.fastify.log.error('Failed to send email:', error);
      
      // Fallback to mock if SMTP fails
      this.fastify.log.info('Falling back to mock email service');
      await this.mockSendEmail(notification);
    }
  }

  /**
   * ส่งอีเมลผ่าน transporter
   */
  private async sendEmailWithTransporter(notification: Notification): Promise<void> {
    if (!this.transporter || !this.currentConfig) {
      throw new Error('SMTP transporter not available');
    }

    const config = this.currentConfig;
    const mailOptions = {
      from: `${config.fromName} <${config.fromEmail}>`,
      to: notification.recipient.email,
      subject: notification.subject,
      text: notification.content.text,
      html: notification.content.html || `<p>${notification.content.text}</p>`,
    };

    this.fastify.log.debug('Sending SMTP email', {
      notificationId: notification.id,
      to: notification.recipient.email,
      subject: notification.subject,
      provider: config.provider,
      from: mailOptions.from,
    });

    try {
      const result = await this.transporter.sendMail(mailOptions);
      
      this.fastify.log.info('Email sent successfully via SMTP', {
        notificationId: notification.id,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        response: result.response,
        provider: config.provider,
      });

    } catch (error) {
      this.fastify.log.error('SMTP send error details', {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: (error as any).code,
        command: (error as any).command,
        responseCode: (error as any).responseCode,
        response: (error as any).response,
        provider: config.provider,
      });
      throw error;
    }
  }

  /**
   * Mock email service สำหรับ development/testing
   */
  private async mockSendEmail(notification: Notification): Promise<void> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error('Mock SMTP connection failed');
    }

    // Log the mock email
    this.fastify.log.info('📧 Mock Email Sent:', {
      to: notification.recipient.email,
      subject: notification.subject,
      content: notification.content.text,
      html: notification.content.html,
      type: notification.type,
      priority: notification.priority,
      provider: 'mock',
    });
  }

  /**
   * ทดสอบการเชื่อมต่อ SMTP
   */
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.fastify.log.warn('No SMTP transporter available for verification');
        return false;
      }

      const verified = await this.transporter.verify();
      
      this.fastify.log.info('SMTP connection verified successfully', {
        verified,
        host: this.currentConfig?.host,
        port: this.currentConfig?.port,
        provider: this.currentConfig?.provider,
        configUpdated: this.lastConfigUpdate,
      });

      return verified;
    } catch (error) {
      this.fastify.log.error('SMTP connection verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        host: this.currentConfig?.host,
        port: this.currentConfig?.port,
        provider: this.currentConfig?.provider,
      });
      return false;
    }
  }

  /**
   * ดึงข้อมูล configuration ปัจจุบัน
   */
  getCurrentConfiguration(): DynamicEmailConfig | null {
    return this.currentConfig;
  }

  /**
   * ดึงสถานะของ service
   */
  getServiceStatus(): {
    configured: boolean;
    connected: boolean;
    lastUpdate: Date;
    provider?: string;
    host?: string;
    port?: number;
  } {
    return {
      configured: !!this.currentConfig,
      connected: !!this.transporter,
      lastUpdate: this.lastConfigUpdate,
      provider: this.currentConfig?.provider,
      host: this.currentConfig?.host,
      port: this.currentConfig?.port,
    };
  }

  /**
   * Force reload configuration
   */
  async forceReload(): Promise<void> {
    this.fastify.log.info('Force reloading SMTP configuration');
    await this.loadConfiguration();
  }

  /**
   * เปรียบเทียบการเปลี่ยนแปลง configuration
   */
  private getConfigurationChanges(
    oldConfig: DynamicEmailConfig,
    newConfig: DynamicEmailConfig
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};
    
    const compareKeys: (keyof DynamicEmailConfig)[] = [
      'host', 'port', 'secure', 'username', 'fromName', 'fromEmail', 'provider'
    ];

    for (const key of compareKeys) {
      if (oldConfig[key] !== newConfig[key]) {
        changes[key] = {
          old: key === 'password' ? '***masked***' : oldConfig[key],
          new: key === 'password' ? '***masked***' : newConfig[key],
        };
      }
    }

    return changes;
  }

  /**
   * ปิด service
   */
  async shutdown(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
    
    this.currentConfig = null;
    this.fastify.log.info('Dynamic Email Service shutdown completed');
  }
}