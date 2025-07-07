/**
 * Report Template Validation Schemas
 * 
 * TypeBox schemas for report template request/response validation
 */

import { Type, Static } from '@sinclair/typebox'

// Base enums
export const ReportTypeSchema = Type.Union([
  Type.Literal('table'),
  Type.Literal('chart'),
  Type.Literal('dashboard'),
  Type.Literal('document'),
  Type.Literal('custom')
])

export const ReportFormatSchema = Type.Union([
  Type.Literal('html'),
  Type.Literal('pdf'),
  Type.Literal('excel'),
  Type.Literal('csv'),
  Type.Literal('json'),
  Type.Literal('image')
])

export const AccessLevelSchema = Type.Union([
  Type.Literal('private'),
  Type.Literal('shared'),
  Type.Literal('organization'),
  Type.Literal('public')
])

export const ParameterTypeSchema = Type.Union([
  Type.Literal('string'),
  Type.Literal('number'),
  Type.Literal('boolean'),
  Type.Literal('date'),
  Type.Literal('datetime'),
  Type.Literal('array'),
  Type.Literal('select')
])

export const InputTypeSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('number'),
  Type.Literal('checkbox'),
  Type.Literal('date'),
  Type.Literal('datetime'),
  Type.Literal('select'),
  Type.Literal('multiselect'),
  Type.Literal('textarea')
])

// Template configuration schemas
export const ColumnConfigSchema = Type.Object({
  name: Type.String(),
  label: Type.String(),
  type: Type.Optional(Type.Union([
    Type.Literal('string'),
    Type.Literal('number'),
    Type.Literal('date'),
    Type.Literal('boolean'),
    Type.Literal('currency'),
    Type.Literal('percentage')
  ])),
  width: Type.Optional(Type.Number()),
  sortable: Type.Optional(Type.Boolean()),
  filterable: Type.Optional(Type.Boolean()),
  format: Type.Optional(Type.String()),
  alignment: Type.Optional(Type.Union([
    Type.Literal('left'),
    Type.Literal('center'),
    Type.Literal('right')
  ])),
  visible: Type.Optional(Type.Boolean()),
  aggregate: Type.Optional(Type.Union([
    Type.Literal('sum'),
    Type.Literal('avg'),
    Type.Literal('count'),
    Type.Literal('min'),
    Type.Literal('max')
  ]))
})

export const FilterConfigSchema = Type.Object({
  column: Type.String(),
  operator: Type.Union([
    Type.Literal('eq'),
    Type.Literal('ne'),
    Type.Literal('gt'),
    Type.Literal('lt'),
    Type.Literal('gte'),
    Type.Literal('lte'),
    Type.Literal('like'),
    Type.Literal('in'),
    Type.Literal('between')
  ]),
  value: Type.Optional(Type.Any()),
  parameterName: Type.Optional(Type.String())
})

export const SortConfigSchema = Type.Object({
  column: Type.String(),
  direction: Type.Union([Type.Literal('asc'), Type.Literal('desc')]),
  priority: Type.Number()
})

export const GroupConfigSchema = Type.Object({
  column: Type.String(),
  showTotals: Type.Optional(Type.Boolean()),
  collapseGroups: Type.Optional(Type.Boolean())
})

export const ChartTypeSchema = Type.Union([
  Type.Literal('bar'),
  Type.Literal('line'),
  Type.Literal('pie'),
  Type.Literal('area'),
  Type.Literal('scatter'),
  Type.Literal('bubble'),
  Type.Literal('gauge'),
  Type.Literal('funnel')
])

export const AxisConfigSchema = Type.Object({
  label: Type.Optional(Type.String()),
  min: Type.Optional(Type.Number()),
  max: Type.Optional(Type.Number()),
  format: Type.Optional(Type.String()),
  logarithmic: Type.Optional(Type.Boolean())
})

export const SeriesConfigSchema = Type.Object({
  name: Type.String(),
  dataColumn: Type.String(),
  type: Type.Optional(ChartTypeSchema),
  color: Type.Optional(Type.String()),
  yAxis: Type.Optional(Type.Number())
})

export const WidgetConfigSchema = Type.Object({
  id: Type.String(),
  type: Type.Union([
    Type.Literal('chart'),
    Type.Literal('table'),
    Type.Literal('metric'),
    Type.Literal('text'),
    Type.Literal('image')
  ]),
  title: Type.Optional(Type.String()),
  position: Type.Object({
    x: Type.Number(),
    y: Type.Number(),
    width: Type.Number(),
    height: Type.Number()
  }),
  config: Type.Any()
})

