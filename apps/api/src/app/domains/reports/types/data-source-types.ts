/**
 * Data Source Types for Report Builder
 * 
 * Type definitions for various data source connections and configurations
 */


// Base data source configuration
export interface BaseDataSourceConfig {
  timeoutSeconds?: number
  maxRows?: number
  retryAttempts?: number
  retryDelay?: number
  enableCache?: boolean
  cacheDuration?: number
}

// Database data source configurations
export interface DatabaseConfig extends BaseDataSourceConfig {
  type: 'database'
  engine: DatabaseEngine
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  connectionString?: string
  pool?: {
    min?: number
    max?: number
    acquireTimeoutMillis?: number
    idleTimeoutMillis?: number
  }
  queryTimeout?: number
  allowedSchemas?: string[]
  allowedTables?: string[]
  readOnly?: boolean
}

export interface PostgreSQLConfig extends DatabaseConfig {
  engine: 'postgresql'
  schema?: string
  searchPath?: string[]
}

export interface MySQLConfig extends DatabaseConfig {
  engine: 'mysql'
  charset?: string
  timezone?: string
}

export interface SQLiteConfig extends Omit<DatabaseConfig, 'host' | 'port' | 'username' | 'password'> {
  engine: 'sqlite'
  filePath: string
}

export interface MongoDBConfig extends BaseDataSourceConfig {
  type: 'database'
  engine: 'mongodb'
  connectionString: string
  database: string
  collection?: string
  authSource?: string
  ssl?: boolean
  allowedCollections?: string[]
}

// API data source configurations
export interface APIConfig extends BaseDataSourceConfig {
  type: 'api'
  baseUrl: string
  authentication?: APIAuthentication
  headers?: Record<string, string>
  endpoints?: APIEndpoint[]
  rateLimiting?: {
    requestsPerSecond?: number
    requestsPerMinute?: number
    requestsPerHour?: number
  }
}

export interface RESTAPIConfig extends APIConfig {
  apiType: 'rest'
  pagination?: {
    type: 'offset' | 'cursor' | 'page'
    limitParam?: string
    offsetParam?: string
    pageParam?: string
    cursorParam?: string
    maxPageSize?: number
  }
}

export interface GraphQLConfig extends APIConfig {
  apiType: 'graphql'
  endpoint: string
  introspectionEnabled?: boolean
  maxDepth?: number
  maxComplexity?: number
}

export interface WebhookConfig extends BaseDataSourceConfig {
  type: 'webhook'
  webhookUrl: string
  secret?: string
  authentication?: APIAuthentication
  retryPolicy?: {
    maxAttempts: number
    backoffMultiplier: number
    maxDelay: number
  }
}

// File data source configurations
export interface FileConfig extends BaseDataSourceConfig {
  type: 'file'
  fileType: FileType
  source: FileSource
  encoding?: string
  delimiter?: string
  hasHeader?: boolean
  skipRows?: number
  maxFileSize?: number
  compression?: 'gzip' | 'zip' | 'none'
}

export interface CSVConfig extends FileConfig {
  fileType: 'csv'
  delimiter: string
  quoteChar?: string
  escapeChar?: string
  nullValues?: string[]
}

export interface ExcelConfig extends FileConfig {
  fileType: 'excel'
  sheetName?: string
  sheetIndex?: number
  range?: string
}

export interface JSONConfig extends FileConfig {
  fileType: 'json'
  rootPath?: string
  arrayPath?: string
  flattenObjects?: boolean
}

export interface XMLConfig extends FileConfig {
  fileType: 'xml'
  rootElement?: string
  recordElement?: string
  namespaces?: Record<string, string>
}

// Static data source configuration
export interface StaticConfig extends BaseDataSourceConfig {
  type: 'static'
  data: any[]
  schema?: StaticDataSchema
}

// Authentication configurations
export interface APIAuthentication {
  type: AuthenticationType
  credentials: AuthenticationCredentials
}

export interface BasicAuth {
  type: 'basic'
  credentials: {
    username: string
    password: string
  }
}

export interface BearerAuth {
  type: 'bearer'
  credentials: {
    token: string
  }
}

export interface APIKeyAuth {
  type: 'apikey'
  credentials: {
    key: string
    value: string
    location: 'header' | 'query' | 'body'
  }
}

export interface OAuth2Auth {
  type: 'oauth2'
  credentials: {
    clientId: string
    clientSecret: string
    accessToken?: string
    refreshToken?: string
    tokenUrl: string
    scopes?: string[]
  }
}

