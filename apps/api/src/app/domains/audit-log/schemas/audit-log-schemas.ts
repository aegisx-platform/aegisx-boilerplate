import { Type } from '@sinclair/typebox';

export const AuditActionSchema = Type.Union([
  Type.Literal('CREATE'),
  Type.Literal('READ'),
  Type.Literal('UPDATE'),
  Type.Literal('DELETE'),
  Type.Literal('LOGIN'),
  Type.Literal('LOGOUT'),
  Type.Literal('EXPORT'),
  Type.Literal('IMPORT'),
  Type.Literal('ACCESS_DENIED'),
  Type.Literal('PASSWORD_CHANGE'),
  Type.Literal('EMAIL_VERIFY'),
  Type.Literal('ROLE_ASSIGN'),
  Type.Literal('PERMISSION_GRANT')
]);

export const AuditStatusSchema = Type.Union([
  Type.Literal('success'),
  Type.Literal('failed'),
  Type.Literal('error')
]);

export const AuditLogSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  user_id: Type.Union([Type.String({ format: 'uuid' }), Type.Null()]),
  action: AuditActionSchema,
  resource_type: Type.String({ minLength: 1, maxLength: 100 }),
  resource_id: Type.Union([Type.String(), Type.Null()]),
  ip_address: Type.Union([Type.String({ format: 'ipv4' }), Type.String({ format: 'ipv6' }), Type.Null()]),
  user_agent: Type.Union([Type.String({ maxLength: 500 }), Type.Null()]),
  session_id: Type.Union([Type.String(), Type.Null()]),
  old_values: Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()]),
  new_values: Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()]),
  metadata: Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()]),
  status: AuditStatusSchema,
  error_message: Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]),
  created_at: Type.String({ format: 'date-time' })
});

export const CreateAuditLogSchema = Type.Object({
  user_id: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  action: AuditActionSchema,
  resource_type: Type.String({ minLength: 1, maxLength: 100 }),
  resource_id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  ip_address: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  user_agent: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  session_id: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  old_values: Type.Optional(Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()])),
  new_values: Type.Optional(Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()])),
  metadata: Type.Optional(Type.Union([Type.Record(Type.String(), Type.Any()), Type.Null()])),
  status: Type.Optional(AuditStatusSchema),
  error_message: Type.Optional(Type.Union([Type.String({ maxLength: 1000 }), Type.Null()]))
});

export const AuditLogQuerySchema = Type.Object({
  user_id: Type.Optional(Type.String({ format: 'uuid' })),
  action: Type.Optional(AuditActionSchema),
  resource_type: Type.Optional(Type.String()),
  resource_id: Type.Optional(Type.String()),
  status: Type.Optional(AuditStatusSchema),
  start_date: Type.Optional(Type.String({ format: 'date-time' })),
  end_date: Type.Optional(Type.String({ format: 'date-time' })),
  ip_address: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000, default: 50 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 })),
  sort_by: Type.Optional(Type.Union([
    Type.Literal('created_at'),
    Type.Literal('action'),
    Type.Literal('resource_type')
  ])),
  sort_order: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')]))
});

export const AuditLogResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Union([AuditLogSchema, Type.Array(AuditLogSchema)]),
  message: Type.Optional(Type.String())
});

export const AuditLogListResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Array(AuditLogSchema),
  pagination: Type.Object({
    total: Type.Integer(),
    page: Type.Integer(),
    limit: Type.Integer(),
    total_pages: Type.Integer()
  }),
  message: Type.Optional(Type.String())
});

export const AuditLogStatsSchema = Type.Object({
  total_logs: Type.Integer(),
  success_count: Type.Integer(),
  failed_count: Type.Integer(),
  error_count: Type.Integer(),
  actions_summary: Type.Record(Type.String(), Type.Integer()),
  resource_types_summary: Type.Record(Type.String(), Type.Integer()),
  last_24h_count: Type.Integer(),
  last_7d_count: Type.Integer(),
  last_30d_count: Type.Integer()
});

export const AuditLogStatsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: AuditLogStatsSchema,
  message: Type.Optional(Type.String())
});

export const ErrorResponseSchema = Type.Object({
  success: Type.Boolean({ default: false }),
  error: Type.String(),
  message: Type.String(),
  code: Type.Optional(Type.String()),
  details: Type.Optional(Type.Any())
});