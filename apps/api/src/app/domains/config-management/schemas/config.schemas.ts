import { Type, Static } from '@sinclair/typebox';

// Environment enum
const ConfigEnvironmentSchema = Type.Union([
  Type.Literal('development'),
  Type.Literal('production'),
  Type.Literal('staging'),
  Type.Literal('test'),
]);

// Value type enum
const ConfigValueTypeSchema = Type.Union([
  Type.Literal('string'),
  Type.Literal('number'),
  Type.Literal('boolean'),
  Type.Literal('password'),
  Type.Literal('json'),
]);

// Input type enum
const ConfigInputTypeSchema = Type.Union([
  Type.Literal('text'),
  Type.Literal('password'),
  Type.Literal('number'),
  Type.Literal('select'),
  Type.Literal('textarea'),
  Type.Literal('checkbox'),
  Type.Literal('radio'),
]);

// Validation rules schema
const ValidationRulesSchema = Type.Optional(Type.Object({
  minLength: Type.Optional(Type.Number()),
  maxLength: Type.Optional(Type.Number()),
  min: Type.Optional(Type.Number()),
  max: Type.Optional(Type.Number()),
  pattern: Type.Optional(Type.String()),
  required: Type.Optional(Type.Boolean()),
  options: Type.Optional(Type.Array(Type.String())),
  custom: Type.Optional(Type.Record(Type.String(), Type.Any())),
}));

// === Request Schemas ===

// Create Configuration Request
export const CreateConfigurationRequestSchema = Type.Object({
  category: Type.String({ minLength: 1, maxLength: 50 }),
  configKey: Type.String({ minLength: 1, maxLength: 100 }),
  configValue: Type.Optional(Type.String()),
  valueType: Type.Optional(ConfigValueTypeSchema),
  isEncrypted: Type.Optional(Type.Boolean()),
  isActive: Type.Optional(Type.Boolean()),
  environment: Type.Optional(ConfigEnvironmentSchema),
  changeReason: Type.Optional(Type.String({ maxLength: 500 })),
});
export type CreateConfigurationRequest = Static<typeof CreateConfigurationRequestSchema>;

// Update Configuration Request
export const UpdateConfigurationRequestSchema = Type.Object({
  configValue: Type.Optional(Type.String()),
  valueType: Type.Optional(ConfigValueTypeSchema),
  isEncrypted: Type.Optional(Type.Boolean()),
  isActive: Type.Optional(Type.Boolean()),
  changeReason: Type.Optional(Type.String({ maxLength: 500 })),
});
export type UpdateConfigurationRequest = Static<typeof UpdateConfigurationRequestSchema>;

// Bulk Update Request
export const BulkUpdateConfigurationRequestSchema = Type.Object({
  updates: Type.Array(Type.Object({
    id: Type.Number(),
    configValue: Type.Optional(Type.String()),
    isActive: Type.Optional(Type.Boolean()),
  })),
  changeReason: Type.Optional(Type.String({ maxLength: 500 })),
  environment: Type.Optional(ConfigEnvironmentSchema),
});
export type BulkUpdateConfigurationRequest = Static<typeof BulkUpdateConfigurationRequestSchema>;

// Search Configuration Request
export const ConfigurationSearchParamsSchema = Type.Object({
  category: Type.Optional(Type.String()),
  configKey: Type.Optional(Type.String()),
  environment: Type.Optional(ConfigEnvironmentSchema),
  isActive: Type.Optional(Type.Boolean()),
  isEncrypted: Type.Optional(Type.Boolean()),
  groupName: Type.Optional(Type.String()),
  search: Type.Optional(Type.String()),
  page: Type.Optional(Type.Number({ minimum: 1 })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('configKey'),
    Type.Literal('category'),
    Type.Literal('updatedAt'),
    Type.Literal('createdAt'),
    Type.Literal('updated_at'),
    Type.Literal('created_at'),
  ])),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc'),
  ])),
});
export type ConfigurationSearchParams = Static<typeof ConfigurationSearchParamsSchema>;