export interface CustomAuth {
  type: 'custom'
  credentials: Record<string, any>
}

// File source configurations
export interface FileSource {
  type: FileSourceType
  config: FileSourceConfig
}

export interface LocalFileSource {
  type: 'local'
  config: {
    path: string
    watchForChanges?: boolean
  }
}

export interface URLFileSource {
  type: 'url'
  config: {
    url: string
    authentication?: APIAuthentication
    headers?: Record<string, string>
    followRedirects?: boolean
  }
}

export interface StorageFileSource {
  type: 'storage'
  config: {
    fileId: string
    provider?: string
  }
}

export interface S3FileSource {
  type: 's3'
  config: {
    bucket: string
    key: string
    region: string
    accessKeyId: string
    secretAccessKey: string
  }
}

// API endpoint configuration
export interface APIEndpoint {
  name: string
  path: string
  method: HTTPMethod
  parameters?: APIParameter[]
  responseType: 'json' | 'xml' | 'csv' | 'text'
  responseSchema?: any
  cacheable?: boolean
  rateLimit?: number
}

export interface APIParameter {
  name: string
  type: ParameterType
  location: 'path' | 'query' | 'header' | 'body'
  required?: boolean
  defaultValue?: any
  description?: string
}

// Schema definitions
export interface StaticDataSchema {
  fields: StaticDataField[]
}

export interface StaticDataField {
  name: string
  type: DataType
  nullable?: boolean
  defaultValue?: any
  description?: string
}

// Query and execution interfaces
export interface DataSourceQuery {
  dataSourceId: string
  query: string | QueryObject
  parameters?: Record<string, any>
  limit?: number
  offset?: number
  timeout?: number
  cacheKey?: string
  cacheDuration?: number
}

export interface QueryObject {
  // For databases
  sql?: string
  table?: string
  select?: string[]
  where?: WhereClause[]
  orderBy?: OrderByClause[]
  groupBy?: string[]
  having?: WhereClause[]
  joins?: JoinClause[]
  
  // For APIs
  endpoint?: string
  method?: HTTPMethod
  path?: string
  query?: Record<string, any>
  body?: any
  
  // For NoSQL databases
  collection?: string
  filter?: any
  sort?: any
  projection?: any
  
  // For files
  filePath?: string
  sheetName?: string
  range?: string
}

export interface WhereClause {
  column: string
  operator: WhereOperator
  value: any
  logical?: 'AND' | 'OR'
}

export interface OrderByClause {
  column: string
  direction: 'ASC' | 'DESC'
}

export interface JoinClause {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL'
  table: string
  on: string
  alias?: string
}

export interface DataSourceResult {
  success: boolean
  data?: any[]
  columns?: DataColumn[]
  totalRows?: number
  executionTime?: number
  cached?: boolean
  errors?: string[]
  warnings?: string[]
  metadata?: {
    source: string
    query: string
    parameters: Record<string, any>
    timestamp: Date
  }
}

export interface DataColumn {
  name: string
  type: DataType
  nullable?: boolean
  length?: number
  precision?: number
  scale?: number
  description?: string
}

// Test and validation interfaces
export interface DataSourceTestRequest {
  config: DataSourceConfig
  testQuery?: string
  sampleSize?: number
  validateSchema?: boolean
}

export interface DataSourceTestResult {
  success: boolean
  connectionTime?: number
  queryTime?: number
  recordCount?: number
  sampleData?: any[]
  schema?: DataColumn[]
  errors?: string[]
  warnings?: string[]
  capabilities?: DataSourceCapabilities
}

export interface DataSourceCapabilities {
  supportsJoins: boolean
  supportsSubqueries: boolean
  supportsTransactions: boolean
  supportsStoredProcedures: boolean
  supportsFullTextSearch: boolean
  supportedFunctions: string[]
  maxConnections?: number
  maxQueryLength?: number
  supportedDataTypes: DataType[]
}

// Connection management
export interface DataSourceConnection {
  id: string
  dataSourceId: string
  isActive: boolean
  connectionPool?: any
  lastUsed: Date
  totalQueries: number
  failedQueries: number
  avgResponseTime: number
}

export interface ConnectionPoolStats {
  total: number
  active: number
  idle: number
  waiting: number
  min: number
  max: number
}

// Enum types
export type DatabaseEngine = 
  | 'postgresql' 
  | 'mysql' 
  | 'sqlite' 
  | 'mongodb' 
  | 'mssql' 
  | 'oracle'

