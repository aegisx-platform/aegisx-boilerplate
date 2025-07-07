/**
 * Report Data Source Controller
 * 
 * HTTP request handlers for data source management and operations
 */

import { FastifyRequest, FastifyReply } from 'fastify'
import { ReportDataSourceService } from '../services/report-data-source-service'
import { 
  CreateDataSourceRequest,
  DataSourceError,
  DataSourceType,
  DataClassification,
  TestDataSourceRequest
} from '../types/report-types'

export interface DataSourceListQuery {
  type?: DataSourceType
  dataClassification?: DataClassification
  isActive?: boolean
  requiresAuth?: boolean
  createdBy?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface TestDataSourceBody extends TestDataSourceRequest {}

export class ReportDataSourceController {
  constructor(private dataSourceService: ReportDataSourceService) {}

  // Data Source CRUD Operations

  async createDataSource(
    request: FastifyRequest<{ Body: CreateDataSourceRequest }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.id
      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const dataSource = await this.dataSourceService.createDataSource(request.body, userId)

      reply.code(201).send({
        success: true,
        data: dataSource
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source creation failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to create data source'
          }
        })
      }
    }
  }

  async getDataSource(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      const dataSource = await this.dataSourceService.getDataSource(id, userId)
      
      if (!dataSource) {
        reply.code(404).send({
          error: {
            code: 'DATA_SOURCE_NOT_FOUND',
            message: 'Data source not found'
          }
        })
        return
      }

      // Don't return sensitive configuration in response
      const sanitizedDataSource = {
        ...dataSource,
        connectionConfig: '[ENCRYPTED]',
        authConfig: dataSource.authConfig ? '[ENCRYPTED]' : undefined
      }

      reply.send({
        success: true,
        data: sanitizedDataSource
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source retrieval failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve data source'
          }
        })
      }
    }
  }

  async updateDataSource(
    request: FastifyRequest<{ 
      Params: { id: string }
      Body: Partial<CreateDataSourceRequest>
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const dataSource = await this.dataSourceService.updateDataSource(id, request.body, userId)

      // Don't return sensitive configuration in response
      const sanitizedDataSource = {
        ...dataSource,
        connectionConfig: '[ENCRYPTED]',
        authConfig: dataSource.authConfig ? '[ENCRYPTED]' : undefined
      }

      reply.send({
        success: true,
        data: sanitizedDataSource
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source update failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update data source'
          }
        })
      }
    }
  }

  async deleteDataSource(
    request: FastifyRequest<{ 
      Params: { id: string }
      Querystring: { hard?: boolean }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const { hard = false } = request.query
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const success = await this.dataSourceService.deleteDataSource(id, userId, hard)

      if (!success) {
        reply.code(404).send({
          error: {
            code: 'DATA_SOURCE_NOT_FOUND',
            message: 'Data source not found'
          }
        })
        return
      }

      reply.send({
        success: true,
        message: `Data source ${hard ? 'permanently deleted' : 'deactivated'} successfully`
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source deletion failed:', error)
        reply.code(500).send({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to delete data source'
          }
        })
      }
    }
  }

  // Data Source Listing and Search

  async listDataSources(
    request: FastifyRequest<{ Querystring: DataSourceListQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.id
      const query = request.query

      // Parse pagination
      const page = Math.max(1, query.page || 1)
      const limit = Math.min(100, Math.max(1, query.limit || 50))
      const offset = (page - 1) * limit

      // Build options
      const options = {
        type: query.type,
        dataClassification: query.dataClassification,
        isActive: query.isActive,
        requiresAuth: query.requiresAuth,
        createdBy: query.createdBy,
        search: query.search,
        limit,
        offset,
        sortBy: query.sortBy as 'name' | 'type' | 'created_at' | 'updated_at' | 'last_tested_at' | undefined,
        sortOrder: query.sortOrder as 'asc' | 'desc' | undefined
      }

      const result = await this.dataSourceService.listDataSources(options, userId)

      // Sanitize sensitive data in response
      const sanitizedDataSources = result.dataSources.map(ds => ({
        ...ds,
        connectionConfig: '[ENCRYPTED]',
        authConfig: ds.authConfig ? '[ENCRYPTED]' : undefined
      }))

      reply.send({
        success: true,
        data: sanitizedDataSources,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore,
          totalPages: Math.ceil(result.total / result.limit)
        }
      })
    } catch (error: any) {
      request.log.error('Data source listing failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list data sources'
        }
      })
    }
  }

  // Data Source Testing and Validation

  async testDataSource(
    request: FastifyRequest<{ 
      Params: { id: string }
      Body: TestDataSourceBody
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const testResult = await this.dataSourceService.testDataSourceConnection(
        id, 
        userId, 
        request.body
      )

      reply.send({
        success: true,
        data: testResult
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source test failed:', error)
        reply.code(500).send({
          error: {
            code: 'TEST_ERROR',
            message: 'Failed to test data source connection'
          }
        })
      }
    }
  }

  async testDataSourceConfig(
    request: FastifyRequest<{ Body: CreateDataSourceRequest & TestDataSourceBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { testQuery, sampleSize, ...dataSourceConfig } = request.body

      const testResult = await this.dataSourceService.testDataSourceConfig(
        {
          type: dataSourceConfig.type,
          ...dataSourceConfig.connectionConfig
        } as any,
        { testQuery, sampleSize }
      )

      reply.send({
        success: true,
        data: testResult
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source config test failed:', error)
        reply.code(500).send({
          error: {
            code: 'TEST_ERROR',
            message: 'Failed to test data source configuration'
          }
        })
      }
    }
  }

  // Data Querying

  async executeQuery(
    request: FastifyRequest<{ 
      Params: { id: string }
      Body: {
        query: string | object
        parameters?: Record<string, any>
        limit?: number
        offset?: number
        timeout?: number
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const { query, parameters, limit, offset, timeout } = request.body
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      if (!query) {
        reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query is required'
          }
        })
        return
      }

      const dataSourceQuery = {
        dataSourceId: id,
        query,
        parameters,
        limit: Math.min(1000, limit || 100), // Limit for API queries
        offset,
        timeout: Math.min(60000, timeout || 30000) // Max 60 seconds
      }

      const result = await this.dataSourceService.executeQuery(id, dataSourceQuery, userId)

      reply.send({
        success: true,
        data: result
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source query failed:', error)
        reply.code(500).send({
          error: {
            code: 'QUERY_ERROR',
            message: 'Failed to execute data source query'
          }
        })
      }
    }
  }

  // Health and Monitoring

  async getDataSourceHealth(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const health = await this.dataSourceService.getDataSourceHealth(id)

      reply.send({
        success: true,
        data: health
      })
    } catch (error: any) {
      request.log.error('Data source health check failed:', error)
      reply.code(500).send({
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Failed to check data source health'
        }
      })
    }
  }

  async getUnhealthyDataSources(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.id

      const unhealthyDataSources = await this.dataSourceService.getUnhealthyDataSources(userId)

      // Sanitize sensitive data
      const sanitizedDataSources = unhealthyDataSources.map(ds => ({
        ...ds,
        connectionConfig: '[ENCRYPTED]',
        authConfig: ds.authConfig ? '[ENCRYPTED]' : undefined
      }))

      reply.send({
        success: true,
        data: sanitizedDataSources,
        count: sanitizedDataSources.length
      })
    } catch (error: any) {
      request.log.error('Unhealthy data sources retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve unhealthy data sources'
        }
      })
    }
  }

  // Statistics and Analytics

  async getDataSourceStats(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const userId = request.user?.id

      const stats = await this.dataSourceService.getDataSourceStats(userId)

      reply.send({
        success: true,
        data: stats
      })
    } catch (error: any) {
      request.log.error('Data source stats retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve data source statistics'
        }
      })
    }
  }

  async getDataSourceUsage(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const usage = await this.dataSourceService.getDataSourceUsage(id)

      reply.send({
        success: true,
        data: usage
      })
    } catch (error: any) {
      request.log.error('Data source usage retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve data source usage'
        }
      })
    }
  }

  // Data Source Access Control

  async checkDataSourceAccess(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = request.params
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      const hasAccess = await this.dataSourceService.checkDataSourceAccess(id, userId)

      reply.send({
        success: true,
        data: {
          dataSourceId: id,
          hasAccess
        }
      })
    } catch (error: any) {
      request.log.error('Data source access check failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to check data source access'
        }
      })
    }
  }

  // Data Source Schema Discovery

  async getDataSourceSchema(
    request: FastifyRequest<{ 
      Params: { id: string }
      Querystring: { 
        includeData?: boolean
        sampleSize?: number
      }
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // const { id } = request.params
      const { includeData = false } = request.query
      const userId = request.user?.id

      if (!userId) {
        reply.code(401).send({ 
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        })
        return
      }

      // This would discover the schema of the data source
      // For now, return a placeholder response
      const schema = {
        tables: [
          {
            name: 'users',
            columns: [
              { name: 'id', type: 'integer', nullable: false },
              { name: 'name', type: 'string', nullable: false },
              { name: 'email', type: 'string', nullable: false },
              { name: 'created_at', type: 'datetime', nullable: false }
            ]
          }
        ],
        sampleData: includeData ? {
          users: [
            { id: 1, name: 'John Doe', email: 'john@example.com', created_at: new Date() }
          ]
        } : undefined
      }

      reply.send({
        success: true,
        data: schema
      })
    } catch (error: any) {
      if (error instanceof DataSourceError) {
        reply.code(error.statusCode).send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details
          }
        })
      } else {
        request.log.error('Data source schema discovery failed:', error)
        reply.code(500).send({
          error: {
            code: 'SCHEMA_ERROR',
            message: 'Failed to discover data source schema'
          }
        })
      }
    }
  }

  // Data Source Templates

  async getDataSourceTemplates(
    request: FastifyRequest<{ Querystring: { type?: DataSourceType } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { type } = request.query

      // Return configuration templates for different data source types
      const templates = {
        database: {
          postgresql: {
            host: 'localhost',
            port: 5432,
            database: 'your_database',
            username: 'username',
            password: 'password',
            ssl: false
          },
          mysql: {
            host: 'localhost',
            port: 3306,
            database: 'your_database',
            username: 'username',
            password: 'password'
          }
        },
        api: {
          rest: {
            baseUrl: 'https://api.example.com',
            authentication: {
              type: 'bearer',
              token: 'your_token'
            }
          }
        },
        file: {
          csv: {
            source: {
              type: 'url',
              url: 'https://example.com/data.csv'
            },
            delimiter: ',',
            hasHeader: true
          }
        },
        static: {
          data: [
            { id: 1, name: 'Sample Record 1' },
            { id: 2, name: 'Sample Record 2' }
          ]
        }
      }

      const responseData = type ? templates[type] : templates

      reply.send({
        success: true,
        data: responseData
      })
    } catch (error: any) {
      request.log.error('Data source templates retrieval failed:', error)
      reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve data source templates'
        }
      })
    }
  }
}