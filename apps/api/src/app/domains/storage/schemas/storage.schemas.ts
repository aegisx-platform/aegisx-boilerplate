/**
 * Storage API Schemas
 *
 * TypeBox schemas for storage API endpoints validation and documentation
 */

import { Type, Static } from '@sinclair/typebox'

// Data Classification enum
export const DataClassificationSchema = Type.Union([
  Type.Literal('public'),
  Type.Literal('internal'),
  Type.Literal('confidential'),
  Type.Literal('restricted')
])

// File Status enum
export const FileStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('archived'),
  Type.Literal('deleted'),
  Type.Literal('corrupted')
])

// Upload Request Schema
export const UploadRequestSchema = Type.Object({
  filename: Type.String({ minLength: 1, maxLength: 255, description: 'Original filename' }),
  mimeType: Type.String({ minLength: 1, description: 'MIME type of the file' }),
  dataClassification: Type.Optional(DataClassificationSchema),
  tags: Type.Optional(Type.Array(Type.String())),
  customMetadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
  path: Type.Optional(Type.String({ description: 'Storage path for the file' })),
  encrypt: Type.Optional(Type.Boolean({ description: 'Whether to encrypt the file' })),
  overwrite: Type.Optional(Type.Boolean({ description: 'Whether to overwrite existing file' }))
})

// Upload Response Schema
export const UploadResponseSchema = Type.Object({
  success: Type.Boolean(),
  fileId: Type.String({ description: 'Unique file identifier' }),
  filename: Type.String(),
  size: Type.Number(),
  mimeType: Type.String(),
  checksum: Type.String(),
  url: Type.Optional(Type.String({ description: 'Access URL for the file' })),
  metadata: Type.Object({
    filename: Type.String(),
    originalName: Type.String(),
    mimeType: Type.String(),
    size: Type.Number(),
    checksum: Type.String(),
    provider: Type.String(),
    providerPath: Type.String(),
    dataClassification: DataClassificationSchema,
    encrypted: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
    createdBy: Type.Optional(Type.String())
  })
})

// Download Request Schema
export const DownloadRequestSchema = Type.Object({
  fileId: Type.String({ minLength: 1, description: 'File identifier to download' })
})

// File ID Params Schema
export const FileIdParamsSchema = Type.Object({
  fileId: Type.String({ minLength: 1, description: 'File identifier' })
})

// File Info Response Schema
export const FileInfoResponseSchema = Type.Object({
  fileId: Type.String(),
  filename: Type.String(),
  originalName: Type.String(),
  mimeType: Type.String(),
  size: Type.Number(),
  path: Type.String(),
  checksum: Type.String(),
  metadata: Type.Object({
    filename: Type.String(),
    originalName: Type.String(),
    mimeType: Type.String(),
    size: Type.Number(),
    checksum: Type.String(),
    provider: Type.String(),
    providerPath: Type.String(),
    dataClassification: DataClassificationSchema,
    encrypted: Type.Boolean(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
    createdBy: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    customMetadata: Type.Optional(Type.Record(Type.String(), Type.Any()))
  }),
  urls: Type.Object({
    download: Type.Optional(Type.String({ format: 'uri' }))
  }),
  permissions: Type.Object({
    canRead: Type.Boolean(),
    canWrite: Type.Boolean(),
    canDelete: Type.Boolean(),
    canShare: Type.Boolean(),
    allowedUsers: Type.Array(Type.String()),
    allowedRoles: Type.Array(Type.String())
  })
})

// List Files Request Schema
export const ListFilesRequestSchema = Type.Object({
  path: Type.Optional(Type.String({ description: 'Filter by path' })),
  pattern: Type.Optional(Type.String({ description: 'File name pattern' })),
  mimeType: Type.Optional(Type.String({ description: 'Filter by MIME type' })),
  dataClassification: Type.Optional(DataClassificationSchema),
  tags: Type.Optional(Type.Array(Type.String({ description: 'Filter by tags' }))),
  status: Type.Optional(FileStatusSchema),
  search: Type.Optional(Type.String({ description: 'Search in filename and metadata' })),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('filename'),
    Type.Literal('size'),
    Type.Literal('created_at'),
    Type.Literal('last_accessed_at')
  ])),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ])),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000, default: 50 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 }))
})

// List Files Response Schema
export const ListFilesResponseSchema = Type.Object({
  files: Type.Array(FileInfoResponseSchema),
  total: Type.Number(),
  hasMore: Type.Boolean(),
  pagination: Type.Object({
    limit: Type.Number(),
    offset: Type.Number(),
    total: Type.Number()
  })
})

// Delete Response Schema
export const DeleteResponseSchema = Type.Object({
  success: Type.Boolean(),
  fileId: Type.String(),
  message: Type.Optional(Type.String())
})

// File Share Request Schema
export const ShareFileRequestSchema = Type.Object({
  fileId: Type.String({ minLength: 1 }),
  sharedWith: Type.String({ minLength: 1, description: 'User ID to share with' }),
  permissions: Type.Object({
    canRead: Type.Optional(Type.Boolean({ default: true })),
    canWrite: Type.Optional(Type.Boolean({ default: false })),
    canDelete: Type.Optional(Type.Boolean({ default: false })),
    canShare: Type.Optional(Type.Boolean({ default: false }))
  }),
  expiresAt: Type.Optional(Type.String({ format: 'date-time' })),
  requiresPassword: Type.Optional(Type.Boolean({ default: false })),
  password: Type.Optional(Type.String()),
  maxDownloads: Type.Optional(Type.Number({ minimum: 1 }))
})