export type FileType = 'csv' | 'excel' | 'json' | 'xml' | 'parquet' | 'text'

export type FileSourceType = 'local' | 'url' | 'storage' | 's3' | 'ftp' | 'sftp'

export type AuthenticationType = 'basic' | 'bearer' | 'apikey' | 'oauth2' | 'custom'

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type ParameterType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'

export type DataType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'float' 
  | 'boolean' 
  | 'date' 
  | 'datetime' 
  | 'timestamp' 
  | 'json' 
  | 'binary'

export type WhereOperator = 
  | '=' 
  | '!=' 
  | '<' 
  | '<=' 
  | '>' 
  | '>=' 
  | 'LIKE' 
  | 'ILIKE' 
  | 'IN' 
  | 'NOT IN' 
  | 'BETWEEN' 
  | 'IS NULL' 
  | 'IS NOT NULL'

// Union types for configuration
export type DataSourceConfig = 
  | DatabaseConfig 
  | APIConfig 
  | FileConfig 
  | StaticConfig

export type AuthenticationCredentials = 
  | BasicAuth['credentials']
  | BearerAuth['credentials']
  | APIKeyAuth['credentials']
  | OAuth2Auth['credentials']
  | Record<string, any>

export type FileSourceConfig = 
  | LocalFileSource['config']
  | URLFileSource['config']
  | StorageFileSource['config']
  | S3FileSource['config']

// Data source factory interfaces
export interface DataSourceFactory {
  createConnection(config: DataSourceConfig): Promise<DataSourceConnection>
  testConnection(config: DataSourceConfig): Promise<DataSourceTestResult>
  executeQuery(connection: DataSourceConnection, query: DataSourceQuery): Promise<DataSourceResult>
  closeConnection(connection: DataSourceConnection): Promise<void>
  validateConfig(config: DataSourceConfig): Promise<ValidationResult>
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion?: string
}

// Caching interfaces
export interface DataSourceCache {
  get(key: string): Promise<DataSourceResult | null>
  set(key: string, result: DataSourceResult, ttl?: number): Promise<void>
  invalidate(pattern: string): Promise<void>
  clear(): Promise<void>
  stats(): Promise<CacheStats>
}

export interface CacheStats {
  hitRate: number
  missRate: number
  totalHits: number
  totalMisses: number
  totalKeys: number
  memoryUsage: number
}

// Security and encryption
export interface DataSourceSecurity {
  encryptConfig(config: any): Promise<string>
  decryptConfig(encryptedConfig: string): Promise<any>
  validateAccess(userId: string, dataSourceId: string, operation: string): Promise<boolean>
  auditAccess(userId: string, dataSourceId: string, operation: string, metadata?: any): Promise<void>
}

// Monitoring and health
export interface DataSourceHealthCheck {
  checkHealth(dataSourceId: string): Promise<HealthStatus>
  getMetrics(dataSourceId: string): Promise<DataSourceMetrics>
  monitorPerformance(dataSourceId: string): Promise<PerformanceMetrics>
}

export interface HealthStatus {
  healthy: boolean
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  lastCheck: Date
  responseTime?: number
  uptime?: number
}

export interface DataSourceMetrics {
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  avgResponseTime: number
  maxResponseTime: number
  minResponseTime: number
  totalDataTransferred: number
  activeConnections: number
  errorRate: number
  throughput: number
  lastHour: TimeBasedMetrics
  lastDay: TimeBasedMetrics
  lastWeek: TimeBasedMetrics
}

export interface TimeBasedMetrics {
  queries: number
  errors: number
  avgResponseTime: number
  dataTransferred: number
}

export interface PerformanceMetrics {
  queriesPerSecond: number
  connectionsPerSecond: number
  bytesPerSecond: number
  errorRatePercent: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
}

// Real-time data source interfaces
export interface RealtimeDataSource {
  subscribe(query: DataSourceQuery, callback: (data: any) => void): Promise<string>
  unsubscribe(subscriptionId: string): Promise<void>
  isRealtime(): boolean
  getSupportedEvents(): string[]
}

export interface WebSocketConfig extends BaseDataSourceConfig {
  type: 'websocket'
  url: string
  protocols?: string[]
  headers?: Record<string, string>
  authentication?: APIAuthentication
  heartbeatInterval?: number
  reconnectAttempts?: number
  reconnectDelay?: number
}

export interface SSEConfig extends BaseDataSourceConfig {
  type: 'sse'
  url: string
  headers?: Record<string, string>
  authentication?: APIAuthentication
  retry?: number
  timeout?: number
}