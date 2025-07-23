import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigTemplateService } from '../services/config-template.service';
import { ConfigurationCategoryType } from '../types/config-template.types';

export class ConfigTemplateController {
  private templateService: ConfigTemplateService;

  constructor(templateService: ConfigTemplateService) {
    this.templateService = templateService;
  }

  /**
   * ดึง templates ทั้งหมด
   * GET /api/v1/config/templates
   */
  async getAllTemplates(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const templates = this.templateService.getAllTemplates();

      reply.send({
        success: true,
        data: templates,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get all templates:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get templates',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง templates ตาม category
   * GET /api/v1/config/templates/:category
   */
  async getTemplatesByCategory(
    request: FastifyRequest<{ 
      Params: { category: ConfigurationCategoryType };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { category } = request.params;
      const templates = this.templateService.getTemplatesByCategory(category);

      reply.send({
        success: true,
        data: {
          category,
          templates,
          count: templates.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get templates by category:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get templates by category',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง template เฉพาะ
   * GET /api/v1/config/templates/:category/:templateName
   */
  async getTemplate(
    request: FastifyRequest<{ 
      Params: { 
        category: ConfigurationCategoryType;
        templateName: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { category, templateName } = request.params;
      const template = this.templateService.getTemplate(category, templateName);

      if (!template) {
        reply.code(404).send({
          error: 'Not Found',
          message: `Template '${templateName}' not found in category '${category}'`,
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      reply.send({
        success: true,
        data: template,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get template:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get template',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง SMTP providers
   * GET /api/v1/config/templates/smtp/providers
   */
  async getSMTPProviders(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const smtpTemplates = this.templateService.getTemplatesByCategory('smtp');
      
      const providers = smtpTemplates.map(template => ({
        name: template.templateName,
        displayName: template.displayName,
        description: template.description,
        icon: template.icon,
        provider: (template as any).provider,
        features: template.features,
        smtpFeatures: (template as any).smtpFeatures,
        tags: template.tags,
        documentationUrl: template.documentationUrl,
        popularity: this.calculatePopularity(template.templateName),
        difficulty: this.calculateDifficulty(template),
      }));

      // Sort by popularity and difficulty
      providers.sort((a, b) => {
        if (a.popularity !== b.popularity) {
          return b.popularity - a.popularity; // Higher popularity first
        }
        return a.difficulty - b.difficulty; // Easier first
      });

      reply.send({
        success: true,
        data: {
          category: 'smtp',
          providers,
          count: providers.length,
          recommended: providers.filter(p => p.popularity >= 8),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get SMTP providers:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get SMTP providers',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง Database providers
   * GET /api/v1/config/templates/database/providers
   */
  async getDatabaseProviders(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const dbTemplates = this.templateService.getTemplatesByCategory('database');
      
      const providers = dbTemplates.map(template => ({
        name: template.templateName,
        displayName: template.displayName,
        description: template.description,
        icon: template.icon,
        provider: (template as any).provider,
        features: template.features,
        databaseFeatures: (template as any).databaseFeatures,
        tags: template.tags,
        documentationUrl: template.documentationUrl,
        popularity: this.calculatePopularity(template.templateName),
        difficulty: this.calculateDifficulty(template),
      }));

      providers.sort((a, b) => {
        if (a.popularity !== b.popularity) {
          return b.popularity - a.popularity;
        }
        return a.difficulty - b.difficulty;
      });

      reply.send({
        success: true,
        data: {
          category: 'database',
          providers,
          count: providers.length,
          recommended: providers.filter(p => p.popularity >= 8),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get database providers:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get database providers',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง Storage providers
   * GET /api/v1/config/templates/storage/providers
   */
  async getStorageProviders(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const storageTemplates = this.templateService.getTemplatesByCategory('storage');
      
      const providers = storageTemplates.map(template => ({
        name: template.templateName,
        displayName: template.displayName,
        description: template.description,
        icon: template.icon,
        provider: (template as any).provider,
        features: template.features,
        storageFeatures: (template as any).storageFeatures,
        tags: template.tags,
        documentationUrl: template.documentationUrl,
        popularity: this.calculatePopularity(template.templateName),
        difficulty: this.calculateDifficulty(template),
      }));

      providers.sort((a, b) => {
        if (a.popularity !== b.popularity) {
          return b.popularity - a.popularity;
        }
        return a.difficulty - b.difficulty;
      });

      reply.send({
        success: true,
        data: {
          category: 'storage',
          providers,
          count: providers.length,
          recommended: providers.filter(p => p.popularity >= 8),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get storage providers:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get storage providers',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * สร้าง configuration instance จาก template
   * POST /api/v1/config/templates/:category/:templateName/create
   */
  async createConfigurationFromTemplate(
    request: FastifyRequest<{ 
      Params: { 
        category: ConfigurationCategoryType;
        templateName: string;
      };
      Body: {
        instanceName: string;
        environment: 'development' | 'production' | 'staging' | 'test';
        values: Record<string, string>;
        description?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { category, templateName } = request.params;
      const { instanceName, environment, values, description } = request.body;
      const userId = (request.user as any)?.id;

      // ดึง template
      const template = this.templateService.getTemplate(category, templateName);
      if (!template) {
        reply.code(404).send({
          error: 'Not Found',
          message: `Template '${templateName}' not found in category '${category}'`,
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate values against template fields
      const validationErrors = this.validateTemplateValues(template, values);
      if (validationErrors.length > 0) {
        reply.code(400).send({
          error: 'Bad Request',
          message: 'Template values validation failed',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: request.url,
          details: {
            errors: validationErrors,
          },
        });
        return;
      }

      // สร้าง configuration entries
      const configService = (request.server as any).configService;
      if (!configService) {
        reply.code(503).send({
          error: 'Service Unavailable',
          message: 'Configuration service is not available',
          statusCode: 503,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const createdConfigs = [];
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      for (const field of template.fields) {
        const value = values[field.key] || field.defaultValue;
        if (value !== undefined) {
          try {
            const config = await configService.createConfiguration({
              category,
              configKey: field.key,
              configValue: value,
              valueType: field.valueType,
              isEncrypted: field.isEncrypted || false,
              environment,
              changeReason: `Created from template '${templateName}' (${instanceName})`,
            }, { userId, ipAddress, userAgent });

            createdConfigs.push(config);
          } catch (error) {
            // If creation fails, clean up already created configs
            for (const createdConfig of createdConfigs) {
              try {
                await configService.deleteConfiguration(createdConfig.id, {
                  userId,
                  ipAddress,
                  userAgent,
                  changeReason: 'Cleanup after failed template creation',
                });
              } catch (cleanupError) {
                request.log.error('Failed to cleanup configuration during rollback:', cleanupError);
              }
            }
            throw error;
          }
        }
      }

      reply.code(201).send({
        success: true,
        message: `Configuration created successfully from template '${templateName}'`,
        data: {
          instanceName,
          category,
          templateName,
          environment,
          description,
          configsCreated: createdConfigs.length,
          configs: createdConfigs,
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      request.log.error('Failed to create configuration from template:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to create configuration from template',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ทดสอบ template configuration
   * POST /api/v1/config/templates/:category/:templateName/test
   */
  async testTemplateConfiguration(
    request: FastifyRequest<{ 
      Params: { 
        category: ConfigurationCategoryType;
        templateName: string;
      };
      Body: {
        values: Record<string, string>;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { category, templateName } = request.params;
      const { values } = request.body;

      // ดึง template
      const template = this.templateService.getTemplate(category, templateName);
      if (!template) {
        reply.code(404).send({
          error: 'Not Found',
          message: `Template '${templateName}' not found in category '${category}'`,
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      // Validate values
      const validationErrors = this.validateTemplateValues(template, values);
      if (validationErrors.length > 0) {
        reply.send({
          success: false,
          message: 'Validation failed',
          data: {
            valid: false,
            errors: validationErrors,
            warnings: [],
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Test connection if supported
      let connectionTest = null;
      if (template.features?.testConnection) {
        connectionTest = await this.testConnection(category, templateName, values);
      }

      reply.send({
        success: true,
        message: 'Template configuration test completed',
        data: {
          valid: validationErrors.length === 0,
          errors: validationErrors,
          warnings: [],
          connectionTest,
          template: {
            name: template.templateName,
            displayName: template.displayName,
            category: template.category,
          },
        },
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      request.log.error('Failed to test template configuration:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to test template configuration',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * คำนวณความนิยมของ template
   */
  private calculatePopularity(templateName: string): number {
    const popularityMap: Record<string, number> = {
      // SMTP
      'gmail': 9,
      'sendgrid': 8,
      'amazon-ses': 7,
      'mailgun': 6,
      'postmark': 5,
      'mailtrap': 4,
      'custom': 3,
      // Database
      'postgresql': 9,
      'mysql': 8,
      'mongodb': 7,
      // Storage
      'local': 8,
      'aws-s3': 9,
      'minio': 6,
    };

    return popularityMap[templateName] || 5;
  }

  /**
   * คำนวณความยากในการตั้งค่า
   */
  private calculateDifficulty(template: any): number {
    let difficulty = 1;
    
    if (template.features?.requiresSpecialSetup) difficulty += 2;
    if (template.features?.hasAuthentication) difficulty += 1;
    if (template.fields?.length > 8) difficulty += 1;
    
    return Math.min(difficulty, 5); // Scale 1-5
  }

  /**
   * Validate template values
   */
  private validateTemplateValues(template: any, values: Record<string, string>): Array<{
    field: string;
    message: string;
    code: string;
  }> {
    const errors: Array<{ field: string; message: string; code: string }> = [];

    for (const field of template.fields) {
      const value = values[field.key];

      // Check required fields
      if (field.isRequired && (!value || value.trim() === '')) {
        errors.push({
          field: field.key,
          message: `${field.displayName} is required`,
          code: 'REQUIRED_FIELD_MISSING',
        });
        continue;
      }

      if (value) {
        // Validate pattern
        if (field.validationRules?.pattern) {
          const regex = new RegExp(field.validationRules.pattern);
          if (!regex.test(value)) {
            errors.push({
              field: field.key,
              message: `${field.displayName} format is invalid`,
              code: 'INVALID_FORMAT',
            });
          }
        }

        // Validate length
        if (field.validationRules?.minLength && value.length < field.validationRules.minLength) {
          errors.push({
            field: field.key,
            message: `${field.displayName} must be at least ${field.validationRules.minLength} characters`,
            code: 'TOO_SHORT',
          });
        }

        if (field.validationRules?.maxLength && value.length > field.validationRules.maxLength) {
          errors.push({
            field: field.key,
            message: `${field.displayName} must be no more than ${field.validationRules.maxLength} characters`,
            code: 'TOO_LONG',
          });
        }

        // Validate number range
        if (field.valueType === 'number') {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            errors.push({
              field: field.key,
              message: `${field.displayName} must be a valid number`,
              code: 'INVALID_NUMBER',
            });
          } else {
            if (field.validationRules?.min !== undefined && numValue < field.validationRules.min) {
              errors.push({
                field: field.key,
                message: `${field.displayName} must be at least ${field.validationRules.min}`,
                code: 'TOO_SMALL',
              });
            }

            if (field.validationRules?.max !== undefined && numValue > field.validationRules.max) {
              errors.push({
                field: field.key,
                message: `${field.displayName} must be no more than ${field.validationRules.max}`,
                code: 'TOO_LARGE',
              });
            }
          }
        }

        // Validate options
        if (field.options && field.options.length > 0) {
          const validOptions = field.options.map((opt: any) => opt.value);
          if (!validOptions.includes(value)) {
            errors.push({
              field: field.key,
              message: `${field.displayName} must be one of: ${validOptions.join(', ')}`,
              code: 'INVALID_OPTION',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Test connection for template (mock implementation)
   */
  private async testConnection(
    category: ConfigurationCategoryType,
    templateName: string,
    values: Record<string, string>
  ): Promise<{
    success: boolean;
    message: string;
    responseTime?: number;
    details?: any;
  }> {
    const startTime = Date.now();

    try {
      // Mock connection test based on category
      switch (category) {
        case 'smtp':
          return await this.testSMTPConnection(values);
        case 'database':
          return await this.testDatabaseConnection(values);
        case 'storage':
          return await this.testStorageConnection(values);
        default:
          return {
            success: true,
            message: 'Connection test not implemented for this category',
            responseTime: Date.now() - startTime,
          };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Test SMTP connection (mock)
   */
  private async testSMTPConnection(values: Record<string, string>): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Basic validation
    if (!values.host || !values.port) {
      throw new Error('SMTP host and port are required');
    }

    // Mock success with 90% chance
    if (Math.random() < 0.9) {
      return {
        success: true,
        message: 'SMTP connection test successful',
        details: {
          host: values.host,
          port: parseInt(values.port),
          secure: values.secure === 'true',
          authenticated: !!(values.username && values.password),
        },
      };
    } else {
      throw new Error('SMTP connection failed: Connection timeout');
    }
  }

  /**
   * Test database connection (mock)
   */
  private async testDatabaseConnection(values: Record<string, string>): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1500));

    if (!values.host || !values.database) {
      throw new Error('Database host and database name are required');
    }

    if (Math.random() < 0.85) {
      return {
        success: true,
        message: 'Database connection test successful',
        details: {
          host: values.host,
          port: parseInt(values.port || '5432'),
          database: values.database,
          ssl: values.ssl === 'true',
        },
      };
    } else {
      throw new Error('Database connection failed: Authentication failed');
    }
  }

  /**
   * Test storage connection (mock)
   */
  private async testStorageConnection(values: Record<string, string>): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    if (values.endpoint && !values.accessKey) {
      throw new Error('Access credentials are required for remote storage');
    }

    if (Math.random() < 0.8) {
      return {
        success: true,
        message: 'Storage connection test successful',
        details: {
          provider: values.endpoint ? 'Remote' : 'Local',
          accessible: true,
          permissions: 'Read/Write',
        },
      };
    } else {
      throw new Error('Storage connection failed: Access denied');
    }
  }
}