import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { FeatureToggleController } from '../controllers/feature-toggle-controller';

/**
 * Feature Toggle Routes
 * Routes สำหรับจัดการ feature toggles
 */
export async function featureToggleRoutes(fastify: FastifyInstance) {
  const controller = new FeatureToggleController();
  
  // Bind controller methods to maintain context
  const getAllFeatureToggles = controller.getAllFeatureToggles.bind(controller);
  const checkFeatureToggle = controller.checkFeatureToggle.bind(controller);
  const setFeatureToggle = controller.setFeatureToggle.bind(controller);
  const bulkUpdateFeatureToggles = controller.bulkUpdateFeatureToggles.bind(controller);
  const deleteFeatureToggle = controller.deleteFeatureToggle.bind(controller);
  const getFeatureToggleStats = controller.getFeatureToggleStats.bind(controller);
  const exportFeatureToggles = controller.exportFeatureToggles.bind(controller);

  // Schemas
  const EnvironmentSchema = Type.Union([
    Type.Literal('development'),
    Type.Literal('production'),
    Type.Literal('staging'),
    Type.Literal('test'),
  ]);

  const FeatureToggleParamsSchema = Type.Object({
    featureName: Type.String({ 
      minLength: 1,
      maxLength: 100,
      description: 'Feature name'
    }),
  });

  const FeatureToggleQuerySchema = Type.Object({
    environment: Type.Optional(EnvironmentSchema),
    includeInactive: Type.Optional(Type.Boolean()),
  });

  const SetFeatureToggleBodySchema = Type.Object({
    enabled: Type.Boolean({ description: 'Enable or disable the feature' }),
    environment: Type.Optional(EnvironmentSchema),
    changeReason: Type.Optional(Type.String({ 
      maxLength: 500,
      description: 'Reason for the change'
    })),
  });

  const BulkUpdateFeatureTogglesBodySchema = Type.Object({
    updates: Type.Record(Type.String(), Type.Boolean(), {
      description: 'Feature name to enabled/disabled mapping'
    }),
    environment: Type.Optional(EnvironmentSchema),
    changeReason: Type.Optional(Type.String({ 
      maxLength: 500,
      description: 'Reason for the bulk update'
    })),
  });

  const DeleteFeatureToggleBodySchema = Type.Object({
    environment: Type.Optional(EnvironmentSchema),
    changeReason: Type.Optional(Type.String({ 
      maxLength: 500,
      description: 'Reason for the deletion'
    })),
  });

  // Response Schemas
  const FeatureToggleListResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
      featureToggles: Type.Record(Type.String(), Type.Boolean()),
      environment: EnvironmentSchema,
      total: Type.Number(),
    }),
  });

  const FeatureToggleCheckResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
      featureName: Type.String(),
      environment: EnvironmentSchema,
      isEnabled: Type.Boolean(),
      checkedAt: Type.String({ format: 'date-time' }),
    }),
  });

  const FeatureToggleStatsResponseSchema = Type.Object({
    success: Type.Boolean(),
    data: Type.Object({
      total: Type.Number(),
      enabled: Type.Number(),
      disabled: Type.Number(),
      environment: EnvironmentSchema,
      features: Type.Array(Type.Object({
        name: Type.String(),
        enabled: Type.Boolean(),
      })),
      generatedAt: Type.String({ format: 'date-time' }),
    }),
  });

  // Routes

  /**
   * GET /
   * ดึงรายการ feature toggles ทั้งหมด
   */
  fastify.get('/', {
    schema: {
      tags: ['Feature Toggles'],
      summary: 'Get all feature toggles',
      description: 'Retrieve all feature toggles for the specified environment',
      querystring: FeatureToggleQuerySchema,
      response: {
        200: FeatureToggleListResponseSchema,
      },
    },
    // preHandler: [fastify.authenticate, fastify.authorize(['config:read'])],
  }, getAllFeatureToggles);

  /**
   * GET /:featureName
   * ตรวจสอบสถานะ feature toggle เดียว
   */
  fastify.get('/:featureName', {
    schema: {
      tags: ['Feature Toggles'],
      summary: 'Check feature toggle status',
      description: 'Check if a specific feature is enabled or disabled',
      params: FeatureToggleParamsSchema,
      querystring: Type.Object({
        environment: Type.Optional(EnvironmentSchema),
      }),
      response: {
        200: FeatureToggleCheckResponseSchema,
      },
    },
    // preHandler: [fastify.authenticate, fastify.authorize(['config:read'])],
  }, checkFeatureToggle);

  /**
   * PUT /:featureName
   * เปิด/ปิด feature toggle เดียว
   */
  fastify.put('/:featureName', {
    schema: {
      tags: ['Feature Toggles'],
      summary: 'Enable or disable feature toggle',
      description: 'Enable or disable a specific feature toggle',
      params: FeatureToggleParamsSchema,
      body: SetFeatureToggleBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            featureName: Type.String(),
            environment: EnvironmentSchema,
            enabled: Type.Boolean(),
            config: Type.Any(),
            updatedAt: Type.String({ format: 'date-time' }),
          }),
        }),
      },
    },
    // preHandler: [fastify.authenticate, fastify.authorize(['config:write'])],
  }, setFeatureToggle);

  /**
   * PUT /bulk
   * Bulk update feature toggles
   */
  fastify.put('/bulk', {
    schema: {
      tags: ['Feature Toggles'],
      summary: 'Bulk update feature toggles',
      description: 'Update multiple feature toggles at once',
      body: BulkUpdateFeatureTogglesBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            environment: EnvironmentSchema,
            updatedFeatures: Type.Array(Type.String()),
            configs: Type.Array(Type.Any()),
            updatedAt: Type.String({ format: 'date-time' }),
          }),
        }),
      },
    },
    // preHandler: [fastify.authenticate, fastify.authorize(['config:write'])],
  }, bulkUpdateFeatureToggles);

  /**
   * DELETE /:featureName
   * ลบ feature toggle
   */
  fastify.delete('/:featureName', {
    schema: {
      tags: ['Feature Toggles'],
      summary: 'Delete feature toggle',
      description: 'Delete a specific feature toggle',
      params: FeatureToggleParamsSchema,
      body: DeleteFeatureToggleBodySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            featureName: Type.String(),
            environment: EnvironmentSchema,
            deletedAt: Type.String({ format: 'date-time' }),
          }),
        }),
      },
    },
    // preHandler: [fastify.authenticate, fastify.authorize(['config:delete'])],
  }, deleteFeatureToggle);

  /**
   * GET /stats
   * ดึงสถิติ feature toggles
   */
  fastify.get('/stats', {
    schema: {
      tags: ['Feature Toggles'],
      summary: 'Get feature toggle statistics',
      description: 'Get statistics about feature toggles usage',
      querystring: Type.Object({
        environment: Type.Optional(EnvironmentSchema),
      }),
      response: {
        200: FeatureToggleStatsResponseSchema,
      },
    },
    // preHandler: [fastify.authenticate, fastify.authorize(['config:read'])],
  }, getFeatureToggleStats);

  /**
   * GET /export
   * Export feature toggles configuration
   */
  fastify.get('/export', {
    schema: {
      tags: ['Feature Toggles'],
      summary: 'Export feature toggles',
      description: 'Export feature toggles configuration for backup or migration',
      querystring: FeatureToggleQuerySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Object({
            category: Type.Literal('feature_toggles'),
            environment: EnvironmentSchema,
            configurations: Type.Array(Type.Object({
              configKey: Type.String(),
              configValue: Type.String(),
              valueType: Type.String(),
              isEncrypted: Type.Boolean(),
              isActive: Type.Boolean(),
            })),
            exportedAt: Type.String({ format: 'date-time' }),
            exportedBy: Type.Optional(Type.Number()),
            includeInactive: Type.Boolean(),
          }),
        }),
      },
    },
    // preHandler: [fastify.authenticate, fastify.authorize(['config:read'])],
  }, exportFeatureToggles);
}