// Share Response Schema
export const ShareResponseSchema = Type.Object({
  success: Type.Boolean(),
  shareId: Type.String(),
  fileId: Type.String(),
  sharedWith: Type.String(),
  permissions: Type.Object({
    canRead: Type.Boolean(),
    canWrite: Type.Boolean(),
    canDelete: Type.Boolean(),
    canShare: Type.Boolean()
  }),
  expiresAt: Type.Optional(Type.String({ format: 'date-time' })),
  createdAt: Type.String({ format: 'date-time' })
})

// Storage Statistics Response Schema
export const StorageStatsResponseSchema = Type.Object({
  totalFiles: Type.Number(),
  totalSize: Type.Number(),
  filesByProvider: Type.Record(Type.String(), Type.Number()),
  filesByMimeType: Type.Record(Type.String(), Type.Number()),
  filesByClassification: Type.Record(Type.String(), Type.Number()),
  averageFileSize: Type.Number(),
  largestFile: Type.Number(),
  recentActivity: Type.Object({
    uploads: Type.Number(),
    downloads: Type.Number()
  }),
  quotaInfo: Type.Optional(Type.Object({
    maxStorage: Type.Number(),
    usedStorage: Type.Number(),
    maxFiles: Type.Number(),
    usedFiles: Type.Number(),
    percentageUsed: Type.Number()
  }))
})

// Error Response Schema
export const ErrorResponseSchema = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.Any())
  })
})

// Presigned URL Request Schema
export const PresignedUrlRequestSchema = Type.Object({
  fileId: Type.String({ minLength: 1 }),
  operation: Type.Union([
    Type.Literal('read'),
    Type.Literal('write')
  ]),
  expiresIn: Type.Optional(Type.Number({ minimum: 60, maximum: 86400, default: 3600 })) // 1 minute to 24 hours
})

// Presigned URL Response Schema
export const PresignedUrlResponseSchema = Type.Object({
  url: Type.String({ format: 'uri' }),
  method: Type.String(),
  headers: Type.Optional(Type.Record(Type.String(), Type.String())),
  formData: Type.Optional(Type.Record(Type.String(), Type.String())),
  expiresAt: Type.String({ format: 'date-time' })
})

// TypeScript types derived from schemas
export type UploadRequest = Static<typeof UploadRequestSchema>
export type UploadResponse = Static<typeof UploadResponseSchema>
export type DownloadRequest = Static<typeof DownloadRequestSchema>
export type FileInfoResponse = Static<typeof FileInfoResponseSchema>
export type ListFilesRequest = Static<typeof ListFilesRequestSchema>
export type ListFilesResponse = Static<typeof ListFilesResponseSchema>
export type DeleteResponse = Static<typeof DeleteResponseSchema>
export type ShareFileRequest = Static<typeof ShareFileRequestSchema>
export type ShareResponse = Static<typeof ShareResponseSchema>
export type StorageStatsResponse = Static<typeof StorageStatsResponseSchema>
export type ErrorResponse = Static<typeof ErrorResponseSchema>
export type PresignedUrlRequest = Static<typeof PresignedUrlRequestSchema>
export type PresignedUrlResponse = Static<typeof PresignedUrlResponseSchema>

// === MULTIPART UPLOAD BODY SCHEMA ===
// ⚠️ For Swagger documentation only - do NOT use for validation with @fastify/multipart
// Multipart data conflicts with JSON schema validation

/**
 * Multipart Upload Body Schema for Fastify with @fastify/multipart
 *
 * Uses the official @fastify/multipart approach with isFile: true
 * Requires ajvFilePlugin to be registered in Fastify initialization
 *
 * Usage:
 * ```typescript
 * // ✅ Correct usage with ajvFilePlugin
 * fastify.post('/upload', {
 *   schema: {
 *     body: MultipartUploadBodySchema,
 *     consumes: ['multipart/form-data']
 *   }
 * }, handler)
 * ```
 */
export const MultipartUploadBodySchema = {
  type: 'object',
  properties: {
    file: {
      isFile: true,
      description: 'File to upload'
    },
    path: {
      type: 'string',
      description: 'Optional path/folder for file storage'
    },
    dataClassification: {
      type: 'string',
      enum: ['public', 'internal', 'confidential', 'restricted'],
      default: 'internal',
      description: 'Data classification level'
    },
    tags: {
      type: 'string',
      description: 'JSON array of tags (e.g., ["tag1", "tag2"])',
      default: '[]'
    },
    customMetadata: {
      type: 'string',
      description: 'JSON object with custom metadata (e.g., {"key": "value"})',
      default: '{}'
    },
    encrypt: {
      type: 'string',
      enum: ['true', 'false'],
      default: 'false',
      description: 'Whether to encrypt the file'
    },
    overwrite: {
      type: 'string',
      enum: ['true', 'false'],
      default: 'false',
      description: 'Whether to overwrite existing file'
    }
  },
  required: ['file']
} as const