export const DashboardLayoutSchema = Type.Object({
  columns: Type.Number(),
  rows: Type.Number(),
  gap: Type.Optional(Type.Number()),
  responsive: Type.Optional(Type.Boolean())
})

export const DocumentSectionSchema = Type.Object({
  type: Type.Union([
    Type.Literal('text'),
    Type.Literal('table'),
    Type.Literal('chart'),
    Type.Literal('image'),
    Type.Literal('pagebreak')
  ]),
  content: Type.Optional(Type.String()),
  config: Type.Optional(Type.Any()),
  style: Type.Optional(Type.Any())
})

export const TemplateConfigSchema = Type.Object({
  // Table configuration
  columns: Type.Optional(Type.Array(ColumnConfigSchema)),
  filters: Type.Optional(Type.Array(FilterConfigSchema)),
  sorting: Type.Optional(Type.Array(SortConfigSchema)),
  grouping: Type.Optional(Type.Array(GroupConfigSchema)),
  
  // Chart configuration
  chartType: Type.Optional(ChartTypeSchema),
  xAxis: Type.Optional(AxisConfigSchema),
  yAxis: Type.Optional(AxisConfigSchema),
  series: Type.Optional(Type.Array(SeriesConfigSchema)),
  
  // Dashboard configuration
  widgets: Type.Optional(Type.Array(WidgetConfigSchema)),
  layout: Type.Optional(DashboardLayoutSchema),
  
  // Document configuration
  sections: Type.Optional(Type.Array(DocumentSectionSchema)),
  
  // Custom configuration
  customTemplate: Type.Optional(Type.String()),
  customScript: Type.Optional(Type.String()),
  
  // Static data
  data: Type.Optional(Type.Array(Type.Any()))
})

export const StyleConfigSchema = Type.Object({
  theme: Type.Optional(Type.String()),
  colors: Type.Optional(Type.Object({
    primary: Type.Optional(Type.String()),
    secondary: Type.Optional(Type.String()),
    accent: Type.Optional(Type.String()),
    background: Type.Optional(Type.String()),
    text: Type.Optional(Type.String()),
    border: Type.Optional(Type.String()),
    success: Type.Optional(Type.String()),
    warning: Type.Optional(Type.String()),
    error: Type.Optional(Type.String())
  })),
  fonts: Type.Optional(Type.Object({
    family: Type.Optional(Type.String()),
    sizes: Type.Optional(Type.Any()),
    weights: Type.Optional(Type.Any())
  })),
  spacing: Type.Optional(Type.Any()),
  borders: Type.Optional(Type.Any()),
  customCss: Type.Optional(Type.String())
})

export const LayoutConfigSchema = Type.Object({
  orientation: Type.Optional(Type.Union([
    Type.Literal('portrait'),
    Type.Literal('landscape')
  ])),
  pageSize: Type.Optional(Type.Union([
    Type.Literal('a4'),
    Type.Literal('letter'),
    Type.Literal('legal'),
    Type.Literal('a3')
  ])),
  margins: Type.Optional(Type.Object({
    top: Type.Optional(Type.Number()),
    right: Type.Optional(Type.Number()),
    bottom: Type.Optional(Type.Number()),
    left: Type.Optional(Type.Number())
  })),
  header: Type.Optional(Type.Object({
    enabled: Type.Optional(Type.Boolean()),
    content: Type.Optional(Type.String()),
    height: Type.Optional(Type.Number()),
    style: Type.Optional(Type.Any())
  })),
  footer: Type.Optional(Type.Object({
    enabled: Type.Optional(Type.Boolean()),
    content: Type.Optional(Type.String()),
    height: Type.Optional(Type.Number()),
    style: Type.Optional(Type.Any()),
    showPageNumber: Type.Optional(Type.Boolean())
  })),
  watermark: Type.Optional(Type.Object({
    text: Type.Optional(Type.String()),
    image: Type.Optional(Type.String()),
    opacity: Type.Optional(Type.Number()),
    position: Type.Optional(Type.Union([
      Type.Literal('center'),
      Type.Literal('top-left'),
      Type.Literal('top-right'),
      Type.Literal('bottom-left'),
      Type.Literal('bottom-right')
    ])),
    rotation: Type.Optional(Type.Number())
  }))
})

