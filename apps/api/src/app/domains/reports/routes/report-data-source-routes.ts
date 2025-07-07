/**
 * Report Data Source Routes
 * 
 * API routes for data source management and operations
 */

import { FastifyInstance } from 'fastify'
import { ReportDataSourceController } from '../controllers/report-data-source-controller'
import {
  CreateDataSourceSchema,
  UpdateDataSourceSchema,
  TestDataSourceSchema,
  DataSourceQuerySchema,
  DataSourceListQuerySchema,
  DataSourceResponseSchema,
  DataSourceListResponseSchema,
  DataSourceStatsResponseSchema,
  DataSourceHealthResponseSchema,
  DataSourceUsageResponseSchema,
  DataSourceSchemaResponseSchema,
  DataSourceTestResultResponseSchema,
  DataSourceQueryResultResponseSchema,
  DataSourceTemplatesResponseSchema,
  DataSourceErrorSchema
} from '../schemas/report-data-source-schemas'

export default async function reportDataSourceRoutes(fastify: FastifyInstance) {
  const controller = new ReportDataSourceController(fastify.reportDataSourceService)

  // Data Source CRUD Operations

  // Create data source
  fastify.route({
    method: 'POST',
    url: '/data-sources',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:create:data-source'])],
    schema: {
      description: 'Create a new data source',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      body: CreateDataSourceSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: DataSourceResponseSchema
          }
        },
        400: DataSourceErrorSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.createDataSource.bind(controller) as any
  })

  // Get data source by ID
  fastify.route({
    method: 'GET',
    url: '/data-sources/:id',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:read:data-source'])],
    schema: {
      description: 'Get data source by ID',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: DataSourceResponseSchema
          }
        },
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.getDataSource.bind(controller) as any
  })

  // Update data source
  fastify.route({
    method: 'PUT',
    url: '/data-sources/:id',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:update:data-source'])],
    schema: {
      description: 'Update a data source',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: UpdateDataSourceSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: DataSourceResponseSchema
          }
        },
        400: DataSourceErrorSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.updateDataSource.bind(controller) as any
  })

  // Delete data source
  fastify.route({
    method: 'DELETE',
    url: '/data-sources/:id',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:delete:data-source'])],
    schema: {
      description: 'Delete a data source',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          hard: { type: 'boolean', default: false }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.deleteDataSource.bind(controller) as any
  })

  // Data Source Listing and Search

  // List data sources
  fastify.route({
    method: 'GET',
    url: '/data-sources',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'List data sources with filtering and pagination',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      querystring: DataSourceListQuerySchema,
      response: {
        200: DataSourceListResponseSchema,
        401: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.listDataSources.bind(controller) as any
  })

  // Data Source Testing and Validation

  // Test data source connection
  fastify.route({
    method: 'POST',
    url: '/data-sources/:id/test',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:test:data-source'])],
    schema: {
      description: 'Test data source connection',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: TestDataSourceSchema,
      response: {
        200: DataSourceTestResultResponseSchema,
        400: DataSourceErrorSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.testDataSource.bind(controller) as any
  })

  // Test data source configuration
  fastify.route({
    method: 'POST',
    url: '/data-sources/test',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:test:data-source'])],
    schema: {
      description: 'Test data source configuration before creating',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      body: {
        allOf: [
          CreateDataSourceSchema,
          TestDataSourceSchema
        ]
      },
      response: {
        200: DataSourceTestResultResponseSchema,
        400: DataSourceErrorSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.testDataSourceConfig.bind(controller) as any
  })

  // Data Querying

  // Execute query on data source
  fastify.route({
    method: 'POST',
    url: '/data-sources/:id/query',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:query:data-source'])],
    schema: {
      description: 'Execute query on data source',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      body: DataSourceQuerySchema,
      response: {
        200: DataSourceQueryResultResponseSchema,
        400: DataSourceErrorSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.executeQuery.bind(controller) as any
  })

  // Health and Monitoring

  // Get data source health
  fastify.route({
    method: 'GET',
    url: '/data-sources/:id/health',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get data source health status',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: DataSourceHealthResponseSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.getDataSourceHealth.bind(controller) as any
  })

  // Get unhealthy data sources
  fastify.route({
    method: 'GET',
    url: '/data-sources/unhealthy',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:monitor:data-sources'])],
    schema: {
      description: 'Get all unhealthy data sources',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: DataSourceResponseSchema },
            count: { type: 'number' }
          }
        },
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.getUnhealthyDataSources.bind(controller) as any
  })

  // Statistics and Analytics

  // Get data source statistics
  fastify.route({
    method: 'GET',
    url: '/data-sources/stats',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get data source statistics',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      response: {
        200: DataSourceStatsResponseSchema,
        401: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.getDataSourceStats.bind(controller) as any
  })

  // Get data source usage
  fastify.route({
    method: 'GET',
    url: '/data-sources/:id/usage',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Get data source usage statistics',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: DataSourceUsageResponseSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.getDataSourceUsage.bind(controller) as any
  })

  // Data Source Access Control

  // Check data source access
  fastify.route({
    method: 'GET',
    url: '/data-sources/:id/access',
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Check user access to data source',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                dataSourceId: { type: 'string', format: 'uuid' },
                hasAccess: { type: 'boolean' }
              }
            }
          }
        },
        401: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.checkDataSourceAccess.bind(controller) as any
  })

  // Data Source Schema Discovery

  // Get data source schema
  fastify.route({
    method: 'GET',
    url: '/data-sources/:id/schema',
    preHandler: [fastify.authenticate, fastify.rbacRequire(['reports:read:data-source'])],
    schema: {
      description: 'Discover data source schema and structure',
      tags: ['Data Sources'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          includeData: { type: 'boolean', default: false },
          sampleSize: { type: 'number', minimum: 1, maximum: 100, default: 5 }
        }
      },
      response: {
        200: DataSourceSchemaResponseSchema,
        400: DataSourceErrorSchema,
        401: DataSourceErrorSchema,
        403: DataSourceErrorSchema,
        404: DataSourceErrorSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.getDataSourceSchema.bind(controller) as any
  })

  // Data Source Templates

  // Get data source configuration templates
  fastify.route({
    method: 'GET',
    url: '/data-sources/templates',
    schema: {
      description: 'Get data source configuration templates',
      tags: ['Data Sources'],
      querystring: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['database', 'api', 'file', 'static']
          }
        }
      },
      response: {
        200: DataSourceTemplatesResponseSchema,
        500: DataSourceErrorSchema
      }
    },
    handler: controller.getDataSourceTemplates.bind(controller) as any
  })

  fastify.log.info('✅ Report data source routes loaded')
}