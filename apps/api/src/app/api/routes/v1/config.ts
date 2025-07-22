import { FastifyInstance } from 'fastify';
import { configRoutes } from '../../../domains/config-management/routes/config-routes';
import { configTemplateRoutes } from '../../../domains/config-management/routes/config-template-routes';
import { ConfigController } from '../../../domains/config-management/controllers/config-controller';
import { ConfigTemplateController } from '../../../domains/config-management/controllers/config-template-controller';

/**
 * Configuration Management API Routes V1
 */
export default async function configApiRoutes(fastify: FastifyInstance) {
  // Create controllers
  const configService = (fastify as any).configService;
  const configHistoryRepo = (fastify as any).configHistoryRepo;
  const configTemplateService = (fastify as any).configTemplateService;

  if (!configService || !configHistoryRepo || !configTemplateService) {
    fastify.log.warn('⚠️ Configuration services not available, skipping config routes');
    return;
  }

  const configController = new ConfigController(configService, configHistoryRepo);
  const configTemplateController = new ConfigTemplateController(configTemplateService);

  // Register configuration routes with /config prefix
  await fastify.register(async (fastify: FastifyInstance) => {
    await configRoutes(fastify, configController);
  }, { prefix: '/config' });

  // Register template routes with /templates prefix  
  await fastify.register(async (fastify: FastifyInstance) => {
    await configTemplateRoutes(fastify, configTemplateController);
  }, { prefix: '/templates' });

  fastify.log.info('✅ Configuration Management API routes loaded (v1)');
}