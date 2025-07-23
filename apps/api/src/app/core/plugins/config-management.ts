import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ConfigService } from '../../domains/config-management/services/config-service';
import { ConfigHotReloadService } from '../../domains/config-management/services/config-hot-reload.service';
import { ConfigTemplateService } from '../../domains/config-management/services/config-template.service';
import { ConfigRepository } from '../../domains/config-management/repositories/config-repository';
import { ConfigHistoryRepository } from '../../domains/config-management/repositories/config-history-repository';
import { ConfigController } from '../../domains/config-management/controllers/config-controller';
import { ConfigTemplateController } from '../../domains/config-management/controllers/config-template-controller';

declare module 'fastify' {
  interface FastifyInstance {
    configService: ConfigService;
    configHotReloadService: ConfigHotReloadService;
    configTemplateService: ConfigTemplateService;
  }
}

export interface ConfigManagementPluginOptions {
  enableRoutes?: boolean;
  enableHotReload?: boolean;
  enableTemplates?: boolean;
  encryptionEnabled?: boolean;
}

export default fp<ConfigManagementPluginOptions>(
  async function configManagementPlugin(
    fastify: FastifyInstance,
    options: ConfigManagementPluginOptions = {}
  ) {
    // Wait for dependencies
    await fastify.after();

    const defaultOptions: ConfigManagementPluginOptions = {
      enableRoutes: false, // Routes handled by API layer instead
      enableHotReload: true,
      enableTemplates: true,
      encryptionEnabled: process.env.CONFIG_ENCRYPTION_ENABLED === 'true',
    };

    const pluginOptions = { ...defaultOptions, ...options };

    try {
      // ตรวจสอบ dependencies
      if (!fastify.knex) {
        throw new Error('Database connection (knex) is required for configuration management');
      }

      if (!fastify.eventBus && pluginOptions.enableHotReload) {
        fastify.log.warn('Event bus not available, hot reload will be disabled');
        pluginOptions.enableHotReload = false;
      }

      // สร้าง repository
      const configRepository = new ConfigRepository(fastify);

      // สร้าง services
      const configService = new ConfigService(
        fastify,
        {
          enableEncryption: pluginOptions.encryptionEnabled || false,
          enableCache: true,
          cacheTimeout: parseInt(process.env.CONFIG_CACHE_TTL || '300'), // 5 minutes
          enableAuditLog: true,
          enableHotReload: pluginOptions.enableHotReload || false,
          environment: (process.env.NODE_ENV as any) || 'development',
        }
      );

      const configHotReloadService = new ConfigHotReloadService(
        fastify,
        {
          enableAutoReload: pluginOptions.enableHotReload || false,
          reloadDebounceMs: parseInt(process.env.CONFIG_RELOAD_DEBOUNCE || '1000'),
          maxRetries: parseInt(process.env.CONFIG_RELOAD_RETRY_ATTEMPTS || '3'),
          retryDelayMs: parseInt(process.env.CONFIG_RELOAD_RETRY_DELAY || '5000'),
          enableHealthCheck: true,
          healthCheckIntervalMs: parseInt(process.env.CONFIG_HEALTH_CHECK_INTERVAL || '60000'),
        }
      );

      const configTemplateService = new ConfigTemplateService(fastify);

      // Register services with Fastify
      fastify.decorate('configService', configService);
      fastify.decorate('configHotReloadService', configHotReloadService);
      fastify.decorate('configTemplateService', configTemplateService);

      // เริ่มต้น hot reload service ถ้าเปิดใช้งาน
      // Hot reload service will auto-initialize when needed

      // ลงทะเบียน API routes ถ้าเปิดใช้งาน
      if (pluginOptions.enableRoutes) {
        const historyRepo = new ConfigHistoryRepository(fastify);
        const configController = new ConfigController(configService, historyRepo);
        
        // Configuration management routes
        await fastify.register(async function configRoutes(fastify) {
          // Configuration CRUD routes
          fastify.get('/config', configController.getConfigurationValues.bind(configController));
          fastify.get('/config/:category', configController.getConfigurationByCategory.bind(configController));
          fastify.get('/config/:id', configController.getConfigurationById.bind(configController));
          fastify.post('/config', configController.createConfiguration.bind(configController));
          fastify.put('/config/:id', configController.updateConfiguration.bind(configController));
          fastify.delete('/config/:id', configController.deleteConfiguration.bind(configController));

          // Configuration history
          fastify.get('/config/:id/history', configController.getConfigurationHistory.bind(configController));

          // Hot reload controls
          if (pluginOptions.enableHotReload) {
            fastify.get('/config/reload/status', configController.getReloadStats.bind(configController));
          }

        }, { prefix: '/api/v1' });

        // Configuration template routes ถ้าเปิดใช้งาน
        if (pluginOptions.enableTemplates) {
          const configTemplateController = new ConfigTemplateController(configTemplateService);
          
          const { configTemplateRoutes } = await import('../../domains/config-management/routes/config-template-routes');
          
          await fastify.register(async function templateRoutes(fastify) {
            await configTemplateRoutes(fastify, configTemplateController);
          }, { prefix: '/api/v1/config/templates' });
        }
      }

      // Set up event listeners
      if (fastify.eventBus) {
        // Listen for configuration changes
        fastify.eventBus.subscribe('config.updated', (event: any) => {
          fastify.log.info('Configuration updated:', {
            category: event.category,
            configKey: event.configKey,
            environment: event.environment,
            changedBy: event.metadata?.userId,
            timestamp: event.timestamp,
          });
        });

        fastify.eventBus.subscribe('config.deleted', (event: any) => {
          fastify.log.info('Configuration deleted:', {
            configId: event.configId,
            category: event.category,
            configKey: event.configKey,
            deletedBy: event.metadata?.userId,
            timestamp: event.timestamp,
          });
        });

        // Listen for hot reload events
        if (pluginOptions.enableHotReload) {
          fastify.eventBus.subscribe('config.hot_reload.triggered', (event: any) => {
            fastify.log.info('Configuration hot reload triggered:', {
              category: event.category,
              services: event.services,
              timestamp: event.timestamp,
            });
          });

          fastify.eventBus.subscribe('config.hot_reload.completed', (event: any) => {
            fastify.log.info('Configuration hot reload completed:', {
              category: event.category,
              servicesReloaded: event.servicesReloaded,
              duration: event.duration,
              timestamp: event.timestamp,
            });
          });

          fastify.eventBus.subscribe('config.hot_reload.failed', (event: any) => {
            fastify.log.error('Configuration hot reload failed:', {
              category: event.category,
              services: event.services,
              error: event.error,
              timestamp: event.timestamp,
            });
          });
        }
      }

      // Health check endpoint
      fastify.get('/health/config-management', async (request, reply) => {
        try {
          const health = {
            configService: 'healthy',
            hotReloadService: pluginOptions.enableHotReload ? 'healthy' : 'disabled',
            templateService: pluginOptions.enableTemplates ? 'healthy' : 'disabled',
            database: 'unknown',
            cache: 'unknown',
          };

          // Test database connection
          try {
            await fastify.knex.raw('SELECT 1');
            health.database = 'healthy';
          } catch (error) {
            health.database = 'unhealthy';
          }

          // Skip cache test for now
          health.cache = 'disabled';

          const allHealthy = Object.values(health).every(status => 
            status === 'healthy' || status === 'disabled'
          );

          reply.code(allHealthy ? 200 : 503).send({
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            services: health,
          });

        } catch (error) {
          fastify.log.error('Configuration management health check failed:', error);
          reply.code(503).send({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      // Graceful shutdown
      fastify.addHook('onClose', async () => {
        if (pluginOptions.enableHotReload) {
          await configHotReloadService.shutdown();
        }
        fastify.log.info('Configuration management plugin shutdown completed');
      });

      fastify.log.info('✅ Configuration Management plugin registered successfully', {
        enableRoutes: pluginOptions.enableRoutes,
        enableHotReload: pluginOptions.enableHotReload,
        enableTemplates: pluginOptions.enableTemplates,
        encryptionEnabled: pluginOptions.encryptionEnabled,
      });

    } catch (error) {
      fastify.log.error('Failed to register Configuration Management plugin:', error);
      throw error;
    }
  },
  {
    name: 'config-management-plugin',
    dependencies: ['env-plugin', 'knex-plugin', 'redis-plugin', 'event-bus'],
  }
);