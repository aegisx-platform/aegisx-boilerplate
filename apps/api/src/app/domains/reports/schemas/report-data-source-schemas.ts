/**
 * Report Data Source Validation Schemas
 * 
 * TypeBox schemas for data source request/response validation
 */

import { Type, Static } from '@sinclair/typebox'

// Base enums
export const DataSourceTypeSchema = Type.Union([
  Type.Literal('database'),
  Type.Literal('api'),
  Type.Literal('file'),
  Type.Literal('static')
])

export const DataClassificationSchema = Type.Union([
  Type.Literal('public'),
  Type.Literal('internal'),
  Type.Literal('confidential'),
  Type.Literal('restricted')
])

export const DatabaseTypeSchema = Type.Union([
  Type.Literal('postgresql'),
  Type.Literal('mysql'),
  Type.Literal('sqlite'),
  Type.Literal('mongodb'),
  Type.Literal('mssql'),
  Type.Literal('oracle')
])

export const APIAuthTypeSchema = Type.Union([
  Type.Literal('none'),
  Type.Literal('basic'),
  Type.Literal('bearer'),
  Type.Literal('api_key'),
  Type.Literal('oauth2')
])

export const FileSourceTypeSchema = Type.Union([
  Type.Literal('url'),
  Type.Literal('upload'),
  Type.Literal('storage')
])

export const HealthStatusSchema = Type.Union([
  Type.Literal('healthy'),
  Type.Literal('warning'),
  Type.Literal('critical'),
  Type.Literal('unknown')
])

// Configuration schemas
export const DatabaseConfigSchema = Type.Object({
  type: DatabaseTypeSchema,
  host: Type.String(),
  port: Type.Number(),
  database: Type.String(),
  username: Type.String(),
  password: Type.String(),
  ssl: Type.Optional(Type.Boolean()),
  connectionLimit: Type.Optional(Type.Number()),
  timeout: Type.Optional(Type.Number()),
  charset: Type.Optional(Type.String()),
  timezone: Type.Optional(Type.String())
})

export const APIConfigSchema = Type.Object({
  baseUrl: Type.String({ format: 'uri' }),
  timeout: Type.Optional(Type.Number()),
  retries: Type.Optional(Type.Number()),
  rateLimit: Type.Optional(Type.Object({
    requests: Type.Number(),
    window: Type.Number()
  })),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  queryParams: Type.Optional(Type.Record(Type.String(), Type.String()))
})

export const FileConfigSchema = Type.Object({
  source: Type.Object({
    type: FileSourceTypeSchema,
    url: Type.Optional(Type.String({ format: 'uri' })),
    storageFileId: Type.Optional(Type.String()),
    uploadConfig: Type.Optional(Type.Object({
      maxSize: Type.Optional(Type.Number()),
      allowedTypes: Type.Optional(Type.Array(Type.String()))
    }))
  }),
  format: Type.Union([
    Type.Literal('csv'),
    Type.Literal('json'),
    Type.Literal('xml'),
    Type.Literal('excel'),
    Type.Literal('txt')
  ]),
  delimiter: Type.Optional(Type.String()),
  hasHeader: Type.Optional(Type.Boolean()),
  encoding: Type.Optional(Type.String()),
  skipRows: Type.Optional(Type.Number())
})

export const StaticConfigSchema = Type.Object({
  data: Type.Array(Type.Any()),
  schema: Type.Optional(Type.Array(Type.Object({
    name: Type.String(),
    type: Type.Union([
      Type.Literal('string'),
      Type.Literal('number'),
      Type.Literal('boolean'),
      Type.Literal('date')
    ]),
    nullable: Type.Optional(Type.Boolean())
  })))
})

export const DataSourceConfigSchema = Type.Union([
  DatabaseConfigSchema,
  APIConfigSchema,
  FileConfigSchema,
  StaticConfigSchema
])

export const AuthConfigSchema = Type.Object({
  type: APIAuthTypeSchema,
  credentials: Type.Optional(Type.Object({
    username: Type.Optional(Type.String()),
    password: Type.Optional(Type.String()),
    token: Type.Optional(Type.String()),
    apiKey: Type.Optional(Type.String()),
    apiKeyHeader: Type.Optional(Type.String()),
    clientId: Type.Optional(Type.String()),
    clientSecret: Type.Optional(Type.String()),
    tokenUrl: Type.Optional(Type.String()),
    scope: Type.Optional(Type.String())
  }))
})

export const SecurityConfigSchema = Type.Object({
  encryptionEnabled: Type.Optional(Type.Boolean()),
  encryptionKey: Type.Optional(Type.String()),
  ipWhitelist: Type.Optional(Type.Array(Type.String())),
  certificateValidation: Type.Optional(Type.Boolean()),
  customCertificate: Type.Optional(Type.String())
})