export const DataTransformConfigSchema = Type.Object({
  filters: Type.Optional(Type.Array(Type.Object({
    column: Type.String(),
    operator: Type.String(),
    value: Type.Any()
  }))),
  aggregations: Type.Optional(Type.Array(Type.Object({
    column: Type.String(),
    function: Type.Union([
      Type.Literal('sum'),
      Type.Literal('avg'),
      Type.Literal('count'),
      Type.Literal('min'),
      Type.Literal('max'),
      Type.Literal('distinct')
    ]),
    alias: Type.Optional(Type.String())
  }))),
  calculations: Type.Optional(Type.Array(Type.Object({
    name: Type.String(),
    expression: Type.String(),
    type: Type.Union([
      Type.Literal('number'),
      Type.Literal('string'),
      Type.Literal('date'),
      Type.Literal('boolean')
    ])
  }))),
  sorting: Type.Optional(Type.Array(Type.Object({
    column: Type.String(),
    direction: Type.Union([Type.Literal('asc'), Type.Literal('desc')])
  }))),
  grouping: Type.Optional(Type.Array(Type.Object({
    columns: Type.Array(Type.String()),
    aggregations: Type.Optional(Type.Array(Type.Any()))
  })))
})

export const ValidationRulesSchema = Type.Object({
  min: Type.Optional(Type.Number()),
  max: Type.Optional(Type.Number()),
  minLength: Type.Optional(Type.Number()),
  maxLength: Type.Optional(Type.Number()),
  pattern: Type.Optional(Type.String()),
  customRule: Type.Optional(Type.String()),
  errorMessage: Type.Optional(Type.String())
})

export const ParameterOptionSchema = Type.Object({
  value: Type.Any(),
  label: Type.String(),
  disabled: Type.Optional(Type.Boolean()),
  group: Type.Optional(Type.String())
})

// Parameter schemas
export const ReportParameterSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  label: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  type: ParameterTypeSchema,
  inputType: InputTypeSchema,
  isRequired: Type.Optional(Type.Boolean()),
  defaultValue: Type.Optional(Type.Any()),
  validationRules: Type.Optional(ValidationRulesSchema),
  options: Type.Optional(Type.Array(ParameterOptionSchema)),
  placeholder: Type.Optional(Type.String({ maxLength: 255 })),
  sortOrder: Type.Optional(Type.Number({ minimum: 0 })),
  isVisible: Type.Optional(Type.Boolean()),
  isFilterable: Type.Optional(Type.Boolean()),
  groupName: Type.Optional(Type.String({ maxLength: 255 }))
})

// Request schemas
export const CreateReportTemplateSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  slug: Type.String({ 
    minLength: 1, 
    maxLength: 255,
    pattern: '^[a-z0-9-_]+$'
  }),
  type: ReportTypeSchema,
  format: Type.Optional(ReportFormatSchema),
  templateConfig: TemplateConfigSchema,
  styleConfig: Type.Optional(StyleConfigSchema),
  layoutConfig: Type.Optional(LayoutConfigSchema),
  dataSourceId: Type.Optional(Type.String({ format: 'uuid' })),
  queryTemplate: Type.Optional(Type.String({ maxLength: 10000 })),
  dataTransform: Type.Optional(DataTransformConfigSchema),
  isPublic: Type.Optional(Type.Boolean()),
  requiresAuth: Type.Optional(Type.Boolean()),
  cacheEnabled: Type.Optional(Type.Boolean()),
  cacheDurationMinutes: Type.Optional(Type.Number({ minimum: 1, maximum: 10080 })), // Max 1 week
  accessLevel: Type.Optional(AccessLevelSchema),
  allowedRoles: Type.Optional(Type.Array(Type.String())),
  allowedUsers: Type.Optional(Type.Array(Type.String({ format: 'uuid' }))),
  parameters: Type.Optional(Type.Array(ReportParameterSchema))
})

export const UpdateReportTemplateSchema = Type.Partial(CreateReportTemplateSchema)

export const DuplicateTemplateSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  slug: Type.String({ 
    minLength: 1, 
    maxLength: 255,
    pattern: '^[a-z0-9-_]+$'
  })
})

