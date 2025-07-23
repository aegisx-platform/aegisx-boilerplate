import { FastifyInstance } from 'fastify';
import {
  ConfigurationTemplateDefinition,
  SMTPTemplateDefinition,
  DatabaseTemplateDefinition,
  StorageTemplateDefinition,
  TemplateField,
  TemplateGroup,
  ConfigurationCategoryType,
  SMTPProviderType,
  DatabaseProviderType,
  StorageProviderType,
} from '../types/config-template.types';

export class ConfigTemplateService {
  private fastify: FastifyInstance;
  private templates: Map<string, ConfigurationTemplateDefinition> = new Map();

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.initializeBuiltInTemplates();
  }

  /**
   * เริ่มต้น built-in templates
   */
  private initializeBuiltInTemplates(): void {
    // SMTP Templates
    this.registerTemplate(this.createGmailTemplate());
    this.registerTemplate(this.createSendGridTemplate());
    this.registerTemplate(this.createMailtrapTemplate());
    this.registerTemplate(this.createAmazonSESTemplate());
    this.registerTemplate(this.createMailgunTemplate());
    this.registerTemplate(this.createPostmarkTemplate());
    this.registerTemplate(this.createCustomSMTPTemplate());

    // Database Templates
    this.registerTemplate(this.createPostgreSQLTemplate());
    this.registerTemplate(this.createMySQLTemplate());
    this.registerTemplate(this.createMongoDBTemplate());

    // Storage Templates
    this.registerTemplate(this.createLocalStorageTemplate());
    this.registerTemplate(this.createMinIOTemplate());
    this.registerTemplate(this.createAWSS3Template());

    this.fastify.log.info(`Initialized ${this.templates.size} configuration templates`);
  }

  /**
   * ลงทะเบียน template
   */
  registerTemplate(template: ConfigurationTemplateDefinition): void {
    const key = `${template.category}:${template.templateName}`;
    this.templates.set(key, template);
  }

  /**
   * ดึง template ตาม category และ name
   */
  getTemplate(category: ConfigurationCategoryType, templateName: string): ConfigurationTemplateDefinition | null {
    const key = `${category}:${templateName}`;
    return this.templates.get(key) || null;
  }

  /**
   * ดึง templates ทั้งหมดของ category
   */
  getTemplatesByCategory(category: ConfigurationCategoryType): ConfigurationTemplateDefinition[] {
    const templates: ConfigurationTemplateDefinition[] = [];
    
    for (const [key, template] of this.templates.entries()) {
      if (template.category === category && template.isActive) {
        templates.push(template);
      }
    }

    return templates.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * ดึง templates ทั้งหมด
   */
  getAllTemplates(): Record<ConfigurationCategoryType, ConfigurationTemplateDefinition[]> {
    const result = {} as Record<ConfigurationCategoryType, ConfigurationTemplateDefinition[]>;
    
    const categories: ConfigurationCategoryType[] = [
      'smtp', 'database', 'redis', 'security', 'storage', 
      'notification', 'logging', 'queue', 'custom'
    ];

    for (const category of categories) {
      result[category] = this.getTemplatesByCategory(category);
    }

    return result;
  }

  // === SMTP Templates ===

  /**
   * Gmail SMTP Template
   */
  private createGmailTemplate(): SMTPTemplateDefinition {
    return {
      category: 'smtp',
      templateName: 'gmail',
      displayName: 'Gmail SMTP',
      description: 'Gmail SMTP configuration using App Password authentication',
      provider: 'gmail',
      icon: 'gmail',
      documentationUrl: 'https://support.google.com/accounts/answer/185833',
      
      fields: [
        {
          key: 'host',
          displayName: 'SMTP Host',
          description: 'Gmail SMTP server hostname',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'smtp.gmail.com',
          isRequired: true,
          placeholder: 'smtp.gmail.com',
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'SMTP Port',
          description: 'Gmail SMTP server port',
          valueType: 'number',
          inputType: 'select',
          defaultValue: '587',
          isRequired: true,
          options: [
            { value: '587', label: '587 (TLS)', description: 'Recommended for most cases' },
            { value: '465', label: '465 (SSL)', description: 'SSL encrypted connection' },
          ],
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'secure',
          displayName: 'Use SSL',
          description: 'Enable SSL encryption (use false for TLS)',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          dependsOn: { field: 'port', value: '465' },
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'username',
          displayName: 'Gmail Address',
          description: 'Your Gmail email address',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[\\w\\.-]+@gmail\\.com$',
          },
          placeholder: 'your-email@gmail.com',
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'password',
          displayName: 'App Password',
          description: 'Gmail App Password (not your regular password)',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          helpText: 'Generate an App Password in your Google Account settings',
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'fromName',
          displayName: 'From Name',
          description: 'Display name for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'AegisX System',
          isRequired: true,
          placeholder: 'Your Organization Name',
          group: 'sender',
          sortOrder: 6,
        },
        {
          key: 'fromEmail',
          displayName: 'From Email',
          description: 'Email address for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
          },
          placeholder: 'noreply@yourdomain.com',
          group: 'sender',
          sortOrder: 7,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', description: 'SMTP server connection configuration', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', description: 'Gmail authentication settings', sortOrder: 2, defaultExpanded: true },
        { name: 'sender', displayName: 'Sender Information', description: 'Email sender configuration', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: true,
      },

      smtpFeatures: {
        supportsTLS: true,
        supportsOAuth2: true,
        requiresAppPassword: true,
        defaultPort: 587,
        securePort: 465,
        maxRecipientsPerEmail: 500,
        rateLimit: {
          perMinute: 100,
          perHour: 1000,
          perDay: 10000,
        },
      },

      version: '1.0.0',
      tags: ['gmail', 'google', 'smtp', 'email'],
      isActive: true,
      sortOrder: 1,
    };
  }

  /**
   * SendGrid SMTP Template
   */
  private createSendGridTemplate(): SMTPTemplateDefinition {
    return {
      category: 'smtp',
      templateName: 'sendgrid',
      displayName: 'SendGrid SMTP',
      description: 'SendGrid SMTP API configuration for transactional emails',
      provider: 'sendgrid',
      icon: 'sendgrid',
      documentationUrl: 'https://docs.sendgrid.com/for-developers/sending-email/smtp',
      
      fields: [
        {
          key: 'host',
          displayName: 'SMTP Host',
          description: 'SendGrid SMTP server hostname',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'smtp.sendgrid.net',
          isRequired: true,
          placeholder: 'smtp.sendgrid.net',
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'SMTP Port',
          description: 'SendGrid SMTP server port',
          valueType: 'number',
          inputType: 'select',
          defaultValue: '587',
          isRequired: true,
          options: [
            { value: '587', label: '587 (TLS)', description: 'Recommended port' },
            { value: '465', label: '465 (SSL)', description: 'SSL encrypted' },
            { value: '25', label: '25 (Unencrypted)', description: 'Not recommended' },
          ],
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'secure',
          displayName: 'Use SSL',
          description: 'Enable SSL encryption',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'username',
          displayName: 'Username',
          description: 'SendGrid username (always "apikey")',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'apikey',
          isRequired: true,
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'password',
          displayName: 'API Key',
          description: 'SendGrid API Key',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          helpText: 'Create an API key in your SendGrid dashboard',
          placeholder: 'SG.xxxxxxxxxx...',
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'fromName',
          displayName: 'From Name',
          description: 'Display name for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'AegisX System',
          isRequired: true,
          group: 'sender',
          sortOrder: 6,
        },
        {
          key: 'fromEmail',
          displayName: 'From Email',
          description: 'Verified sender email address',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
          },
          helpText: 'Must be a verified sender in SendGrid',
          group: 'sender',
          sortOrder: 7,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'API Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'sender', displayName: 'Sender Information', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: true,
      },

      smtpFeatures: {
        supportsTLS: true,
        supportsOAuth2: false,
        requiresAppPassword: false,
        defaultPort: 587,
        securePort: 465,
        maxRecipientsPerEmail: 1000,
        rateLimit: {
          perMinute: 600,
          perHour: 10000,
          perDay: 100000,
        },
      },

      version: '1.0.0',
      tags: ['sendgrid', 'smtp', 'transactional', 'api'],
      isActive: true,
      sortOrder: 2,
    };
  }

  /**
   * Mailtrap SMTP Template (for testing)
   */
  private createMailtrapTemplate(): SMTPTemplateDefinition {
    return {
      category: 'smtp',
      templateName: 'mailtrap',
      displayName: 'Mailtrap SMTP',
      description: 'Mailtrap SMTP for email testing and development',
      provider: 'mailtrap',
      icon: 'mailtrap',
      documentationUrl: 'https://help.mailtrap.io/article/12-getting-started-guide',
      
      fields: [
        {
          key: 'host',
          displayName: 'SMTP Host',
          description: 'Mailtrap SMTP server',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'smtp.mailtrap.io',
          isRequired: true,
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'SMTP Port',
          description: 'Mailtrap SMTP port',
          valueType: 'number',
          inputType: 'select',
          defaultValue: '2525',
          isRequired: true,
          options: [
            { value: '2525', label: '2525', description: 'Default port' },
            { value: '587', label: '587', description: 'Alternative port' },
          ],
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'secure',
          displayName: 'Use SSL',
          description: 'Enable SSL encryption',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'username',
          displayName: 'Username',
          description: 'Mailtrap inbox username',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'password',
          displayName: 'Password',
          description: 'Mailtrap inbox password',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'fromName',
          displayName: 'From Name',
          description: 'Display name for test emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'AegisX Test',
          isRequired: true,
          group: 'sender',
          sortOrder: 6,
        },
        {
          key: 'fromEmail',
          displayName: 'From Email',
          description: 'Email address for test emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'test@aegisx.com',
          isRequired: true,
          group: 'sender',
          sortOrder: 7,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'sender', displayName: 'Sender Information', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: false,
        requiresSpecialSetup: false,
      },

      smtpFeatures: {
        supportsTLS: true,
        supportsOAuth2: false,
        requiresAppPassword: false,
        defaultPort: 2525,
        maxRecipientsPerEmail: 50,
        rateLimit: {
          perMinute: 100,
          perHour: 1000,
          perDay: 5000,
        },
      },

      version: '1.0.0',
      tags: ['mailtrap', 'testing', 'development', 'smtp'],
      isActive: true,
      sortOrder: 3,
    };
  }

  /**
   * Amazon SES Template
   */
  private createAmazonSESTemplate(): SMTPTemplateDefinition {
    return {
      category: 'smtp',
      templateName: 'amazon-ses',
      displayName: 'Amazon SES SMTP',
      description: 'Amazon Simple Email Service SMTP configuration',
      provider: 'amazon-ses',
      icon: 'aws',
      documentationUrl: 'https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html',
      
      fields: [
        {
          key: 'region',
          displayName: 'AWS Region',
          description: 'AWS region for SES service',
          valueType: 'string',
          inputType: 'select',
          defaultValue: 'us-east-1',
          isRequired: true,
          options: [
            { value: 'us-east-1', label: 'US East (N. Virginia)', description: 'email-smtp.us-east-1.amazonaws.com' },
            { value: 'us-west-2', label: 'US West (Oregon)', description: 'email-smtp.us-west-2.amazonaws.com' },
            { value: 'eu-west-1', label: 'Europe (Ireland)', description: 'email-smtp.eu-west-1.amazonaws.com' },
            { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', description: 'email-smtp.ap-southeast-1.amazonaws.com' },
          ],
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'host',
          displayName: 'SMTP Host',
          description: 'Amazon SES SMTP endpoint',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'email-smtp.us-east-1.amazonaws.com',
          isRequired: true,
          dependsOn: { field: 'region', value: ['us-east-1', 'us-west-2', 'eu-west-1'] },
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'port',
          displayName: 'SMTP Port',
          description: 'Amazon SES SMTP port',
          valueType: 'number',
          inputType: 'select',
          defaultValue: '587',
          isRequired: true,
          options: [
            { value: '587', label: '587 (TLS)', description: 'Recommended' },
            { value: '465', label: '465 (SSL)', description: 'SSL encrypted' },
            { value: '25', label: '25', description: 'Not recommended' },
          ],
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'secure',
          displayName: 'Use SSL',
          description: 'Enable SSL encryption',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'connection',
          sortOrder: 4,
        },
        {
          key: 'username',
          displayName: 'SMTP Username',
          description: 'Amazon SES SMTP username',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          helpText: 'Generated in SES console under SMTP Settings',
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'password',
          displayName: 'SMTP Password',
          description: 'Amazon SES SMTP password',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          helpText: 'Generated in SES console (different from AWS secret key)',
          group: 'authentication',
          sortOrder: 6,
        },
        {
          key: 'fromName',
          displayName: 'From Name',
          description: 'Display name for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'AegisX System',
          isRequired: true,
          group: 'sender',
          sortOrder: 7,
        },
        {
          key: 'fromEmail',
          displayName: 'From Email',
          description: 'Verified email address in SES',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
          },
          helpText: 'Must be verified in Amazon SES',
          group: 'sender',
          sortOrder: 8,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'SMTP Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'sender', displayName: 'Sender Information', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: true,
      },

      smtpFeatures: {
        supportsTLS: true,
        supportsOAuth2: false,
        requiresAppPassword: false,
        defaultPort: 587,
        securePort: 465,
        maxRecipientsPerEmail: 50,
        rateLimit: {
          perMinute: 200,
          perHour: 3600,
          perDay: 50000,
        },
      },

      version: '1.0.0',
      tags: ['amazon', 'ses', 'aws', 'smtp', 'cloud'],
      isActive: true,
      sortOrder: 4,
    };
  }

  /**
   * Mailgun Template
   */
  private createMailgunTemplate(): SMTPTemplateDefinition {
    return {
      category: 'smtp',
      templateName: 'mailgun',
      displayName: 'Mailgun SMTP',
      description: 'Mailgun SMTP API for reliable email delivery',
      provider: 'mailgun',
      icon: 'mailgun',
      documentationUrl: 'https://documentation.mailgun.com/en/latest/user_manual.html#smtp',
      
      fields: [
        {
          key: 'host',
          displayName: 'SMTP Host',
          description: 'Mailgun SMTP server',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'smtp.mailgun.org',
          isRequired: true,
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'SMTP Port',
          description: 'Mailgun SMTP port',
          valueType: 'number',
          inputType: 'select',
          defaultValue: '587',
          isRequired: true,
          options: [
            { value: '587', label: '587 (TLS)', description: 'Recommended' },
            { value: '465', label: '465 (SSL)', description: 'SSL encrypted' },
          ],
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'secure',
          displayName: 'Use SSL',
          description: 'Enable SSL encryption',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'username',
          displayName: 'SMTP Username',
          description: 'Mailgun SMTP username',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          placeholder: 'postmaster@yourdomain.mailgun.org',
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'password',
          displayName: 'SMTP Password',
          description: 'Mailgun SMTP password',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          helpText: 'Found in Mailgun dashboard under Domain Settings',
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'fromName',
          displayName: 'From Name',
          description: 'Display name for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'AegisX System',
          isRequired: true,
          group: 'sender',
          sortOrder: 6,
        },
        {
          key: 'fromEmail',
          displayName: 'From Email',
          description: 'Email address from verified domain',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
          },
          group: 'sender',
          sortOrder: 7,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'sender', displayName: 'Sender Information', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: true,
      },

      smtpFeatures: {
        supportsTLS: true,
        supportsOAuth2: false,
        requiresAppPassword: false,
        defaultPort: 587,
        securePort: 465,
        maxRecipientsPerEmail: 1000,
        rateLimit: {
          perMinute: 300,
          perHour: 10000,
          perDay: 100000,
        },
      },

      version: '1.0.0',
      tags: ['mailgun', 'smtp', 'transactional'],
      isActive: true,
      sortOrder: 5,
    };
  }

  /**
   * Postmark Template
   */
  private createPostmarkTemplate(): SMTPTemplateDefinition {
    return {
      category: 'smtp',
      templateName: 'postmark',
      displayName: 'Postmark SMTP',
      description: 'Postmark SMTP for fast transactional email delivery',
      provider: 'postmark',
      icon: 'postmark',
      documentationUrl: 'https://postmarkapp.com/developer/user-guide/send-email-with-smtp',
      
      fields: [
        {
          key: 'host',
          displayName: 'SMTP Host',
          description: 'Postmark SMTP server',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'smtp.postmarkapp.com',
          isRequired: true,
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'SMTP Port',
          description: 'Postmark SMTP port',
          valueType: 'number',
          inputType: 'select',
          defaultValue: '587',
          isRequired: true,
          options: [
            { value: '587', label: '587 (TLS)', description: 'Recommended' },
            { value: '25', label: '25', description: 'Alternative' },
          ],
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'secure',
          displayName: 'Use SSL',
          description: 'Enable SSL encryption',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'username',
          displayName: 'SMTP Username',
          description: 'Postmark server token',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          helpText: 'Use your Postmark Server Token as username',
          placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'password',
          displayName: 'SMTP Password',
          description: 'Postmark server token (same as username)',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          helpText: 'Use the same Server Token as password',
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'fromName',
          displayName: 'From Name',
          description: 'Display name for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'AegisX System',
          isRequired: true,
          group: 'sender',
          sortOrder: 6,
        },
        {
          key: 'fromEmail',
          displayName: 'From Email',
          description: 'Verified sender signature email',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
          },
          helpText: 'Must be a verified sender signature in Postmark',
          group: 'sender',
          sortOrder: 7,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'sender', displayName: 'Sender Information', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: true,
      },

      smtpFeatures: {
        supportsTLS: true,
        supportsOAuth2: false,
        requiresAppPassword: false,
        defaultPort: 587,
        maxRecipientsPerEmail: 500,
        rateLimit: {
          perMinute: 300,
          perHour: 10000,
          perDay: 100000,
        },
      },

      version: '1.0.0',
      tags: ['postmark', 'smtp', 'transactional', 'fast'],
      isActive: true,
      sortOrder: 6,
    };
  }

  /**
   * Custom SMTP Template
   */
  private createCustomSMTPTemplate(): SMTPTemplateDefinition {
    return {
      category: 'smtp',
      templateName: 'custom',
      displayName: 'Custom SMTP',
      description: 'Custom SMTP server configuration for any provider',
      provider: 'custom',
      icon: 'server',
      
      fields: [
        {
          key: 'host',
          displayName: 'SMTP Host',
          description: 'SMTP server hostname or IP address',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          placeholder: 'smtp.yourprovider.com',
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'SMTP Port',
          description: 'SMTP server port number',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '587',
          isRequired: true,
          validationRules: {
            min: 1,
            max: 65535,
          },
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'secure',
          displayName: 'Use SSL',
          description: 'Enable SSL encryption (true for 465, false for 587)',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'requireAuth',
          displayName: 'Require Authentication',
          description: 'Does the SMTP server require authentication?',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'true',
          isRequired: true,
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'username',
          displayName: 'Username',
          description: 'SMTP authentication username',
          valueType: 'string',
          inputType: 'text',
          isRequired: false,
          dependsOn: { field: 'requireAuth', value: 'true' },
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'password',
          displayName: 'Password',
          description: 'SMTP authentication password',
          valueType: 'string',
          inputType: 'password',
          isRequired: false,
          isEncrypted: true,
          dependsOn: { field: 'requireAuth', value: 'true' },
          group: 'authentication',
          sortOrder: 6,
        },
        {
          key: 'fromName',
          displayName: 'From Name',
          description: 'Display name for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'AegisX System',
          isRequired: true,
          group: 'sender',
          sortOrder: 7,
        },
        {
          key: 'fromEmail',
          displayName: 'From Email',
          description: 'Email address for outgoing emails',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[\\w\\.-]+@[\\w\\.-]+\\.[a-zA-Z]{2,}$',
          },
          group: 'sender',
          sortOrder: 8,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'sender', displayName: 'Sender Information', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: false,
        requiresSpecialSetup: false,
      },

      smtpFeatures: {
        supportsTLS: true,
        supportsOAuth2: false,
        requiresAppPassword: false,
        defaultPort: 587,
      },

      version: '1.0.0',
      tags: ['custom', 'smtp', 'flexible'],
      isActive: true,
      sortOrder: 10,
    };
  }

  // === Database Templates ===

  /**
   * PostgreSQL Template
   */
  private createPostgreSQLTemplate(): DatabaseTemplateDefinition {
    return {
      category: 'database',
      templateName: 'postgresql',
      displayName: 'PostgreSQL',
      description: 'PostgreSQL database configuration',
      provider: 'postgresql',
      icon: 'postgresql',
      documentationUrl: 'https://www.postgresql.org/docs/',
      
      fields: [
        {
          key: 'host',
          displayName: 'Database Host',
          description: 'PostgreSQL server hostname',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'localhost',
          isRequired: true,
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'Database Port',
          description: 'PostgreSQL server port',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '5432',
          isRequired: true,
          validationRules: { min: 1, max: 65535 },
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'database',
          displayName: 'Database Name',
          description: 'PostgreSQL database name',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          placeholder: 'aegisx_db',
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'username',
          displayName: 'Username',
          description: 'Database username',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'postgres',
          isRequired: true,
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'password',
          displayName: 'Password',
          description: 'Database password',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'ssl',
          displayName: 'Enable SSL',
          description: 'Use SSL connection',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'security',
          sortOrder: 6,
        },
        {
          key: 'poolMin',
          displayName: 'Minimum Pool Size',
          description: 'Minimum number of connections in pool',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '2',
          isRequired: true,
          validationRules: { min: 1, max: 50 },
          group: 'performance',
          sortOrder: 7,
        },
        {
          key: 'poolMax',
          displayName: 'Maximum Pool Size',
          description: 'Maximum number of connections in pool',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '10',
          isRequired: true,
          validationRules: { min: 1, max: 100 },
          group: 'performance',
          sortOrder: 8,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'security', displayName: 'Security', sortOrder: 3 },
        { name: 'performance', displayName: 'Performance', sortOrder: 4 },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: false,
      },

      databaseFeatures: {
        supportsSSL: true,
        supportsConnectionPooling: true,
        defaultPort: 5432,
        maxConnections: 100,
        supportedVersions: ['12', '13', '14', '15', '16'],
      },

      version: '1.0.0',
      tags: ['postgresql', 'database', 'sql'],
      isActive: true,
      sortOrder: 1,
    };
  }

  /**
   * MySQL Template
   */
  private createMySQLTemplate(): DatabaseTemplateDefinition {
    return {
      category: 'database',
      templateName: 'mysql',
      displayName: 'MySQL',
      description: 'MySQL database configuration',
      provider: 'mysql',
      icon: 'mysql',
      documentationUrl: 'https://dev.mysql.com/doc/',
      
      fields: [
        {
          key: 'host',
          displayName: 'Database Host',
          description: 'MySQL server hostname',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'localhost',
          isRequired: true,
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'Database Port',
          description: 'MySQL server port',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '3306',
          isRequired: true,
          validationRules: { min: 1, max: 65535 },
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'database',
          displayName: 'Database Name',
          description: 'MySQL database name',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          placeholder: 'aegisx_db',
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'username',
          displayName: 'Username',
          description: 'Database username',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'root',
          isRequired: true,
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'password',
          displayName: 'Password',
          description: 'Database password',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'ssl',
          displayName: 'Enable SSL',
          description: 'Use SSL connection',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'security',
          sortOrder: 6,
        },
        {
          key: 'charset',
          displayName: 'Character Set',
          description: 'MySQL character set',
          valueType: 'string',
          inputType: 'select',
          defaultValue: 'utf8mb4',
          isRequired: true,
          options: [
            { value: 'utf8mb4', label: 'utf8mb4', description: 'Recommended for full UTF-8 support' },
            { value: 'utf8', label: 'utf8', description: 'Standard UTF-8' },
            { value: 'latin1', label: 'latin1', description: 'Latin character set' },
          ],
          group: 'settings',
          sortOrder: 7,
        },
        {
          key: 'timezone',
          displayName: 'Timezone',
          description: 'MySQL timezone setting',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'UTC',
          isRequired: true,
          group: 'settings',
          sortOrder: 8,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'security', displayName: 'Security', sortOrder: 3 },
        { name: 'settings', displayName: 'Database Settings', sortOrder: 4 },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: false,
      },

      databaseFeatures: {
        supportsSSL: true,
        supportsConnectionPooling: true,
        defaultPort: 3306,
        maxConnections: 151,
        supportedVersions: ['5.7', '8.0'],
      },

      version: '1.0.0',
      tags: ['mysql', 'database', 'sql'],
      isActive: true,
      sortOrder: 2,
    };
  }

  /**
   * MongoDB Template
   */
  private createMongoDBTemplate(): DatabaseTemplateDefinition {
    return {
      category: 'database',
      templateName: 'mongodb',
      displayName: 'MongoDB',
      description: 'MongoDB database configuration',
      provider: 'mongodb',
      icon: 'mongodb',
      documentationUrl: 'https://docs.mongodb.com/',
      
      fields: [
        {
          key: 'uri',
          displayName: 'Connection URI',
          description: 'MongoDB connection string',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'mongodb://localhost:27017/aegisx_db',
          isRequired: true,
          placeholder: 'mongodb://username:password@host:port/database',
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'host',
          displayName: 'Database Host',
          description: 'MongoDB server hostname',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'localhost',
          isRequired: true,
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'port',
          displayName: 'Database Port',
          description: 'MongoDB server port',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '27017',
          isRequired: true,
          validationRules: { min: 1, max: 65535 },
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'database',
          displayName: 'Database Name',
          description: 'MongoDB database name',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          placeholder: 'aegisx_db',
          group: 'connection',
          sortOrder: 4,
        },
        {
          key: 'username',
          displayName: 'Username',
          description: 'Database username (optional)',
          valueType: 'string',
          inputType: 'text',
          isRequired: false,
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'password',
          displayName: 'Password',
          description: 'Database password (optional)',
          valueType: 'string',
          inputType: 'password',
          isRequired: false,
          isEncrypted: true,
          group: 'authentication',
          sortOrder: 6,
        },
        {
          key: 'authSource',
          displayName: 'Auth Source',
          description: 'Authentication database',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'admin',
          isRequired: false,
          group: 'authentication',
          sortOrder: 7,
        },
        {
          key: 'ssl',
          displayName: 'Enable SSL',
          description: 'Use SSL connection',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'security',
          sortOrder: 8,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'security', displayName: 'Security', sortOrder: 3 },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: false,
      },

      databaseFeatures: {
        supportsSSL: true,
        supportsConnectionPooling: true,
        defaultPort: 27017,
        maxConnections: 100,
        supportedVersions: ['4.4', '5.0', '6.0'],
      },

      version: '1.0.0',
      tags: ['mongodb', 'database', 'nosql'],
      isActive: true,
      sortOrder: 3,
    };
  }

  // === Storage Templates ===

  /**
   * Local Storage Template
   */
  private createLocalStorageTemplate(): StorageTemplateDefinition {
    return {
      category: 'storage',
      templateName: 'local',
      displayName: 'Local File System',
      description: 'Local file system storage configuration',
      provider: 'local',
      icon: 'folder',
      
      fields: [
        {
          key: 'basePath',
          displayName: 'Base Path',
          description: 'Base directory for file storage',
          valueType: 'string',
          inputType: 'text',
          defaultValue: './storage',
          isRequired: true,
          placeholder: '/var/www/storage',
          group: 'storage',
          sortOrder: 1,
        },
        {
          key: 'maxFileSize',
          displayName: 'Max File Size (MB)',
          description: 'Maximum file size in megabytes',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '100',
          isRequired: true,
          validationRules: { min: 1, max: 1024 },
          group: 'limits',
          sortOrder: 2,
        },
        {
          key: 'maxFiles',
          displayName: 'Max Files',
          description: 'Maximum number of files',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '10000',
          isRequired: true,
          validationRules: { min: 1 },
          group: 'limits',
          sortOrder: 3,
        },
        {
          key: 'allowedExtensions',
          displayName: 'Allowed Extensions',
          description: 'Comma-separated list of allowed file extensions',
          valueType: 'string',
          inputType: 'textarea',
          defaultValue: 'jpg,jpeg,png,gif,pdf,doc,docx,txt',
          isRequired: false,
          placeholder: 'jpg,jpeg,png,pdf,doc,docx',
          group: 'security',
          sortOrder: 4,
        },
        {
          key: 'enableEncryption',
          displayName: 'Enable Encryption',
          description: 'Encrypt files at rest',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'security',
          sortOrder: 5,
        },
      ],

      groups: [
        { name: 'storage', displayName: 'Storage Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'limits', displayName: 'Limits', sortOrder: 2, defaultExpanded: true },
        { name: 'security', displayName: 'Security', sortOrder: 3 },
      ],

      features: {
        testConnection: false,
        hasAuthentication: false,
        supportsBulkOperation: true,
        requiresSpecialSetup: false,
      },

      storageFeatures: {
        supportsEncryption: true,
        supportsVersioning: false,
        maxFileSize: 1024,
        supportedFileTypes: ['*'],
        hasCDN: false,
      },

      version: '1.0.0',
      tags: ['local', 'filesystem', 'storage'],
      isActive: true,
      sortOrder: 1,
    };
  }

  /**
   * MinIO Template
   */
  private createMinIOTemplate(): StorageTemplateDefinition {
    return {
      category: 'storage',
      templateName: 'minio',
      displayName: 'MinIO Object Storage',
      description: 'MinIO S3-compatible object storage configuration',
      provider: 'minio',
      icon: 'minio',
      documentationUrl: 'https://docs.min.io/',
      
      fields: [
        {
          key: 'endpoint',
          displayName: 'Endpoint',
          description: 'MinIO server endpoint',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'localhost',
          isRequired: true,
          placeholder: 'minio.yourdomain.com',
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'port',
          displayName: 'Port',
          description: 'MinIO server port',
          valueType: 'number',
          inputType: 'number',
          defaultValue: '9000',
          isRequired: true,
          validationRules: { min: 1, max: 65535 },
          group: 'connection',
          sortOrder: 2,
        },
        {
          key: 'useSSL',
          displayName: 'Use SSL',
          description: 'Enable SSL/TLS connection',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'connection',
          sortOrder: 3,
        },
        {
          key: 'accessKey',
          displayName: 'Access Key',
          description: 'MinIO access key',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          placeholder: 'minioadmin',
          group: 'authentication',
          sortOrder: 4,
        },
        {
          key: 'secretKey',
          displayName: 'Secret Key',
          description: 'MinIO secret key',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          placeholder: 'minioadmin',
          group: 'authentication',
          sortOrder: 5,
        },
        {
          key: 'bucket',
          displayName: 'Bucket Name',
          description: 'Default bucket for file storage',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'aegisx-storage',
          isRequired: true,
          validationRules: {
            pattern: '^[a-z0-9][a-z0-9-]*[a-z0-9]$',
            minLength: 3,
            maxLength: 63,
          },
          helpText: 'Bucket names must be 3-63 characters, lowercase letters, numbers, and hyphens only',
          group: 'storage',
          sortOrder: 6,
        },
        {
          key: 'region',
          displayName: 'Region',
          description: 'MinIO region (optional)',
          valueType: 'string',
          inputType: 'text',
          defaultValue: 'us-east-1',
          isRequired: false,
          group: 'storage',
          sortOrder: 7,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'Authentication', sortOrder: 2, defaultExpanded: true },
        { name: 'storage', displayName: 'Storage Settings', sortOrder: 3, defaultExpanded: true },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: true,
      },

      storageFeatures: {
        supportsEncryption: true,
        supportsVersioning: true,
        maxFileSize: 5000,
        supportedFileTypes: ['*'],
        hasCDN: false,
      },

      version: '1.0.0',
      tags: ['minio', 's3', 'object-storage', 'compatible'],
      isActive: true,
      sortOrder: 2,
    };
  }

  /**
   * AWS S3 Template
   */
  private createAWSS3Template(): StorageTemplateDefinition {
    return {
      category: 'storage',
      templateName: 'aws-s3',
      displayName: 'Amazon S3',
      description: 'Amazon S3 object storage configuration',
      provider: 'aws-s3',
      icon: 'aws',
      documentationUrl: 'https://docs.aws.amazon.com/s3/',
      
      fields: [
        {
          key: 'region',
          displayName: 'AWS Region',
          description: 'AWS region for S3 bucket',
          valueType: 'string',
          inputType: 'select',
          defaultValue: 'us-east-1',
          isRequired: true,
          options: [
            { value: 'us-east-1', label: 'US East (N. Virginia)' },
            { value: 'us-west-2', label: 'US West (Oregon)' },
            { value: 'eu-west-1', label: 'Europe (Ireland)' },
            { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
            { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
          ],
          group: 'connection',
          sortOrder: 1,
        },
        {
          key: 'accessKeyId',
          displayName: 'Access Key ID',
          description: 'AWS access key ID',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          placeholder: 'AKIAIOSFODNN7EXAMPLE',
          group: 'authentication',
          sortOrder: 2,
        },
        {
          key: 'secretAccessKey',
          displayName: 'Secret Access Key',
          description: 'AWS secret access key',
          valueType: 'string',
          inputType: 'password',
          isRequired: true,
          isEncrypted: true,
          placeholder: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          group: 'authentication',
          sortOrder: 3,
        },
        {
          key: 'bucket',
          displayName: 'Bucket Name',
          description: 'S3 bucket name',
          valueType: 'string',
          inputType: 'text',
          isRequired: true,
          validationRules: {
            pattern: '^[a-z0-9][a-z0-9.-]*[a-z0-9]$',
            minLength: 3,
            maxLength: 63,
          },
          helpText: 'Bucket must be globally unique and follow S3 naming rules',
          group: 'storage',
          sortOrder: 4,
        },
        {
          key: 'pathPrefix',
          displayName: 'Path Prefix',
          description: 'Optional prefix for all object keys',
          valueType: 'string',
          inputType: 'text',
          isRequired: false,
          placeholder: 'uploads/',
          group: 'storage',
          sortOrder: 5,
        },
        {
          key: 'enableVersioning',
          displayName: 'Enable Versioning',
          description: 'Enable S3 object versioning',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'false',
          isRequired: true,
          group: 'features',
          sortOrder: 6,
        },
        {
          key: 'serverSideEncryption',
          displayName: 'Server-Side Encryption',
          description: 'Enable server-side encryption',
          valueType: 'boolean',
          inputType: 'checkbox',
          defaultValue: 'true',
          isRequired: true,
          group: 'security',
          sortOrder: 7,
        },
        {
          key: 'encryptionType',
          displayName: 'Encryption Type',
          description: 'Type of server-side encryption',
          valueType: 'string',
          inputType: 'select',
          defaultValue: 'AES256',
          isRequired: false,
          options: [
            { value: 'AES256', label: 'AES-256', description: 'S3 managed encryption' },
            { value: 'aws:kms', label: 'AWS KMS', description: 'KMS managed encryption' },
          ],
          dependsOn: { field: 'serverSideEncryption', value: 'true' },
          group: 'security',
          sortOrder: 8,
        },
      ],

      groups: [
        { name: 'connection', displayName: 'Connection Settings', sortOrder: 1, defaultExpanded: true },
        { name: 'authentication', displayName: 'AWS Credentials', sortOrder: 2, defaultExpanded: true },
        { name: 'storage', displayName: 'Storage Settings', sortOrder: 3, defaultExpanded: true },
        { name: 'features', displayName: 'Features', sortOrder: 4 },
        { name: 'security', displayName: 'Security', sortOrder: 5 },
      ],

      features: {
        testConnection: true,
        hasAuthentication: true,
        supportsBulkOperation: true,
        requiresSpecialSetup: true,
      },

      storageFeatures: {
        supportsEncryption: true,
        supportsVersioning: true,
        supportedRegions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
        maxFileSize: 5000000,
        supportedFileTypes: ['*'],
        hasCDN: true,
      },

      version: '1.0.0',
      tags: ['aws', 's3', 'cloud', 'object-storage'],
      isActive: true,
      sortOrder: 3,
    };
  }
}