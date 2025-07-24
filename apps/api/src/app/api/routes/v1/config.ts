import { FastifyInstance } from 'fastify';
import { configRoutes } from '../../../domains/config-management/routes/config-routes';
import { configTemplateRoutes } from '../../../domains/config-management/routes/config-template-routes';
import { featureToggleRoutes } from '../../../domains/config-management/routes/feature-toggle-routes';
import { ConfigController } from '../../../domains/config-management/controllers/config-controller';
import { ConfigTemplateController } from '../../../domains/config-management/controllers/config-template-controller';
import { ConfigHistoryRepository } from '../../../domains/config-management/repositories/config-history-repository';

/**
 * Configuration Management API Routes V1
 */
export default async function configApiRoutes(fastify: FastifyInstance) {
  try {
    // Try to get services from fastify instance first
    let configService = (fastify as any).configService;
    let configTemplateService = (fastify as any).configTemplateService;
    let configHistoryRepo = (fastify as any).configHistoryRepo;

    // If services not available from plugin, create them directly
    if (!configService) {
      const { ConfigService } = await import('../../../domains/config-management/services/config-service.js');
      configService = new ConfigService(fastify);
      fastify.log.info('Created ConfigService directly in API routes');
    }

    if (!configTemplateService) {
      const { ConfigTemplateService } = await import('../../../domains/config-management/services/config-template.service.js');
      configTemplateService = new ConfigTemplateService(fastify);
      fastify.log.info('Created ConfigTemplateService directly in API routes');
    }

    if (!configHistoryRepo) {
      configHistoryRepo = new ConfigHistoryRepository(fastify);
      fastify.log.info('Created ConfigHistoryRepository directly in API routes');
    }

  const configController = new ConfigController(configService, configHistoryRepo);
  const configTemplateController = new ConfigTemplateController(configTemplateService);

  // Register configuration routes with /config prefix
  await fastify.register(async (fastify: FastifyInstance) => {
    await configRoutes(fastify, configController);
    
    // Register template routes under /config/templates
    await fastify.register(async (fastify: FastifyInstance) => {
      await configTemplateRoutes(fastify, configTemplateController);
    }, { prefix: '/templates' });
    
    // Register feature toggle routes under /config/feature-toggles
    await fastify.register(async (fastify: FastifyInstance) => {
      await featureToggleRoutes(fastify);
    }, { prefix: '/feature-toggles' });
  }, { prefix: '/config' });

    fastify.log.info('✅ Configuration Management API routes loaded (v1)');
  } catch (error) {
    fastify.log.error('Failed to load Configuration Management API routes:', error);
    throw error;
  }
}