// Query schemas
export const TemplateListQuerySchema = Type.Object({
  type: Type.Optional(ReportTypeSchema),
  format: Type.Optional(ReportFormatSchema),
  accessLevel: Type.Optional(AccessLevelSchema),
  isActive: Type.Optional(Type.Boolean()),
  isPublic: Type.Optional(Type.Boolean()),
  dataSourceId: Type.Optional(Type.String({ format: 'uuid' })),
  search: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  createdBy: Type.Optional(Type.String({ format: 'uuid' })),
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('name'),
    Type.Literal('created_at'),
    Type.Literal('updated_at'),
    Type.Literal('last_used_at'),
    Type.Literal('usage_count')
  ])),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ])),
  includeParameters: Type.Optional(Type.Boolean())
})

export const TemplateSearchQuerySchema = Type.Object({
  q: Type.String({ minLength: 2, maxLength: 255 }),
  type: Type.Optional(ReportTypeSchema),
  format: Type.Optional(ReportFormatSchema),
  accessLevel: Type.Optional(AccessLevelSchema),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 }))
})

// Response schemas
export const ReportTemplateResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  slug: Type.String(),
  type: ReportTypeSchema,
  format: ReportFormatSchema,
  templateConfig: TemplateConfigSchema,
  styleConfig: Type.Optional(StyleConfigSchema),
  layoutConfig: Type.Optional(LayoutConfigSchema),
  dataSourceId: Type.Optional(Type.String({ format: 'uuid' })),
  queryTemplate: Type.Optional(Type.String()),
  dataTransform: Type.Optional(DataTransformConfigSchema),
  isPublic: Type.Boolean(),
  isActive: Type.Boolean(),
  requiresAuth: Type.Boolean(),
  cacheEnabled: Type.Boolean(),
  cacheDurationMinutes: Type.Number(),
  accessLevel: AccessLevelSchema,
  allowedRoles: Type.Optional(Type.Array(Type.String())),
  allowedUsers: Type.Optional(Type.Array(Type.String())),
  version: Type.Number(),
  parentTemplateId: Type.Optional(Type.String({ format: 'uuid' })),
  isCurrentVersion: Type.Boolean(),
  createdBy: Type.String({ format: 'uuid' }),
  updatedBy: Type.Optional(Type.String({ format: 'uuid' })),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  lastUsedAt: Type.Optional(Type.String({ format: 'date-time' })),
  usageCount: Type.Number(),
  parameters: Type.Optional(Type.Array(Type.Object({
    ...ReportParameterSchema.properties,
    id: Type.String({ format: 'uuid' }),
    templateId: Type.String({ format: 'uuid' })
  }))),
  analytics: Type.Optional(Type.Object({
    totalViews: Type.Number(),
    totalGenerations: Type.Number(),
    avgGenerationTime: Type.Number(),
    lastUsed: Type.Optional(Type.String({ format: 'date-time' }))
  }))
})

export const TemplateListResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(ReportTemplateResponseSchema),
  pagination: Type.Object({
    page: Type.Number(),
    limit: Type.Number(),
    total: Type.Number(),
    hasMore: Type.Boolean(),
    totalPages: Type.Number()
  })
})

export const TemplateStatsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    totalTemplates: Type.Number(),
    activeTemplates: Type.Number(),
    publicTemplates: Type.Number(),
    templatesByType: Type.Record(ReportTypeSchema, Type.Number()),
    templatesByFormat: Type.Record(ReportFormatSchema, Type.Number()),
    templatesByAccessLevel: Type.Record(AccessLevelSchema, Type.Number()),
    avgUsageCount: Type.Number(),
    mostUsedTemplate: Type.Optional(Type.String()),
    recentlyCreated: Type.Number(),
    recentlyUsed: Type.Number()
  })
})

// Error schemas
export const TemplateErrorSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any())
  })
})

// Success response schema
export const TemplateSuccessResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: ReportTemplateResponseSchema
})

// Type exports for TypeScript
export type CreateReportTemplateType = Static<typeof CreateReportTemplateSchema>
export type UpdateReportTemplateType = Static<typeof UpdateReportTemplateSchema>
export type DuplicateTemplateType = Static<typeof DuplicateTemplateSchema>
export type TemplateListQueryType = Static<typeof TemplateListQuerySchema>
export type TemplateSearchQueryType = Static<typeof TemplateSearchQuerySchema>
export type ReportTemplateResponseType = Static<typeof ReportTemplateResponseSchema>
export type TemplateListResponseType = Static<typeof TemplateListResponseSchema>
export type TemplateStatsResponseType = Static<typeof TemplateStatsResponseSchema>
export type TemplateErrorType = Static<typeof TemplateErrorSchema>
export type TemplateSuccessResponseType = Static<typeof TemplateSuccessResponseSchema>