export const MonitoringConfigSchema = Type.Object({
  healthCheckEnabled: Type.Optional(Type.Boolean()),
  healthCheckInterval: Type.Optional(Type.Number()),
  healthCheckQuery: Type.Optional(Type.String()),
  alertOnFailure: Type.Optional(Type.Boolean()),
  alertThreshold: Type.Optional(Type.Number()),
  alertRecipients: Type.Optional(Type.Array(Type.String()))
})

// Request schemas
export const CreateDataSourceSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  type: DataSourceTypeSchema,
  dataClassification: Type.Optional(DataClassificationSchema),
  connectionConfig: DataSourceConfigSchema,
  authConfig: Type.Optional(AuthConfigSchema),
  securityConfig: Type.Optional(SecurityConfigSchema),
  monitoringConfig: Type.Optional(MonitoringConfigSchema),
  isActive: Type.Optional(Type.Boolean()),
  requiresAuth: Type.Optional(Type.Boolean()),
  allowedRoles: Type.Optional(Type.Array(Type.String())),
  allowedUsers: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  tags: Type.Optional(Type.Array(Type.String())),
  customProperties: Type.Optional(Type.Record(Type.String(), Type.Any()))
})

export const UpdateDataSourceSchema = Type.Partial(CreateDataSourceSchema)

export const TestDataSourceSchema = Type.Object({
  testQuery: Type.Optional(Type.String()),
  sampleSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100 }))
})

export const DataSourceQuerySchema = Type.Object({
  query: Type.Union([Type.String(), Type.Any()]),
  parameters: Type.Optional(Type.Record(Type.String(), Type.Any())),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
  offset: Type.Optional(Type.Number({ minimum: 0 })),
  timeout: Type.Optional(Type.Number({ minimum: 1000, maximum: 60000 }))
})

// Query schemas
export const DataSourceListQuerySchema = Type.Object({
  type: Type.Optional(DataSourceTypeSchema),
  dataClassification: Type.Optional(DataClassificationSchema),
  isActive: Type.Optional(Type.Boolean()),
  requiresAuth: Type.Optional(Type.Boolean()),
  createdBy: Type.Optional(Type.String({ format: 'uuid' })),
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  tags: Type.Optional(Type.Array(Type.String())),
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('name'),
    Type.Literal('type'),
    Type.Literal('created_at'),
    Type.Literal('updated_at'),
    Type.Literal('last_used_at'),
    Type.Literal('usage_count')
  ])),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ]))
})

// Response schemas
export const DataSourceResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  type: DataSourceTypeSchema,
  dataClassification: DataClassificationSchema,
  connectionConfig: Type.Any(), // Encrypted in responses
  authConfig: Type.Optional(Type.Any()), // Encrypted in responses
  securityConfig: Type.Optional(SecurityConfigSchema),
  monitoringConfig: Type.Optional(MonitoringConfigSchema),
  isActive: Type.Boolean(),
  requiresAuth: Type.Boolean(),
  allowedRoles: Type.Optional(Type.Array(Type.String())),
  allowedUsers: Type.Optional(Type.Array(Type.String())),
  tags: Type.Optional(Type.Array(Type.String())),
  customProperties: Type.Optional(Type.Record(Type.String(), Type.Any())),
  createdBy: Type.String({ format: 'uuid' }),
  updatedBy: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  lastUsedAt: Type.Optional(Type.String({ format: 'date-time' })),
  usageCount: Type.Number(),
  healthStatus: Type.Optional(HealthStatusSchema),
  lastHealthCheck: Type.Optional(Type.String({ format: 'date-time' })),
  analytics: Type.Optional(Type.Object({
    totalQueries: Type.Number(),
    avgResponseTime: Type.Number(),
    errorRate: Type.Number(),
    lastUsed: Type.Optional(Type.String({ format: 'date-time' }))
  }))
})

export const DataSourceListResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(DataSourceResponseSchema),
  pagination: Type.Object({
    page: Type.Number(),
    limit: Type.Number(),
    total: Type.Number(),
    hasMore: Type.Boolean(),
    totalPages: Type.Number()
  })
})

export const DataSourceStatsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    totalDataSources: Type.Number(),
    activeDataSources: Type.Number(),
    dataSourcesByType: Type.Record(DataSourceTypeSchema, Type.Number()),
    dataSourcesByClassification: Type.Record(DataClassificationSchema, Type.Number()),
    healthyDataSources: Type.Number(),
    unhealthyDataSources: Type.Number(),
    avgUsageCount: Type.Number(),
    mostUsedDataSource: Type.Optional(Type.String()),
    recentlyCreated: Type.Number(),
    recentlyUsed: Type.Number(),
    totalQueriesToday: Type.Number(),
    avgResponseTime: Type.Number()
  })
})

