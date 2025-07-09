import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { TemplateEngineService } from '../shared/services/template-engine.service';
import { TemplateEngineConfig, TemplateData, TemplateOptions, DocumentFormat } from '../shared/types/template-engine.types';

declare module 'fastify' {
  interface FastifyInstance {
    templateEngine: TemplateEngineService;
  }
}

export interface TemplateEnginePluginOptions {
  config?: Partial<TemplateEngineConfig>;
  loadTemplatesOnStart?: boolean;
  enableRoutes?: boolean;
  enableMetrics?: boolean;
}

export default fp<TemplateEnginePluginOptions>(
  async function templateEnginePlugin(
    fastify: FastifyInstance,
    options: TemplateEnginePluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: TemplateEnginePluginOptions = {
      config: {
        defaultEngine: 'handlebars',
        enableCaching: true,
        cacheTimeout: 300000, // 5 minutes
        maxCacheSize: 100,
        templatesDirectory: './api/templates',
        enableMinification: true,
        autoEscape: true,
      },
      loadTemplatesOnStart: true,
      enableRoutes: true,
      enableMetrics: true,
    };

    const pluginOptions = { ...defaultOptions, ...options };

    // Create template engine service
    const templateEngine = new TemplateEngineService(fastify, pluginOptions.config);

    // Register the template engine with Fastify
    fastify.decorate('templateEngine', templateEngine);

    // Set up event listeners
    templateEngine.on('template-error', (event) => {
      fastify.log.error('Template rendering error:', {
        template: event.templateName,
        engine: event.engine,
        error: event.data?.error,
      });
    });

    templateEngine.on('metrics-updated', (event) => {
      fastify.log.debug('Template metrics updated:', event.data);
    });

    templateEngine.on('template-cached', (event) => {
      fastify.log.debug('Template cached:', {
        template: event.data?.templateName,
        size: event.data?.size,
      });
    });

    // Load templates from directory if enabled
    if (pluginOptions.loadTemplatesOnStart) {
      try {
        await templateEngine.loadTemplatesFromDirectory();
        fastify.log.info('Templates loaded from directory');
      } catch (error) {
        fastify.log.warn('Failed to load templates from directory:', error);
      }
    }

    // Add management routes if enabled
    if (pluginOptions.enableRoutes) {
      // Get all templates
      fastify.get('/api/templates', async (request, reply) => {
        try {
          const templates = templateEngine.getTemplateNames();
          return reply.send({
            templates: templates.map(name => {
              const template = templateEngine.getTemplate(name);
              return {
                name,
                category: (template as any)?.category,
                language: (template as any)?.language,
                version: (template as any)?.version,
              };
            }),
            total: templates.length,
          });
        } catch (error) {
          fastify.log.error('Failed to get templates:', error);
          return reply.status(500).send({
            error: 'Failed to get templates',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get specific template details
      fastify.get('/api/templates/:name', async (request, reply) => {
        try {
          const { name } = request.params as { name: string };
          const template = templateEngine.getTemplate(name);
          
          if (!template) {
            return reply.status(404).send({
              error: 'Template not found',
              message: `Template '${name}' does not exist`,
            });
          }

          return reply.send({ template });
        } catch (error) {
          fastify.log.error('Failed to get template:', error);
          return reply.status(500).send({
            error: 'Failed to get template',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Render template
      fastify.post('/api/templates/:name/render', async (request, reply) => {
        try {
          const { name } = request.params as { name: string };
          const { data, options = {} } = request.body as {
            data: TemplateData;
            options?: TemplateOptions;
          };

          const result = await templateEngine.render(name, data, options);
          
          return reply.send({
            success: true,
            result: {
              html: result.html,
              metadata: result.metadata,
            },
          });
        } catch (error) {
          fastify.log.error('Template rendering failed:', error);
          return reply.status(500).send({
            error: 'Template rendering failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Render email template
      fastify.post('/api/templates/:name/render-email', async (request, reply) => {
        try {
          const { name } = request.params as { name: string };
          const { data, options = {} } = request.body as {
            data: TemplateData;
            options?: TemplateOptions;
          };

          const result = await templateEngine.renderEmail(name, data, options);
          
          return reply.send({
            success: true,
            email: result,
          });
        } catch (error) {
          fastify.log.error('Email template rendering failed:', error);
          return reply.status(500).send({
            error: 'Email template rendering failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Render document template
      fastify.post('/api/templates/:name/render-document', async (request, reply) => {
        try {
          const { name } = request.params as { name: string };
          const { data, format = 'html', options = {} } = request.body as {
            data: TemplateData;
            format?: DocumentFormat;
            options?: TemplateOptions;
          };

          const result = await templateEngine.renderDocument(name, data, format, options);
          
          return reply.send({
            success: true,
            document: {
              content: result.html,
              format,
              metadata: result.metadata,
            },
          });
        } catch (error) {
          fastify.log.error('Document template rendering failed:', error);
          return reply.status(500).send({
            error: 'Document template rendering failed',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get template metrics
      fastify.get('/api/templates/metrics', async (request, reply) => {
        try {
          const metrics = templateEngine.getMetrics();
          return reply.send({ metrics });
        } catch (error) {
          fastify.log.error('Failed to get template metrics:', error);
          return reply.status(500).send({
            error: 'Failed to get template metrics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Get cache statistics
      fastify.get('/api/templates/cache/stats', async (request, reply) => {
        try {
          const stats = templateEngine.getCacheStats();
          return reply.send({ cache: stats });
        } catch (error) {
          fastify.log.error('Failed to get cache stats:', error);
          return reply.status(500).send({
            error: 'Failed to get cache stats',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Clear template cache
      fastify.delete('/api/templates/cache', async (request, reply) => {
        try {
          const query = request.query as any;
          const templateName = query?.template;
          
          templateEngine.clearTemplateCache(templateName);
          
          return reply.send({
            message: templateName 
              ? `Cache cleared for template '${templateName}'`
              : 'All template cache cleared',
          });
        } catch (error) {
          fastify.log.error('Failed to clear cache:', error);
          return reply.status(500).send({
            error: 'Failed to clear cache',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Clear metrics
      fastify.delete('/api/templates/metrics', async (request, reply) => {
        try {
          templateEngine.clearMetrics();
          return reply.send({ message: 'Template metrics cleared' });
        } catch (error) {
          fastify.log.error('Failed to clear metrics:', error);
          return reply.status(500).send({
            error: 'Failed to clear metrics',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Register new template
      fastify.post('/api/templates', async (request, reply) => {
        try {
          const template = request.body as any;
          
          if (!template.name || !template.htmlTemplate) {
            return reply.status(400).send({
              error: 'Invalid template',
              message: 'Template must have name and htmlTemplate',
            });
          }

          templateEngine.registerTemplate(template);
          
          return reply.status(201).send({
            message: `Template '${template.name}' registered successfully`,
            template: { name: template.name },
          });
        } catch (error) {
          fastify.log.error('Failed to register template:', error);
          return reply.status(500).send({
            error: 'Failed to register template',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Delete template
      fastify.delete('/api/templates/:name', async (request, reply) => {
        try {
          const { name } = request.params as { name: string };
          const removed = templateEngine.removeTemplate(name);
          
          if (!removed) {
            return reply.status(404).send({
              error: 'Template not found',
              message: `Template '${name}' does not exist`,
            });
          }

          return reply.send({
            message: `Template '${name}' removed successfully`,
          });
        } catch (error) {
          fastify.log.error('Failed to remove template:', error);
          return reply.status(500).send({
            error: 'Failed to remove template',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    }

    // Add utility methods to Fastify instance
    fastify.decorate('renderTemplate', async function(
      templateName: string,
      data: TemplateData,
      options?: TemplateOptions
    ) {
      return templateEngine.render(templateName, data, options || {});
    });

    fastify.decorate('renderEmail', async function(
      templateName: string,
      data: TemplateData,
      options?: TemplateOptions
    ) {
      return templateEngine.renderEmail(templateName, data, options || {});
    });

    fastify.decorate('renderDocument', async function(
      templateName: string,
      data: TemplateData,
      format?: DocumentFormat,
      options?: TemplateOptions
    ) {
      return templateEngine.renderDocument(templateName, data, format || 'html', options || {});
    });

    fastify.log.info('✅ Template Engine plugin registered successfully', {
      defaultEngine: pluginOptions.config?.defaultEngine,
      enableCaching: pluginOptions.config?.enableCaching,
      enableRoutes: pluginOptions.enableRoutes,
      templatesDirectory: pluginOptions.config?.templatesDirectory,
    });
  },
  {
    name: 'template-engine-plugin',
    dependencies: ['env-plugin'],
  }
);

// Extend FastifyInstance interface for template methods
declare module 'fastify' {
  interface FastifyInstance {
    renderTemplate: (templateName: string, data: TemplateData, options?: TemplateOptions) => Promise<any>;
    renderEmail: (templateName: string, data: TemplateData, options?: TemplateOptions) => Promise<any>;
    renderDocument: (templateName: string, data: TemplateData, format?: DocumentFormat, options?: TemplateOptions) => Promise<any>;
  }
}