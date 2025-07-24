import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '../services/config-service';
import { ConfigEnvironment } from '../types/config.types';

export class FeatureToggleController {
  /**
   * ดึงรายการ feature toggles ทั้งหมด
   */
  async getAllFeatureToggles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { environment = 'development', includeInactive = false } = request.query as {
        environment?: ConfigEnvironment;
        includeInactive?: boolean;
      };

      const configService = request.server.configService as ConfigService;
      const featureToggles = await configService.getAllFeatureToggles(
        environment,
        includeInactive
      );

      return reply.send({
        success: true,
        data: {
          featureToggles,
          environment,
          total: Object.keys(featureToggles).length,
        }
      });
    } catch (error) {
      request.log.error('Failed to get feature toggles:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve feature toggles',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * ตรวจสอบสถานะ feature toggle เดียว
   */
  async checkFeatureToggle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { featureName } = request.params as { featureName: string };
      const { environment = 'development' } = request.query as {
        environment?: ConfigEnvironment;
      };

      const configService = request.server.configService as ConfigService;
      const isEnabled = await configService.isFeatureEnabled(featureName, environment);

      return reply.send({
        success: true,
        data: {
          featureName,
          environment,
          isEnabled,
          checkedAt: new Date(),
        }
      });
    } catch (error) {
      const params = request.params as { featureName: string };
      request.log.error(`Failed to check feature toggle ${params.featureName}:`, error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to check feature toggle',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * เปิด/ปิด feature toggle เดียว
   */
  async setFeatureToggle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { featureName } = request.params as { featureName: string };
      const { 
        enabled, 
        environment = 'development',
        changeReason 
      } = request.body as {
        enabled: boolean;
        environment?: ConfigEnvironment;
        changeReason?: string;
      };

      const configService = request.server.configService as ConfigService;
      const config = await configService.setFeatureToggle(
        featureName,
        enabled,
        environment,
        {
          userId: request.user?.id ? parseInt(request.user.id as string) : undefined,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          changeReason,
        }
      );

      // Log audit event
      if (request.server.auditLog) {
        await request.server.auditLog.log({
        action: 'feature_toggle_update',
        entityType: 'configuration',
        entityId: config.id.toString(),
        userId: request.user?.id,
        details: {
          featureName,
          environment,
          enabled,
          changeReason,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        });
      }

      return reply.send({
        success: true,
        message: `Feature '${featureName}' ${enabled ? 'enabled' : 'disabled'} successfully`,
        data: {
          featureName,
          environment,
          enabled,
          config,
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      const params = request.params as { featureName: string };
      request.log.error(`Failed to set feature toggle ${params.featureName}:`, error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to update feature toggle',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Bulk update feature toggles
   */
  async bulkUpdateFeatureToggles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { 
        updates, 
        environment = 'development',
        changeReason 
      } = request.body as {
        updates: Record<string, boolean>;
        environment?: ConfigEnvironment;
        changeReason?: string;
      };

      if (!updates || Object.keys(updates).length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'No feature toggles to update',
        });
      }

      const configService = request.server.configService as ConfigService;
      const configs = await configService.bulkUpdateFeatureToggles(
        updates,
        environment,
        {
          userId: request.user?.id ? parseInt(request.user.id as string) : undefined,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          changeReason,
        }
      );

      // Log audit event
      if (request.server.auditLog) {
        await request.server.auditLog.log({
        action: 'feature_toggle_bulk_update',
        entityType: 'configuration',
        entityId: 'bulk',
        userId: request.user?.id,
        details: {
          updates,
          environment,
          changeReason,
          updatedCount: configs.length,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        });
      }

      return reply.send({
        success: true,
        message: `${configs.length} feature toggles updated successfully`,
        data: {
          environment,
          updatedFeatures: Object.keys(updates),
          configs,
          updatedAt: new Date(),
        }
      });
    } catch (error) {
      request.log.error('Failed to bulk update feature toggles:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to bulk update feature toggles',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * ลบ feature toggle
   */
  async deleteFeatureToggle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { featureName } = request.params as { featureName: string };
      const { environment = 'development', changeReason } = request.body as {
        environment?: ConfigEnvironment;
        changeReason?: string;
      };

      // หา configuration ที่จะลบ
      const configService = request.server.configService as ConfigService;
      const configRepo = configService.getConfigRepository();
      const config = await configRepo.findByKey('feature_toggles', featureName, environment);

      if (!config) {
        return reply.status(404).send({
          success: false,
          message: `Feature toggle '${featureName}' not found in '${environment}' environment`,
        });
      }

      const deleted = await configService.deleteConfiguration(config.id, {
        userId: request.user?.id ? parseInt(request.user.id as string) : undefined,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        changeReason: changeReason || `Feature toggle '${featureName}' deleted`,
      });

      if (deleted) {
        // Log audit event
        if (request.server.auditLog) {
          await request.server.auditLog.log({
          action: 'feature_toggle_delete',
          entityType: 'configuration',
          entityId: config.id.toString(),
          userId: request.user?.id,
          details: {
            featureName,
            environment,
            changeReason,
          },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          });
        }

        return reply.send({
          success: true,
          message: `Feature toggle '${featureName}' deleted successfully`,
          data: {
            featureName,
            environment,
            deletedAt: new Date(),
          }
        });
      } else {
        return reply.status(500).send({
          success: false,
          message: `Failed to delete feature toggle '${featureName}'`,
        });
      }
    } catch (error) {
      const params = request.params as { featureName: string };
      request.log.error(`Failed to delete feature toggle ${params.featureName}:`, error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to delete feature toggle',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * ดึงสถิติการใช้งาน feature toggles
   */
  async getFeatureToggleStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { environment = 'development' } = request.query as {
        environment?: ConfigEnvironment;
      };

      const configService = request.server.configService as ConfigService;
      const featureToggles = await configService.getAllFeatureToggles(environment, true);

      const stats = {
        total: Object.keys(featureToggles).length,
        enabled: Object.values(featureToggles).filter(Boolean).length,
        disabled: Object.values(featureToggles).filter(v => !v).length,
        environment,
        features: Object.entries(featureToggles).map(([name, enabled]) => ({
          name,
          enabled,
        })),
        generatedAt: new Date(),
      };

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      request.log.error('Failed to get feature toggle stats:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to retrieve feature toggle statistics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Export feature toggles configuration
   */
  async exportFeatureToggles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { environment = 'development', includeInactive = false } = request.query as {
        environment?: ConfigEnvironment;
        includeInactive?: boolean;
      };

      const configService = request.server.configService as ConfigService;
      const configRepo = configService.getConfigRepository();
      
      const configs = await configRepo.findByCategory('feature_toggles', environment, includeInactive);

      const exportData = {
        category: 'feature_toggles',
        environment,
        configurations: configs.map(config => ({
          configKey: config.configKey,
          configValue: config.configValue,
          valueType: config.valueType,
          isEncrypted: config.isEncrypted,
          isActive: config.isActive,
        })),
        exportedAt: new Date(),
        exportedBy: request.user?.id,
        includeInactive,
      };

      // Log audit event
      if (request.server.auditLog) {
        await request.server.auditLog.log({
        action: 'feature_toggle_export',
        entityType: 'configuration',
        entityId: 'export',
        userId: request.user?.id,
        details: {
          environment,
          includeInactive,
          configCount: configs.length,
        },
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        });
      }

      return reply.send({
        success: true,
        data: exportData,
      });
    } catch (error) {
      request.log.error('Failed to export feature toggles:', error);
      return reply.status(500).send({
        success: false,
        message: 'Failed to export feature toggles',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}