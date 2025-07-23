import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ConfigController } from '../controllers/config-controller';
import { 
  CreateConfigurationRequestSchema,
  UpdateConfigurationRequestSchema,
  BulkUpdateConfigurationRequestSchema,
  ConfigurationSearchParamsSchema,
  IdParamSchema,
  CategoryParamSchema,
  EnvironmentQuerySchema,
  ForceReloadRequestSchema,
  ErrorResponseSchema,
  SuccessResponseSchema
} from '../schemas/config.schemas';

/**
 * Configuration Management API Routes
 */
export async function configRoutes(
  fastify: FastifyInstance,
  controller: ConfigController
): Promise<void> {

  // === CRUD Operations ===

  // Create configuration
  fastify.post('/', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Create new configuration',
      description: 'Create a new configuration entry',
      body: CreateConfigurationRequestSchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.createConfiguration.bind(controller));

  // Get configuration by ID
  fastify.get('/:id', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get configuration by ID',
      description: 'Retrieve a specific configuration by its ID',
      params: IdParamSchema,
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getConfigurationById.bind(controller));

  // Update configuration
  fastify.put('/:id', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Update configuration',
      description: 'Update an existing configuration',
      params: IdParamSchema,
      body: UpdateConfigurationRequestSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.updateConfiguration.bind(controller));

  // Delete configuration
  fastify.delete('/:id', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Delete configuration',
      description: 'Delete a configuration entry',
      params: IdParamSchema,
      response: {
        200: SuccessResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.deleteConfiguration.bind(controller));

  // === Search & Browse ===

  // Search configurations
  fastify.get('/search', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Search configurations',
      description: 'Search configurations with various filters',
      querystring: ConfigurationSearchParamsSchema,
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.searchConfigurations.bind(controller));

  // Get configurations by category
  fastify.get('/category/:category', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get configurations by category',
      description: 'Retrieve all configurations for a specific category with metadata',
      params: CategoryParamSchema,
      querystring: EnvironmentQuerySchema,
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getConfigurationByCategory.bind(controller));

  // === Bulk Operations ===

  // Bulk update configurations
  fastify.put('/bulk', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Bulk update configurations',
      description: 'Update multiple configurations at once',
      body: BulkUpdateConfigurationRequestSchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.bulkUpdateConfigurations.bind(controller));

  // === Values & Merged Configuration ===

  // Get configuration values
  fastify.get('/values/:category', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get configuration values',
      description: 'Get configuration values as key-value pairs for a category',
      params: CategoryParamSchema,
      querystring: EnvironmentQuerySchema,
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getConfigurationValues.bind(controller));

  // Get merged configuration
  fastify.get('/merged/:category', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get merged configuration',
      description: 'Get configuration merged from all sources (database, cache, environment, defaults)',
      params: CategoryParamSchema,
      querystring: Type.Object({
        environment: Type.Optional(Type.Union([
          Type.Literal('development'),
          Type.Literal('production'),
          Type.Literal('staging'),
          Type.Literal('test'),
        ])),
      }),
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getMergedConfiguration.bind(controller));

  // === History & Audit ===

  // Get configuration history
  fastify.get('/:id/history', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get configuration history',
      description: 'Get change history for a specific configuration',
      params: IdParamSchema,
      querystring: Type.Object({
        page: Type.Optional(Type.Integer({ minimum: 1 })),
        limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
        sortOrder: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
      }),
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getConfigurationHistory.bind(controller));

  // === Meta Information ===

  // Get categories
  fastify.get('/categories', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get configuration categories',
      description: 'Get list of all configuration categories',
      querystring: Type.Object({
        environment: Type.Optional(Type.Union([
          Type.Literal('development'),
          Type.Literal('production'),
          Type.Literal('staging'),
          Type.Literal('test'),
        ])),
      }),
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getCategories.bind(controller));

  // Get environments
  fastify.get('/environments', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get environments',
      description: 'Get list of all available environments',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getEnvironments.bind(controller));

  // === Hot Reload ===

  // Force reload
  fastify.post('/reload', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Force configuration reload',
      description: 'Force reload configuration for hot reload functionality',
      body: ForceReloadRequestSchema,
      response: {
        200: SuccessResponseSchema,
        503: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.forceReload.bind(controller));

  // Get reload stats
  fastify.get('/reload/stats', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Get reload statistics',
      description: 'Get statistics about configuration reload operations',
      // Temporarily disable response schema validation for debugging
      // response: {
      //   200: SuccessResponseSchema,
      //   503: ErrorResponseSchema,
      //   500: ErrorResponseSchema,
      // },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.getReloadStats.bind(controller));

  // Reset reload stats
  fastify.post('/reload/stats/reset', {
    schema: {
      tags: ['Configuration Management'],
      summary: 'Reset reload statistics',
      description: 'Reset configuration reload statistics',
      response: {
        200: SuccessResponseSchema,
        503: ErrorResponseSchema,
        500: ErrorResponseSchema,
      },
      security: [{ bearerAuth: [] }],
    },
    // Authentication temporarily disabled
  }, controller.resetReloadStats.bind(controller));
}