export const DataSourceHealthResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    dataSourceId: Type.String({ format: 'uuid' }),
    status: HealthStatusSchema,
    lastCheck: Type.String({ format: 'date-time' }),
    responseTime: Type.Optional(Type.Number()),
    errorMessage: Type.Optional(Type.String()),
    checks: Type.Array(Type.Object({
      name: Type.String(),
      status: Type.Union([
        Type.Literal('pass'),
        Type.Literal('fail'),
        Type.Literal('warning')
      ]),
      message: Type.Optional(Type.String()),
      duration: Type.Optional(Type.Number())
    })),
    nextCheck: Type.Optional(Type.String({ format: 'date-time' }))
  })
})

export const DataSourceUsageResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    dataSourceId: Type.String({ format: 'uuid' }),
    totalQueries: Type.Number(),
    totalDataTransferred: Type.Number(),
    avgResponseTime: Type.Number(),
    errorRate: Type.Number(),
    lastUsed: Type.Optional(Type.String({ format: 'date-time' })),
    topQueries: Type.Array(Type.Object({
      query: Type.String(),
      count: Type.Number(),
      avgDuration: Type.Number()
    })),
    queryHistory: Type.Array(Type.Object({
      date: Type.String({ format: 'date' }),
      queries: Type.Number(),
      errors: Type.Number(),
      avgResponseTime: Type.Number()
    })),
    peakUsageHours: Type.Array(Type.Object({
      hour: Type.Number(),
      queries: Type.Number()
    }))
  })
})

export const DataSourceSchemaResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    tables: Type.Optional(Type.Array(Type.Object({
      name: Type.String(),
      columns: Type.Array(Type.Object({
        name: Type.String(),
        type: Type.String(),
        nullable: Type.Boolean(),
        defaultValue: Type.Optional(Type.Any()),
        constraints: Type.Optional(Type.Array(Type.String()))
      }))
    }))),
    endpoints: Type.Optional(Type.Array(Type.Object({
      path: Type.String(),
      method: Type.String(),
      parameters: Type.Optional(Type.Array(Type.Object({
        name: Type.String(),
        type: Type.String(),
        required: Type.Boolean()
      })))
    }))),
    schema: Type.Optional(Type.Any()),
    sampleData: Type.Optional(Type.Any())
  })
})

export const DataSourceTestResultResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    connectionStatus: Type.Union([
      Type.Literal('success'),
      Type.Literal('failed'),
      Type.Literal('timeout')
    ]),
    responseTime: Type.Number(),
    message: Type.String(),
    details: Type.Optional(Type.Any()),
    sampleData: Type.Optional(Type.Any()),
    rowCount: Type.Optional(Type.Number()),
    errors: Type.Optional(Type.Array(Type.String())),
    warnings: Type.Optional(Type.Array(Type.String()))
  })
})

export const DataSourceQueryResultResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    rows: Type.Array(Type.Any()),
    rowCount: Type.Number(),
    columns: Type.Optional(Type.Array(Type.Object({
      name: Type.String(),
      type: Type.String()
    }))),
    executionTime: Type.Number(),
    query: Type.String(),
    fromCache: Type.Optional(Type.Boolean()),
    pagination: Type.Optional(Type.Object({
      offset: Type.Number(),
      limit: Type.Number(),
      hasMore: Type.Boolean(),
      total: Type.Optional(Type.Number())
    }))
  })
})

export const DataSourceTemplatesResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Any()
})

// Error schemas
export const DataSourceErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any()),
    dataSourceId: Type.Optional(Type.String({ format: 'uuid' })),
    step: Type.Optional(Type.String())
  })
})

// Type exports for TypeScript
export type CreateDataSourceType = Static<typeof CreateDataSourceSchema>
export type UpdateDataSourceType = Static<typeof UpdateDataSourceSchema>
export type TestDataSourceType = Static<typeof TestDataSourceSchema>
export type DataSourceQueryType = Static<typeof DataSourceQuerySchema>
export type DataSourceListQueryType = Static<typeof DataSourceListQuerySchema>
export type DataSourceResponseType = Static<typeof DataSourceResponseSchema>
export type DataSourceListResponseType = Static<typeof DataSourceListResponseSchema>
export type DataSourceStatsResponseType = Static<typeof DataSourceStatsResponseSchema>
export type DataSourceHealthResponseType = Static<typeof DataSourceHealthResponseSchema>
export type DataSourceUsageResponseType = Static<typeof DataSourceUsageResponseSchema>
export type DataSourceSchemaResponseType = Static<typeof DataSourceSchemaResponseSchema>
export type DataSourceTestResultResponseType = Static<typeof DataSourceTestResultResponseSchema>
export type DataSourceQueryResultResponseType = Static<typeof DataSourceQueryResultResponseSchema>
export type DataSourceTemplatesResponseType = Static<typeof DataSourceTemplatesResponseSchema>
export type DataSourceErrorType = Static<typeof DataSourceErrorSchema>