/**
 * Report Builder System Types
 * 
 * Comprehensive type definitions for the low-code report builder system
 */

// Base entity interfaces matching database schema

export interface ReportDataSource {
  id: string
  name: string
  description?: string
  type: DataSourceType
  connectionConfig: Record<string, any>
  connectionString?: string
  headers?: Record<string, string>
  authConfig?: Record<string, any>
  isActive: boolean
  requiresAuth: boolean
  timeoutSeconds: number
  maxRows: number
  dataClassification: DataClassification
  allowedTables?: string[]
  allowedEndpoints?: string[]
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
  lastTestedAt?: Date
  lastTestResult?: DataSourceTestResult
}

export interface ReportTemplate {
  id: string
  name: string
  description?: string
  slug: string
  type: ReportType
  format: ReportFormat
  templateConfig: TemplateConfig
  styleConfig?: StyleConfig
  layoutConfig?: LayoutConfig
  dataSourceId?: string
  queryTemplate?: string
  dataTransform?: DataTransformConfig
  isPublic: boolean
  isActive: boolean
  requiresAuth: boolean
  cacheEnabled: boolean
  cacheDurationMinutes: number
  accessLevel: AccessLevel
  allowedRoles?: string[]
  allowedUsers?: string[]
  version: number
  parentTemplateId?: string
  isCurrentVersion: boolean
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
  lastUsedAt?: Date
  usageCount: number
}

export interface ReportParameter {
  id: string
  templateId: string
  name: string
  label: string
  description?: string
  type: ParameterType
  inputType: InputType
  isRequired: boolean
  defaultValue?: any
  validationRules?: ValidationRules
  options?: ParameterOption[]
  placeholder?: string
  sortOrder: number
  isVisible: boolean
  isFilterable: boolean
  groupName?: string
}

export interface ReportInstance {
  id: string
  templateId: string
  parameters: Record<string, any>
  generatedData?: any
  generatedHtml?: string
  dataRowCount?: number
  dataSizeBytes?: number
  status: GenerationStatus
  errorMessage?: string
  errorDetails?: any
  generationDurationMs?: number
  isCached: boolean
  cacheExpiresAt?: Date
  cacheKey?: string
  createdBy?: string
  clientIp?: string
  userAgent?: string
  sessionId?: string
  correlationId?: string
  createdAt: Date
  completedAt?: Date
  lastAccessedAt?: Date
  accessCount: number
}

export interface ReportSchedule {
  id: string
  templateId: string
  name: string
  description?: string
  cronExpression: string
  parameters: Record<string, any>
  outputFormat: ReportFormat
  deliveryConfig?: DeliveryConfig
  recipients?: string[]
  storeResult: boolean
  retentionDays: number
  isActive: boolean
  nextRunAt?: Date
  lastRunAt?: Date
  lastRunStatus?: ScheduleStatus
  lastRunError?: string
  consecutiveFailures: number
  createdBy: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface ReportExport {
  id: string
  instanceId: string
  templateId: string
  format: ExportFormat
  exportConfig?: ExportConfig
  fileSizeBytes?: number
  fileName?: string
  storageFileId?: string
  downloadUrl?: string
  urlExpiresAt?: Date
  status: ExportStatus
  errorMessage?: string
  exportDurationMs?: number
  createdBy?: string
  createdAt: Date
  completedAt?: Date
  lastDownloadedAt?: Date
  downloadCount: number
}

export interface ReportShare {
  id: string
  templateId: string
  sharedBy: string
  sharedWith?: string
  isPublic: boolean
  publicToken?: string
  canView: boolean
  canExport: boolean
  canSchedule: boolean
  canShare: boolean
  allowedFormats?: ExportFormat[]
  parameterOverrides?: Record<string, any>
  expiresAt?: Date
  maxUses?: number
  useCount: number
  requiresPassword: boolean
  passwordHash?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastAccessedAt?: Date
}

export interface ReportAnalytics {
  id: string
  templateId?: string
  instanceId?: string
  eventType: AnalyticsEventType
  eventCategory: string
  eventData?: any
  durationMs?: number
  dataRows?: number
  dataSizeBytes?: number
  cacheHit?: boolean
  userId?: string
  sessionId?: string
  clientIp?: string
  userAgent?: string
  referrer?: string
  errorCode?: string
  errorMessage?: string
  errorStack?: string
  correlationId?: string
  createdAt: Date
}

// Enum types

export type DataSourceType = 'database' | 'api' | 'file' | 'static'

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted'

export type ReportType = 'table' | 'chart' | 'dashboard' | 'document' | 'custom'

export type ReportFormat = 'html' | 'pdf' | 'excel' | 'csv' | 'json' | 'image'

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'png' | 'jpeg'

export type AccessLevel = 'private' | 'shared' | 'organization' | 'public'

export type ParameterType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'array' | 'select'

export type InputType = 'text' | 'number' | 'checkbox' | 'date' | 'datetime' | 'select' | 'multiselect' | 'textarea'

export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed' | 'cached'

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type ScheduleStatus = 'success' | 'failed' | 'pending'

export type AnalyticsEventType = 'view' | 'generate' | 'export' | 'share' | 'schedule' | 'error'

// Configuration interfaces

export interface TemplateConfig {
  // Table report configuration
  columns?: ColumnConfig[]
  filters?: FilterConfig[]
  sorting?: SortConfig[]
  grouping?: GroupConfig[]
  