// Create Metadata Request
export const CreateMetadataRequestSchema = Type.Object({
  category: Type.String({ minLength: 1, maxLength: 50 }),
  configKey: Type.String({ minLength: 1, maxLength: 100 }),
  displayName: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String()),
  inputType: Type.Optional(ConfigInputTypeSchema),
  validationRules: ValidationRulesSchema,
  defaultValue: Type.Optional(Type.String()),
  isRequired: Type.Optional(Type.Boolean()),
  sortOrder: Type.Optional(Type.Number()),
  groupName: Type.Optional(Type.String({ maxLength: 100 })),
  helpText: Type.Optional(Type.String()),
});
export type CreateMetadataRequest = Static<typeof CreateMetadataRequestSchema>;

// Update Metadata Request
export const UpdateMetadataRequestSchema = Type.Object({
  displayName: Type.Optional(Type.String({ minLength: 1, maxLength: 200 })),
  description: Type.Optional(Type.String()),
  inputType: Type.Optional(ConfigInputTypeSchema),
  validationRules: ValidationRulesSchema,
  defaultValue: Type.Optional(Type.String()),
  isRequired: Type.Optional(Type.Boolean()),
  sortOrder: Type.Optional(Type.Number()),
  groupName: Type.Optional(Type.String({ maxLength: 100 })),
  helpText: Type.Optional(Type.String()),
});
export type UpdateMetadataRequest = Static<typeof UpdateMetadataRequestSchema>;

// === Response Schemas ===

