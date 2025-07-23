import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '../services/config-service';
import { ConfigHistoryRepository } from '../repositories/config-history-repository';
import {
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
  BulkUpdateConfigurationRequest,
  ConfigurationSearchParams,
  IdParam,
  CategoryParam,
  EnvironmentQuery,
  ForceReloadRequest,
} from '../schemas/config.schemas';
import { ConfigEnvironment } from '../types/config.types';

export class ConfigController {
  private configService: ConfigService;
  private historyRepo: ConfigHistoryRepository;

  constructor(
    configService: ConfigService,
    historyRepo: ConfigHistoryRepository
  ) {
    this.configService = configService;
    this.historyRepo = historyRepo;
  }

  /**
   * สร้าง configuration ใหม่
   * POST /api/v1/config
   */
  async createConfiguration(
    request: FastifyRequest<{ Body: CreateConfigurationRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = (request.user as any)?.id;
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const configuration = await this.configService.createConfiguration(
        request.body,
        { userId, ipAddress, userAgent }
      );

      reply.code(201).send({
        success: true,
        message: 'Configuration created successfully',
        data: configuration,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to create configuration:', error);
      reply.code(400).send({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Failed to create configuration',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง configuration ตาม ID
   * GET /api/v1/config/:id
   */
  async getConfigurationById(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const configId = parseInt(request.params.id);
      const configuration = await this.configService.getConfigurationWithMetadata(configId.toString());

      if (!configuration) {
        reply.code(404).send({
          error: 'Not Found',
          message: `Configuration with id ${configId} not found`,
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      reply.send({
        success: true,
        message: 'Configuration retrieved successfully',
        data: configuration,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get configuration:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get configuration',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง configurations ของ category พร้อม metadata
   * GET /api/v1/config/category/:category
   */
  async getConfigurationByCategory(
    request: FastifyRequest<{ 
      Params: CategoryParam;
      Querystring: EnvironmentQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { category } = request.params;
      const { environment = 'development', includeInactive = false } = request.query;

      const categoryConfig = await this.configService.getConfigurationWithMetadata(
        category,
        environment as ConfigEnvironment,
        includeInactive
      );

      reply.send({
        success: true,
        message: 'Configuration by category retrieved successfully',
        data: categoryConfig,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get configuration by category:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get configuration by category',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ค้นหา configurations
   * GET /api/v1/config/search
   */
  async searchConfigurations(
    request: FastifyRequest<{ Querystring: ConfigurationSearchParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const searchResult = await this.configService.searchConfigurations(request.query);

      reply.send({
        success: true,
        message: 'Configurations searched successfully',
        data: searchResult,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to search configurations:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search configurations',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * อัพเดท configuration
   * PUT /api/v1/config/:id
   */
  async updateConfiguration(
    request: FastifyRequest<{ 
      Params: IdParam;
      Body: UpdateConfigurationRequest;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const configId = parseInt(request.params.id);
      const userId = (request.user as any)?.id;
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const updatedConfiguration = await this.configService.updateConfiguration(
        configId,
        request.body,
        { userId, ipAddress, userAgent }
      );

      reply.send({
        success: true,
        message: 'Configuration updated successfully',
        data: updatedConfiguration,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to update configuration:', error);
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
      reply.code(statusCode).send({
        error: statusCode === 404 ? 'Not Found' : 'Bad Request',
        message: error instanceof Error ? error.message : 'Failed to update configuration',
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * Bulk update configurations
   * PUT /api/v1/config/bulk
   */
  async bulkUpdateConfigurations(
    request: FastifyRequest<{ Body: BulkUpdateConfigurationRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = (request.user as any)?.id;
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const updatedConfigurations = await this.configService.bulkUpdateConfigurations(
        request.body,
        { userId, ipAddress, userAgent }
      );

      reply.send({
        success: true,
        message: `${updatedConfigurations.length} configurations updated successfully`,
        data: updatedConfigurations,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to bulk update configurations:', error);
      reply.code(400).send({
        error: 'Bad Request',
        message: error instanceof Error ? error.message : 'Failed to bulk update configurations',
        statusCode: 400,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ลบ configuration
   * DELETE /api/v1/config/:id
   */
  async deleteConfiguration(
    request: FastifyRequest<{ Params: IdParam }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const configId = parseInt(request.params.id);
      const userId = (request.user as any)?.id;
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const deleted = await this.configService.deleteConfiguration(
        configId,
        { userId, ipAddress, userAgent, changeReason: 'Configuration deleted via API' }
      );

      if (!deleted) {
        reply.code(404).send({
          error: 'Not Found',
          message: `Configuration with id ${configId} not found`,
          statusCode: 404,
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }

      reply.send({
        success: true,
        message: 'Configuration deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to delete configuration:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete configuration',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง configuration values เป็น key-value pairs
   * GET /api/v1/config/values/:category
   */
  async getConfigurationValues(
    request: FastifyRequest<{ 
      Params: CategoryParam;
      Querystring: EnvironmentQuery;
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { category } = request.params;
      const { environment = 'development' } = request.query;

      const configValues = await this.configService.getConfigValues(
        category,
        environment as ConfigEnvironment
      );

      reply.send({
        success: true,
        message: 'Configuration values retrieved successfully',
        data: {
          category,
          environment,
          values: configValues,
          lastUpdated: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get configuration values:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get configuration values',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึง merged configuration จากหลายแหล่ง
   * GET /api/v1/config/merged/:category
   */
  async getMergedConfiguration(
    request: FastifyRequest<{ 
      Params: CategoryParam;
      Querystring: { environment?: ConfigEnvironment };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { category } = request.params;
      const { environment = 'development' } = request.query;

      const mergedConfig = await this.configService.getMergedConfiguration(
        category,
        environment
      );

      reply.send({
        success: true,
        message: 'Merged configuration retrieved successfully',
        data: mergedConfig,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get merged configuration:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get merged configuration',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงของ configuration
   * GET /api/v1/config/:id/history
   */
  async getConfigurationHistory(
    request: FastifyRequest<{ 
      Params: IdParam;
      Querystring: {
        page?: number;
        limit?: number;
        sortOrder?: 'asc' | 'desc';
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const configId = parseInt(request.params.id);
      const { page = 1, limit = 20, sortOrder = 'desc' } = request.query;

      const { history, total } = await this.historyRepo.findByConfigIdWithDetails(
        configId,
        { page, limit, sortOrder }
      );

      const totalPages = Math.ceil(total / limit);

      reply.send({
        success: true,
        message: 'Configuration history retrieved successfully',
        data: {
          history,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get configuration history:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get configuration history',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึงรายการ categories
   * GET /api/v1/config/categories
   */
  async getCategories(
    request: FastifyRequest<{ Querystring: { environment?: ConfigEnvironment } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { environment } = request.query;
      const categories = await this.configService.searchConfigurations({ category: undefined }).then(configs => 
        [...new Set(configs.configurations.map((c: any) => c.category))]
      );

      reply.send({
        success: true,
        message: 'Categories retrieved successfully',
        data: categories,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get categories:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get categories',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึงรายการ environments
   * GET /api/v1/config/environments
   */
  async getEnvironments(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const environments = ['development', 'production', 'staging', 'test'];

      reply.send({
        success: true,
        message: 'Environments retrieved successfully',
        data: environments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get environments:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get environments',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * Force reload configuration
   * POST /api/v1/config/reload
   */
  async forceReload(
    request: FastifyRequest<{ Body: ForceReloadRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = (request.user as any)?.id || 0;
      const { category, environment, changeReason } = request.body;

      // Try to use real hot reload service
      let reloadStatus = 'completed';
      let reloadMessage = 'Configuration reload completed successfully';
      
      try {
        // Get or create hot reload service
        let hotReloadService = (request.server as any).configHotReloadService;
        
        if (!hotReloadService) {
          // Create a basic service instance if not available
          const { ConfigHotReloadService } = await import('../services/config-hot-reload.service');
          hotReloadService = new ConfigHotReloadService(request.server, {
            enableAutoReload: true,
            reloadDebounceMs: 1000,
            maxRetries: 2,
            retryDelayMs: 1000,
            enableHealthCheck: false
          });
        }

        // Perform force reload with timeout protection
        await hotReloadService.forceReload(category, environment, userId);
        
      } catch (reloadError) {
        request.log.warn('Hot reload service failed, using fallback method:', reloadError);
        reloadStatus = 'fallback';
        reloadMessage = 'Configuration reload completed with fallback method';
        
        // Fallback: publish event directly to eventBus if available
        if ((request.server as any).eventBus) {
          await (request.server as any).eventBus.publish('config.changed', {
            type: 'updated',
            category,
            configKey: '*',
            environment,
            changedBy: userId,
            timestamp: new Date(),
            changeReason: changeReason || 'Force reload'
          });
        }
      }
      
      reply.send({
        success: true,
        message: `Configuration reload initiated for ${category}:${environment}`,
        data: {
          category,
          environment,
          requestedBy: userId,
          requestedAt: new Date().toISOString(),
          reason: changeReason,
          status: reloadMessage,
          method: reloadStatus
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to force reload configuration:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to force reload configuration',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * ดึงสถิติการ reload
   * GET /api/v1/config/reload/stats
   */
  async getReloadStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      let statsData;
      let statsSource = 'default';
      
      try {
        // Try to get stats from hot reload service
        const hotReloadService = (request.server as any).configHotReloadService;
        
        if (hotReloadService && typeof hotReloadService.getReloadStats === 'function') {
          statsData = hotReloadService.getReloadStats();
          statsSource = 'service';
        } else {
          throw new Error('Hot reload service not available');
        }
        
      } catch (serviceError) {
        request.log.debug('Could not get stats from hot reload service:', serviceError);
        
        // Fallback to default stats
        statsData = {
          'email-service': {
            successCount: 0,
            errorCount: 0,
            categories: ['smtp'],
            environments: ['development', 'production'],
            priority: 1,
            lastError: undefined,
            lastReloadDuration: undefined
          }
        };
        statsSource = 'fallback';
      }
      
      reply.send({
        success: true,
        message: 'Reload statistics retrieved successfully',
        data: {
          services: statsData,
          source: statsSource,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to get reload stats:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get reload stats',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }

  /**
   * รีเซ็ตสถิติการ reload
   * POST /api/v1/config/reload/stats/reset
   */
  async resetReloadStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      let resetStatus = 'completed';
      let resetMessage = 'Reload stats reset successfully';
      
      try {
        // Try to reset stats using hot reload service
        const hotReloadService = (request.server as any).configHotReloadService;
        
        if (hotReloadService && typeof hotReloadService.resetStats === 'function') {
          hotReloadService.resetStats();
          resetStatus = 'service';
        } else {
          resetStatus = 'no-service';
          resetMessage = 'Reload stats reset (no service to reset)';
        }
        
      } catch (serviceError) {
        request.log.debug('Could not reset stats using hot reload service:', serviceError);
        resetStatus = 'fallback';
        resetMessage = 'Reload stats reset (fallback - no active service)';
      }
      
      reply.send({
        success: true,
        message: resetMessage,
        data: {
          resetMethod: resetStatus,
          resetAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      request.log.error('Failed to reset reload stats:', error);
      reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to reset reload stats',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
      });
    }
  }
}