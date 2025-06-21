import { Type } from '@sinclair/typebox';

/**
 * Audit Adapter Schemas
 * 
 * JSON Schema definitions for audit adapter endpoints using TypeBox
 */

// Common error response schema
export const AdapterErrorResponseSchema = Type.Object({
  success: Type.Boolean({ default: false }),
  error: Type.String()
});

// Adapter stats response schema
export const AdapterStatsResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    adapter_type: Type.String(),
    healthy: Type.Boolean(),
    processed_count: Type.Optional(Type.Number()),
    error_count: Type.Optional(Type.Number()),
    success_rate: Type.Optional(Type.String()),
    queue_length: Type.Optional(Type.Number()),
    additional_metrics: Type.Optional(Type.Record(Type.String(), Type.Any()))
  })
});

// Adapter health response schema
export const AdapterHealthResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    adapter_type: Type.String(),
    healthy: Type.Boolean(),
    timestamp: Type.String({ format: 'date-time' })
  })
});

// Adapter health error response schema
export const AdapterHealthErrorResponseSchema = Type.Object({
  success: Type.Boolean({ default: false }),
  error: Type.String(),
  data: Type.Object({
    adapter_type: Type.String(),
    healthy: Type.Boolean({ default: false })
  })
});

// Adapter info response schema
export const AdapterInfoResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    adapter_type: Type.String(),
    configuration: Type.Object({
      enabled: Type.Boolean(),
      batch_size: Type.Optional(Type.Number()),
      batch_timeout: Type.Optional(Type.Number()),
      queue_name: Type.Optional(Type.String()),
      max_retries: Type.Optional(Type.Number())
    }),
    capabilities: Type.Array(Type.String()),
    environment: Type.String()
  })
});

// Adapter queue status response schema
export const AdapterQueueResponseSchema = Type.Object({
  success: Type.Boolean(),
  data: Type.Object({
    adapter_type: Type.String(),
    queue_healthy: Type.Boolean(),
    queue_length: Type.Optional(Type.Number()),
    worker_running: Type.Optional(Type.Boolean()),
    worker_stats: Type.Optional(Type.Record(Type.String(), Type.Any())),
    timestamp: Type.String({ format: 'date-time' })
  })
});

// Complete schema definitions for each endpoint
export const AdapterStatsSchema = {
  summary: 'Get audit adapter statistics',
  description: 'Returns performance metrics and statistics for the current audit adapter',
  tags: ['audit-adapter'],
  security: [{ bearerAuth: [] }],
  response: {
    200: AdapterStatsResponseSchema,
    401: AdapterErrorResponseSchema,
    403: AdapterErrorResponseSchema,
    500: AdapterErrorResponseSchema
  }
};

export const AdapterHealthSchema = {
  summary: 'Check audit adapter health',
  description: 'Check if the audit adapter is healthy and functioning properly',
  tags: ['audit-adapter'],
  security: [{ bearerAuth: [] }],
  response: {
    200: AdapterHealthResponseSchema,
    401: AdapterErrorResponseSchema,
    403: AdapterErrorResponseSchema,
    503: AdapterHealthErrorResponseSchema
  }
};

export const AdapterInfoSchema = {
  summary: 'Get audit adapter information',
  description: 'Returns configuration and general information about the current audit adapter',
  tags: ['audit-adapter'],
  security: [{ bearerAuth: [] }],
  response: {
    200: AdapterInfoResponseSchema,
    401: AdapterErrorResponseSchema,
    403: AdapterErrorResponseSchema,
    500: AdapterErrorResponseSchema
  }
};

export const AdapterQueueSchema = {
  summary: 'Get audit queue status',
  description: 'Returns queue status and worker information (Redis adapter only)',
  tags: ['audit-adapter'],
  security: [{ bearerAuth: [] }],
  response: {
    200: AdapterQueueResponseSchema,
    400: AdapterErrorResponseSchema,
    401: AdapterErrorResponseSchema,
    403: AdapterErrorResponseSchema,
    500: AdapterErrorResponseSchema
  }
};