// System Configuration Response
export const SystemConfigurationResponseSchema = Type.Object({
  id: Type.Number(),
  category: Type.String(),
  configKey: Type.String(),
  configValue: Type.Union([Type.String(), Type.Null()]),
  valueType: ConfigValueTypeSchema,
  isEncrypted: Type.Boolean(),
  isActive: Type.Boolean(),
  environment: ConfigEnvironmentSchema,
  updatedBy: Type.Union([Type.Number(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});
export type SystemConfigurationResponse = Static<typeof SystemConfigurationResponseSchema>;

// Configuration with Metadata Response
export const ConfigurationWithMetadataResponseSchema = Type.Object({
  id: Type.Number(),
  category: Type.String(),
  configKey: Type.String(),
  configValue: Type.Union([Type.String(), Type.Null()]),
  valueType: ConfigValueTypeSchema,
  isEncrypted: Type.Boolean(),
  isActive: Type.Boolean(),
  environment: ConfigEnvironmentSchema,
  updatedBy: Type.Union([Type.Number(), Type.Null()]),
  createdAt: Type.String(),
  updatedAt: Type.String(),
  // Metadata fields
  displayName: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  inputType: Type.Optional(ConfigInputTypeSchema),
  validationRules: ValidationRulesSchema,
  isRequired: Type.Optional(Type.Boolean()),
  groupName: Type.Optional(Type.String()),
  helpText: Type.Optional(Type.String()),
});
export type ConfigurationWithMetadataResponse = Static<typeof ConfigurationWithMetadataResponseSchema>;

// Configuration Group Response
export const ConfigurationGroupResponseSchema = Type.Object({
  groupName: Type.String(),
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
  configs: Type.Array(ConfigurationWithMetadataResponseSchema),
});
export type ConfigurationGroupResponse = Static<typeof ConfigurationGroupResponseSchema>;

// Configuration Category Response
export const ConfigurationCategoryResponseSchema = Type.Object({
  category: Type.String(),
  displayName: Type.String(),
  description: Type.Optional(Type.String()),
  configs: Type.Array(ConfigurationWithMetadataResponseSchema),
  groups: Type.Optional(Type.Array(ConfigurationGroupResponseSchema)),
});
export type ConfigurationCategoryResponse = Static<typeof ConfigurationCategoryResponseSchema>;

// Search Result Response
export const ConfigurationSearchResultResponseSchema = Type.Object({
  configurations: Type.Array(ConfigurationWithMetadataResponseSchema),
  pagination: Type.Object({
    page: Type.Number(),
    limit: Type.Number(),
    total: Type.Number(),
    totalPages: Type.Number(),
  }),
  filters: Type.Object({
    categories: Type.Array(Type.String()),
    environments: Type.Array(ConfigEnvironmentSchema),
    groups: Type.Array(Type.String()),
  }),
});
export type ConfigurationSearchResultResponse = Static<typeof ConfigurationSearchResultResponseSchema>;

// Configuration History Response
export const ConfigurationHistoryResponseSchema = Type.Object({
  id: Type.Number(),
  configId: Type.Number(),
  oldValue: Type.Union([Type.String(), Type.Null()]),
  newValue: Type.Union([Type.String(), Type.Null()]),
  changedBy: Type.Union([Type.Number(), Type.Null()]),
  changeReason: Type.Union([Type.String(), Type.Null()]),
  ipAddress: Type.Union([Type.String(), Type.Null()]),
  userAgent: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
  // Optional joined fields
  config: Type.Optional(Type.Object({
    category: Type.String(),
    configKey: Type.String(),
    environment: ConfigEnvironmentSchema,
  })),
  changedByUser: Type.Optional(Type.Object({
    id: Type.Number(),
    email: Type.String(),
    username: Type.Optional(Type.String()),
  })),
});
export type ConfigurationHistoryResponse = Static<typeof ConfigurationHistoryResponseSchema>;

// Metadata Response
export const ConfigurationMetadataResponseSchema = Type.Object({
  id: Type.Number(),
  category: Type.String(),
  configKey: Type.String(),
  displayName: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  inputType: ConfigInputTypeSchema,
  validationRules: ValidationRulesSchema,
  defaultValue: Type.Union([Type.String(), Type.Null()]),
  isRequired: Type.Boolean(),
  sortOrder: Type.Number(),
  groupName: Type.Union([Type.String(), Type.Null()]),
  helpText: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});
export type ConfigurationMetadataResponse = Static<typeof ConfigurationMetadataResponseSchema>;

// Configuration Values Response (key-value pairs)
export const ConfigurationValuesResponseSchema = Type.Object({
  category: Type.String(),
  environment: ConfigEnvironmentSchema,
  values: Type.Record(Type.String(), Type.Any()),
  lastUpdated: Type.String(),
});
export type ConfigurationValuesResponse = Static<typeof ConfigurationValuesResponseSchema>;

// Force Reload Request
export const ForceReloadRequestSchema = Type.Object({
  category: Type.String({ minLength: 1, maxLength: 50 }),
  environment: ConfigEnvironmentSchema,
  changeReason: Type.Optional(Type.String({ maxLength: 500 })),
});
export type ForceReloadRequest = Static<typeof ForceReloadRequestSchema>;

// Reload Stats Response
export const ReloadStatsResponseSchema = Type.Object({
  services: Type.Record(Type.String(), Type.Object({
    successCount: Type.Number(),
    errorCount: Type.Number(),
    lastError: Type.Optional(Type.String()),
    lastReloadDuration: Type.Optional(Type.Number()),
    categories: Type.Optional(Type.Array(Type.String())),
    environments: Type.Optional(Type.Array(ConfigEnvironmentSchema)),
    priority: Type.Optional(Type.Number()),
  })),
  timestamp: Type.String(),
});
export type ReloadStatsResponse = Static<typeof ReloadStatsResponseSchema>;

// === Common Error Response ===
export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
  message: Type.String(),
  statusCode: Type.Number(),
  timestamp: Type.String(),
  path: Type.Optional(Type.String()),
  details: Type.Optional(Type.Any()),
});
export type ErrorResponse = Static<typeof ErrorResponseSchema>;

// === Success Response ===
export const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),  // Make message optional
  data: Type.Optional(Type.Any()),
  timestamp: Type.String(),
});
export type SuccessResponse = Static<typeof SuccessResponseSchema>;

// === Parameters ===

// ID Parameter
export const IdParamSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' }),
});
export type IdParam = Static<typeof IdParamSchema>;

// Category Parameter
export const CategoryParamSchema = Type.Object({
  category: Type.String({ minLength: 1, maxLength: 50 }),
});
export type CategoryParam = Static<typeof CategoryParamSchema>;

// Environment Query Parameter
export const EnvironmentQuerySchema = Type.Object({
  environment: Type.Optional(ConfigEnvironmentSchema),
  includeInactive: Type.Optional(Type.Boolean()),
});
export type EnvironmentQuery = Static<typeof EnvironmentQuerySchema>;