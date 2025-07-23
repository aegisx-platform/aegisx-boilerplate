import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ConfigTemplateController } from '../controllers/config-template-controller';
import { ErrorResponseSchema, SuccessResponseSchema } from '../schemas/config.schemas';

export async function configTemplateRoutes(
  fastify: FastifyInstance,
  controller: ConfigTemplateController
): Promise<void> {

  // === Template Browse Routes ===

  // Get all templates
  fastify.get('/', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Get all configuration templates',
      description: 'Retrieve all available configuration templates organized by category',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getAllTemplates.bind(controller));

  // Get templates by category
  fastify.get('/:category', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Get templates by category',
      description: 'Retrieve all templates for a specific category',
      params: Type.Object({
        category: Type.Union([
          Type.Literal('smtp'),
          Type.Literal('database'),
          Type.Literal('redis'),
          Type.Literal('security'),
          Type.Literal('storage'),
          Type.Literal('notification'),
          Type.Literal('logging'),
          Type.Literal('queue'),
          Type.Literal('custom'),
        ]),
      }),
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getTemplatesByCategory.bind(controller));

  // Get specific template
  fastify.get('/:category/:templateName', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Get specific template',
      description: 'Retrieve a specific template with all its fields and configuration',
      params: Type.Object({
        category: Type.Union([
          Type.Literal('smtp'),
          Type.Literal('database'),
          Type.Literal('redis'),
          Type.Literal('security'),
          Type.Literal('storage'),
          Type.Literal('notification'),
          Type.Literal('logging'),
          Type.Literal('queue'),
          Type.Literal('custom'),
        ]),
        templateName: Type.String({ minLength: 1 }),
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getTemplate.bind(controller));

  // === Provider-Specific Routes ===

  // Get SMTP providers
  fastify.get('/smtp/providers', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Get SMTP providers',
      description: 'Get all available SMTP providers with features and recommendations',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getSMTPProviders.bind(controller));

  // Get database providers
  fastify.get('/database/providers', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Get database providers',
      description: 'Get all available database providers with features and recommendations',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getDatabaseProviders.bind(controller));

  // Get storage providers
  fastify.get('/storage/providers', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Get storage providers',
      description: 'Get all available storage providers with features and recommendations',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getStorageProviders.bind(controller));

  // === Template Operations ===

  // Create configuration from template
  fastify.post('/:category/:templateName/create', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Create configuration from template',
      description: 'Create a new configuration instance based on a template',
      params: Type.Object({
        category: Type.Union([
          Type.Literal('smtp'),
          Type.Literal('database'),
          Type.Literal('redis'),
          Type.Literal('security'),
          Type.Literal('storage'),
          Type.Literal('notification'),
          Type.Literal('logging'),
          Type.Literal('queue'),
          Type.Literal('custom'),
        ]),
        templateName: Type.String({ minLength: 1 }),
      }),
      body: Type.Object({
        instanceName: Type.String({ 
          minLength: 1, 
          maxLength: 100,
          description: 'Name for this configuration instance',
        }),
        environment: Type.Union([
          Type.Literal('development'),
          Type.Literal('production'),
          Type.Literal('staging'),
          Type.Literal('test'),
        ]),
        values: Type.Record(
          Type.String(),
          Type.String(),
          { 
            description: 'Configuration values as key-value pairs',
          }
        ),
        description: Type.Optional(Type.String({ 
          maxLength: 500,
          description: 'Optional description for this configuration instance',
        })),
      }),
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        503: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.createConfigurationFromTemplate.bind(controller));

  // Test template configuration
  fastify.post('/:category/:templateName/test', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Test template configuration',
      description: 'Test and validate a template configuration without creating it',
      params: Type.Object({
        category: Type.Union([
          Type.Literal('smtp'),
          Type.Literal('database'),
          Type.Literal('redis'),
          Type.Literal('security'),
          Type.Literal('storage'),
          Type.Literal('notification'),
          Type.Literal('logging'),
          Type.Literal('queue'),
          Type.Literal('custom'),
        ]),
        templateName: Type.String({ minLength: 1 }),
      }),
      body: Type.Object({
        values: Type.Record(
          Type.String(),
          Type.String(),
          { 
            description: 'Configuration values to test as key-value pairs',
          }
        ),
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.testTemplateConfiguration.bind(controller));

  // === Template Import/Export Routes ===

  // Export template
  fastify.get('/:category/:templateName/export', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Export template definition',
      description: 'Export a template definition as JSON for backup or sharing',
      params: Type.Object({
        category: Type.Union([
          Type.Literal('smtp'),
          Type.Literal('database'),
          Type.Literal('redis'),
          Type.Literal('security'),
          Type.Literal('storage'),
          Type.Literal('notification'),
          Type.Literal('logging'),
          Type.Literal('queue'),
          Type.Literal('custom'),
        ]),
        templateName: Type.String({ minLength: 1 }),
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, async (request: any, reply: any) => {
    try {
      const { category, templateName } = request.params;
      const templateService = (request.server as any).configTemplateService;
      
      if (!templateService) {
        reply.code(503).send({
          error: 'Service Unavailable',
          message: 'Template service is not available',
          statusCode: 503,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const template = templateService.getTemplate(category, templateName);
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

      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: (request.user as any)?.id,
        version: '1.0.0',
        template,
      };

      reply
        .header('Content-Type', 'application/json')
        .header('Content-Disposition', `attachment; filename="${category}-${templateName}-template.json"`)
        .send({
          success: true,
          data: exportData,
          timestamp: new Date().toISOString(),
        });

    } catch (error) {
      request.log.error('Failed to export template:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export template',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  });

  // === Template Documentation Routes ===

  // Get template documentation
  fastify.get('/:category/:templateName/docs', {
    schema: {
      tags: ['Configuration Templates'],
      summary: 'Get template documentation',
      description: 'Get detailed documentation and setup guide for a template',
      params: Type.Object({
        category: Type.Union([
          Type.Literal('smtp'),
          Type.Literal('database'),
          Type.Literal('redis'),
          Type.Literal('security'),
          Type.Literal('storage'),
          Type.Literal('notification'),
          Type.Literal('logging'),
          Type.Literal('queue'),
          Type.Literal('custom'),
        ]),
        templateName: Type.String({ minLength: 1 }),
      }),
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, async (request: any, reply: any) => {
    try {
      const { category, templateName } = request.params;
      const templateService = (request.server as any).configTemplateService;
      
      if (!templateService) {
        reply.code(503).send({
          error: 'Service Unavailable',
          message: 'Template service is not available',
          statusCode: 503,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      const template = templateService.getTemplate(category, templateName);
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

      // Generate documentation
      const documentation = {
        template: {
          name: template.templateName,
          displayName: template.displayName,
          description: template.description,
          category: template.category,
          version: template.version,
        },
        setup: {
          requirements: [],
          steps: [],
          troubleshooting: [],
        },
        fields: template.fields.map((field: any) => ({
          key: field.key,
          displayName: field.displayName,
          description: field.description,
          required: field.isRequired,
          type: field.valueType,
          inputType: field.inputType,
          defaultValue: field.defaultValue,
          validation: field.validationRules,
          helpText: field.helpText,
          example: generateFieldExample(field),
        })),
        examples: generateTemplateExamples(template),
        externalLinks: {
          documentation: template.documentationUrl,
          provider: getProviderWebsite(templateName),
        },
      };

      reply.send({
        success: true,
        data: documentation,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      request.log.error('Failed to get template documentation:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get template documentation',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  });

  // Helper functions for documentation
  function generateFieldExample(field: any): string {
    const examples: Record<string, string> = {
      host: 'smtp.example.com',
      port: '587',
      username: 'your-username',
      password: '********',
      fromEmail: 'noreply@yourdomain.com',
      fromName: 'Your Organization',
      database: 'your_database_name',
      bucket: 'your-bucket-name',
      accessKey: 'your-access-key',
      secretKey: '********',
    };

    return examples[field.key] || field.placeholder || field.defaultValue || '';
  }

  function generateTemplateExamples(template: any): any[] {
    const examples = [];

    if (template.category === 'smtp') {
      examples.push({
        name: 'Basic Setup',
        description: 'Minimal configuration for getting started',
        values: template.fields.reduce((acc: any, field: any) => {
          if (field.isRequired && field.defaultValue) {
            acc[field.key] = field.defaultValue;
          }
          return acc;
        }, {}),
      });
    }

    return examples;
  }

  function getProviderWebsite(templateName: string): string | undefined {
    const websites: Record<string, string> = {
      gmail: 'https://gmail.com',
      sendgrid: 'https://sendgrid.com',
      mailgun: 'https://mailgun.com',
      postmark: 'https://postmarkapp.com',
      'amazon-ses': 'https://aws.amazon.com/ses/',
      postgresql: 'https://postgresql.org',
      mysql: 'https://mysql.com',
      mongodb: 'https://mongodb.com',
      'aws-s3': 'https://aws.amazon.com/s3/',
      minio: 'https://min.io',
    };

    return websites[templateName];
  }
}