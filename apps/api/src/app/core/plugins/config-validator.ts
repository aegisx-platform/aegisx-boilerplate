import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ConfigValidatorService } from '../shared/services/config-validator.service';
import { ConfigValidationResult, ValidationOptions } from '../shared/types/config-validator.types';

declare module 'fastify' {
  interface FastifyInstance {
    configValidator: ConfigValidatorService;
  }
}

export interface ConfigValidatorPluginOptions {
  validateOnStartup?: boolean;
  startupValidationOptions?: ValidationOptions;
  logResults?: boolean;
  exitOnValidationError?: boolean;
}

export default fp<ConfigValidatorPluginOptions>(
  async function configValidatorPlugin(
    fastify: FastifyInstance,
    options: ConfigValidatorPluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: ConfigValidatorPluginOptions = {
      validateOnStartup: true,
      startupValidationOptions: {
        validateConnections: true,
        includeWarnings: true,
        stopOnFirstError: false,
      },
      logResults: true,
      exitOnValidationError: process.env.NODE_ENV === 'production',
    };

    const pluginOptions = { ...defaultOptions, ...options };

    // Create config validator service
    const configValidator = new ConfigValidatorService(fastify);

    // Register the config validator with Fastify
    fastify.decorate('configValidator', configValidator);

    // Set up event listeners
    configValidator.on('validation-started', (event) => {
      fastify.log.info('Configuration validation started', event.data);
    });

    configValidator.on('validation-completed', (event) => {
      const result = event.data.result as ConfigValidationResult;
      if (pluginOptions.logResults) {
        if (result.valid) {
          fastify.log.info('Configuration validation completed successfully', {
            duration: result.duration,
            passed: result.summary.passed,
            warnings: result.summary.warnings,
          });
        } else {
          fastify.log.error('Configuration validation failed', {
            duration: result.duration,
            errors: result.summary.errors,
            warnings: result.summary.warnings,
          });
        }
      }
    });

    configValidator.on('validation-failed', (event) => {
      fastify.log.error('Configuration validation encountered an error', event.data);
    });

    // Validate configuration on startup if enabled
    if (pluginOptions.validateOnStartup) {
      try {
        const result = await configValidator.validateConfiguration(
          pluginOptions.startupValidationOptions
        );

        if (pluginOptions.logResults) {
          const report = configValidator.generateConfigurationReport();
          fastify.log.info('Configuration validation report:\n' + report);
        }

        if (!result.valid && pluginOptions.exitOnValidationError) {
          fastify.log.fatal('Configuration validation failed in production mode');
          process.exit(1);
        }

        if (result.warnings.length > 0) {
          fastify.log.warn('Configuration validation completed with warnings', {
            warnings: result.warnings,
          });
        }
      } catch (error) {
        fastify.log.error('Failed to validate configuration on startup:', error);
        if (pluginOptions.exitOnValidationError) {
          process.exit(1);
        }
      }
    }

    // Add validation routes
    fastify.get('/health/config', async (request, reply) => {
      try {
        const result = await configValidator.validateConfiguration({
          validateConnections: false,
          includeWarnings: false,
          severity: 'error',
        });

        return reply.status(result.valid ? 200 : 503).send({
          status: result.valid ? 'healthy' : 'unhealthy',
          timestamp: result.timestamp,
          duration: result.duration,
          summary: result.summary,
          errors: result.errors,
        });
      } catch (error) {
        fastify.log.error('Config health check error:', error);
        return reply.status(503).send({
          status: 'error',
          message: 'Configuration health check failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    fastify.get('/validate/config', async (request, reply) => {
      try {
        const query = request.query as any;
        const options: ValidationOptions = {
          validateConnections: query?.connections === 'true',
          includeWarnings: query?.warnings !== 'false',
          categories: query?.categories 
            ? (query.categories as string).split(',')
            : undefined,
        };

        const result = await configValidator.validateConfiguration(options);

        return reply.send({
          ...result,
          report: configValidator.generateConfigurationReport(),
        });
      } catch (error) {
        fastify.log.error('Config validation error:', error);
        return reply.status(500).send({
          error: 'Configuration validation failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    fastify.get('/config/metrics', async (request, reply) => {
      try {
        const metrics = configValidator.getEnvironmentMetrics();
        const categories = configValidator.getCategories();
        const lastValidation = configValidator.getLastValidationResult();

        return reply.send({
          environment: fastify.config.NODE_ENV,
          metrics,
          categories: categories.map(cat => ({
            name: cat.name,
            description: cat.description,
            enabled: cat.enabled,
            ruleCount: cat.rules.length,
          })),
          lastValidation: lastValidation ? {
            timestamp: lastValidation.timestamp,
            valid: lastValidation.valid,
            summary: lastValidation.summary,
          } : null,
        });
      } catch (error) {
        fastify.log.error('Config metrics error:', error);
        return reply.status(500).send({
          error: 'Failed to get configuration metrics',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    });

    // Add custom validation rules if needed
    fastify.addHook('onReady', async () => {
      // Add any application-specific validation rules here
      fastify.log.info('Configuration validator ready with validation categories:', {
        categories: configValidator.getCategories().map(cat => cat.name),
      });
    });

    fastify.log.info('✅ Config Validator plugin registered successfully');
  },
  {
    name: 'config-validator-plugin',
    dependencies: ['env-plugin', 'knex-plugin', 'redis-plugin'],
  }
);