  // Chart configuration
  chartType?: ChartType
  xAxis?: AxisConfig
  yAxis?: AxisConfig
  series?: SeriesConfig[]
  
  // Dashboard configuration
  widgets?: WidgetConfig[]
  layout?: DashboardLayout
  
  // Document configuration
  sections?: DocumentSection[]
  
  // Custom configuration
  customTemplate?: string
  customScript?: string
  
  // Static data for templates without data sources
  data?: any[]
}

export interface StyleConfig {
  theme?: string
  colors?: ColorScheme
  fonts?: FontConfig
  spacing?: SpacingConfig
  borders?: BorderConfig
  customCss?: string
}

export interface LayoutConfig {
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'a4' | 'letter' | 'legal' | 'a3'
  margins?: MarginConfig
  header?: HeaderConfig
  footer?: FooterConfig
  watermark?: WatermarkConfig
}

export interface DataTransformConfig {
  filters?: DataFilter[]
  aggregations?: DataAggregation[]
  calculations?: DataCalculation[]
  sorting?: DataSort[]
  grouping?: DataGroup[]
}

export interface ValidationRules {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  customRule?: string
  errorMessage?: string
}

export interface ParameterOption {
  value: any
  label: string
  disabled?: boolean
  group?: string
}

export interface DeliveryConfig {
  email?: EmailDeliveryConfig
  webhook?: WebhookDeliveryConfig
  storage?: StorageDeliveryConfig
}

export interface ExportConfig {
  quality?: number
  compression?: boolean
  password?: string
  metadata?: boolean
  watermark?: WatermarkConfig
}

// Detailed configuration interfaces

export interface ColumnConfig {
  name: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage'
  width?: number
  sortable?: boolean
  filterable?: boolean
  format?: string
  alignment?: 'left' | 'center' | 'right'
  visible?: boolean
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface FilterConfig {
  column: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in' | 'between'
  value?: any
  parameterName?: string
}

export interface SortConfig {
  column: string
  direction: 'asc' | 'desc'
  priority: number
}

export interface GroupConfig {
  column: string
  showTotals: boolean
  collapseGroups: boolean
}

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'bubble' | 'gauge' | 'funnel'

export interface AxisConfig {
  label?: string
  min?: number
  max?: number
  format?: string
  logarithmic?: boolean
}

export interface SeriesConfig {
  name: string
  dataColumn: string
  type?: ChartType
  color?: string
  yAxis?: number
}

export interface WidgetConfig {
  id: string
  type: 'chart' | 'table' | 'metric' | 'text' | 'image'
  title?: string
  position: { x: number; y: number; width: number; height: number }
  config: any
}

export interface DashboardLayout {
  columns: number
  rows: number
  gap: number
  responsive: boolean
}

export interface DocumentSection {
  type: 'text' | 'table' | 'chart' | 'image' | 'pagebreak'
  content?: string
  config?: any
  style?: any
}

export interface ColorScheme {
  primary?: string
  secondary?: string
  accent?: string
  background?: string
  text?: string
  border?: string
  success?: string
  warning?: string
  error?: string
}

export interface FontConfig {
  family?: string
  sizes?: {
    xs?: string
    sm?: string
    base?: string
    lg?: string
    xl?: string
    '2xl'?: string
  }
  weights?: {
    normal?: number
    bold?: number
  }
}

export interface SpacingConfig {
  xs?: string
  sm?: string
  md?: string
  lg?: string
  xl?: string
}

export interface BorderConfig {
  width?: string
  style?: 'solid' | 'dashed' | 'dotted'
  color?: string
  radius?: string
}

export interface MarginConfig {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export interface HeaderConfig {
  enabled?: boolean
  content?: string
  height?: number
  style?: any
}

export interface FooterConfig {
  enabled?: boolean
  content?: string
  height?: number
  style?: any
  showPageNumber?: boolean
}

export interface WatermarkConfig {
  text?: string
  image?: string
  opacity?: number
  position?: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  rotation?: number
}

export interface DataFilter {
  column: string
  operator: string
  value: any
}

export interface DataAggregation {
  column: string
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct'
  alias?: string
}

export interface DataCalculation {
  name: string
  expression: string
  type: 'number' | 'string' | 'date' | 'boolean'
}

export interface DataSort {
  column: string
  direction: 'asc' | 'desc'
}

export interface DataGroup {
  columns: string[]
  aggregations?: DataAggregation[]
}

export interface EmailDeliveryConfig {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body?: string
  attachments?: boolean
}

export interface WebhookDeliveryConfig {
  url: string
  method: 'POST' | 'PUT'
  headers?: Record<string, string>
  authentication?: {
    type: 'bearer' | 'basic' | 'apikey'
    credentials: Record<string, string>
  }
}

export interface StorageDeliveryConfig {
  path: string
  filename?: string
  overwrite?: boolean
}

export interface DataSourceTestResult {
  success: boolean
  message?: string
  connectionTime?: number
  recordCount?: number
  sampleData?: any[]
  errors?: string[]
}

// Request/Response interfaces

export interface CreateReportTemplateRequest {
  name: string
  description?: string
  slug: string
  type: ReportType
  format?: ReportFormat
  templateConfig: TemplateConfig
  styleConfig?: StyleConfig
  layoutConfig?: LayoutConfig
  dataSourceId?: string
  queryTemplate?: string
  dataTransform?: DataTransformConfig
  isPublic?: boolean
  requiresAuth?: boolean
  cacheEnabled?: boolean
  cacheDurationMinutes?: number
  accessLevel?: AccessLevel
  allowedRoles?: string[]
  allowedUsers?: string[]
  parameters?: Omit<ReportParameter, 'id' | 'templateId'>[]
}

export interface UpdateReportTemplateRequest extends Partial<CreateReportTemplateRequest> {
  updatedBy?: string
}

export interface GenerateReportRequest {
  parameters?: Record<string, any>
  format?: ReportFormat
  cacheOverride?: boolean
  correlationId?: string
}

export interface CreateDataSourceRequest {
  name: string
  description?: string
  type: DataSourceType
  connectionConfig: Record<string, any>
  connectionString?: string
  headers?: Record<string, string>
  authConfig?: Record<string, any>
  requiresAuth?: boolean
  timeoutSeconds?: number
  maxRows?: number
  dataClassification?: DataClassification
  allowedTables?: string[]
  allowedEndpoints?: string[]
}

export interface TestDataSourceRequest {
  testQuery?: string
  sampleSize?: number
}

export interface CreateScheduleRequest {
  templateId: string
  name: string
  description?: string
  cronExpression: string
  parameters: Record<string, any>
  outputFormat?: ReportFormat
  deliveryConfig?: DeliveryConfig
  recipients?: string[]
  storeResult?: boolean
  retentionDays?: number
}

export interface ShareReportRequest {
  templateId: string
  sharedWith?: string
  isPublic?: boolean
  permissions: {
    canView?: boolean
    canExport?: boolean
    canSchedule?: boolean
    canShare?: boolean
  }
  allowedFormats?: ExportFormat[]
  parameterOverrides?: Record<string, any>
  expiresAt?: Date
  maxUses?: number
  requiresPassword?: boolean
  password?: string
}

// Response interfaces

export interface ReportTemplateResponse extends ReportTemplate {
  dataSource?: ReportDataSource
  parameters?: ReportParameter[]
  shares?: ReportShare[]
  analytics?: {
    totalViews: number
    totalGenerations: number
    avgGenerationTime: number
    lastUsed?: Date
  }
}

export interface ReportInstanceResponse extends ReportInstance {
  template?: ReportTemplate
  exports?: ReportExport[]
}

export interface GenerateReportResponse {
  instance: ReportInstance
  html?: string
  data?: any
  cached: boolean
  generationTime: number
}

export interface ReportListResponse {
  templates: ReportTemplateResponse[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface ReportAnalyticsResponse {
  template: ReportTemplate
  metrics: {
    totalViews: number
    totalGenerations: number
    totalExports: number
    avgGenerationTime: number
    cacheHitRate: number
    errorRate: number
    popularParameters: Array<{ name: string; count: number }>
    usageByFormat: Record<ReportFormat, number>
    usageByUser: Array<{ userId: string; count: number }>
    usageOverTime: Array<{ date: string; count: number }>
  }
}

// Error types

export class ReportError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message)
    this.name = 'ReportError'
  }
}

export class DataSourceError extends ReportError {
  constructor(message: string, details?: any) {
    super(message, 'DATA_SOURCE_ERROR', 400, details)
    this.name = 'DataSourceError'
  }
}

export class TemplateError extends ReportError {
  constructor(message: string, details?: any) {
    super(message, 'TEMPLATE_ERROR', 400, details)
    this.name = 'TemplateError'
  }
}

export class GenerationError extends ReportError {
  constructor(message: string, details?: any) {
    super(message, 'GENERATION_ERROR', 500, details)
    this.name = 'GenerationError'
  }
}

export class ExportError extends ReportError {
  constructor(message: string, details?: any) {
    super(message, 'EXPORT_ERROR', 500, details)
    this.name = 'ExportError'
  }
}