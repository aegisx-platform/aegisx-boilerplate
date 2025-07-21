/**
 * Storage API Schemas
 *
 * TypeBox schemas for storage API endpoints validation and documentation
 * 
 * Note: After migration to bigserial primary keys, the public API continues
 * to use the 'file_id' string field for file access, which provides a stable
 * public identifier independent of internal database IDs.
 * 
 * Internal bigserial IDs are used for database relationships and performance,
 * while 'uuid_public' fields provide UUID-based public identifiers when needed.
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
  encrypt: Type.Optional(Type.Boolean({ 
    description: 'Whether to encrypt the file. If not specified: MinIO=false (uses server-side encryption), Local=based on STORAGE_LOCAL_AUTO_ENCRYPT environment variable' 
  })),
  overwrite: Type.Optional(Type.Boolean({ description: 'Whether to overwrite existing file' }))
})

// Thumbnail Info Schema
export const ThumbnailInfoSchema = Type.Object({
  url: Type.String({ description: 'Thumbnail URL' }),
  width: Type.Number({ description: 'Thumbnail width in pixels' }),
  height: Type.Number({ description: 'Thumbnail height in pixels' }),
  size: Type.Number({ description: 'Thumbnail file size in bytes' }),
  format: Type.String({ description: 'Thumbnail image format' })
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
  thumbnails: Type.Optional(Type.Array(ThumbnailInfoSchema, { description: 'Generated thumbnails (for images)' })),
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
  fileId: Type.String({ minLength: 1, description: 'File identifier (provider-specific string)' })
})

// UUID Public Params Schema (for operations that need UUID-based access)
export const UuidPublicParamsSchema = Type.Object({
  uuid: Type.String({ format: 'uuid', description: 'Public UUID identifier' })
})

// File Info Response Schema
export const FileInfoResponseSchema = Type.Object({
  fileId: Type.String(),
  filename: Type.String(),
  originalName: Type.String(),
  mimeType: Type.String(),
  size: Type.Number(),
  path: Type.Optional(Type.String()),
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

// Simple File Item Schema for list endpoint
export const FileListItemSchema = Type.Object({
  fileId: Type.String(),
  filename: Type.String(),
  originalName: Type.String(),
  mimeType: Type.String(),
  size: Type.Number(),
  checksum: Type.String(),
  dataClassification: DataClassificationSchema,
  encrypted: Type.Boolean(),
  tags: Type.Optional(Type.Array(Type.String())),
  customMetadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  lastAccessedAt: Type.Optional(Type.String({ format: 'date-time' })),
  accessCount: Type.Number(),
  status: FileStatusSchema
})

// List Files Response Schema
export const ListFilesResponseSchema = Type.Object({
  files: Type.Array(FileListItemSchema),
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
  shareId: Type.String({ format: 'uuid', description: 'Share UUID identifier' }),
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

// Shared Files Schemas

// Share Permissions Schema
export const SharePermissionsSchema = Type.Object({
  canRead: Type.Boolean({ default: true }),
  canWrite: Type.Boolean({ default: false }),
  canDelete: Type.Boolean({ default: false }),
  canShare: Type.Boolean({ default: false })
})

// Shared File Info Schema
export const SharedFileInfoSchema = Type.Object({
  shareId: Type.String({ format: 'uuid', description: 'Unique share UUID identifier' }),
  fileId: Type.String({ description: 'File identifier' }),
  permissions: SharePermissionsSchema,
  expiresAt: Type.Optional(Type.String({ format: 'date-time', description: 'Share expiration date' })),
  sharedAt: Type.String({ format: 'date-time', description: 'When the file was shared' }),
  sharedBy: Type.Optional(Type.Object({
    username: Type.String(),
    email: Type.String()
  })),
  sharedWith: Type.Optional(Type.Object({
    username: Type.String(),
    email: Type.String()
  })),
  lastAccessedAt: Type.Optional(Type.String({ format: 'date-time', description: 'Last access time' }))
})

// Shared File Response Schema
export const SharedFileResponseSchema = Type.Object({
  id: Type.String(),
  fileId: Type.String(),
  filename: Type.String(),
  originalName: Type.String(),
  mimeType: Type.String(),
  size: Type.Number(),
  checksum: Type.String(),
  provider: Type.String(),
  dataClassification: DataClassificationSchema,
  encrypted: Type.Boolean(),
  tags: Type.Optional(Type.Array(Type.String())),
  customMetadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
  createdBy: Type.Optional(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  lastAccessedAt: Type.Optional(Type.String({ format: 'date-time' })),
  accessCount: Type.Number(),
  status: FileStatusSchema,
  shareInfo: SharedFileInfoSchema
})

// Shared Files List Response Schema
export const SharedFilesResponseSchema = Type.Object({
  files: Type.Array(SharedFileResponseSchema),
  total: Type.Number({ description: 'Total number of shared files' })
})

// My Shares Response Schema  
export const MySharesResponseSchema = Type.Object({
  files: Type.Array(SharedFileResponseSchema),
  total: Type.Number({ description: 'Total number of files you have shared' })
})

// Revoke Share Request Params Schema
export const RevokeShareParamsSchema = Type.Object({
  shareId: Type.String({ format: 'uuid', minLength: 1, description: 'Share UUID to revoke' })
})

// Revoke Share Response Schema
export const RevokeShareResponseSchema = Type.Object({
  success: Type.Boolean(),
  message: Type.String(),
  shareId: Type.String({ format: 'uuid' })
})

//Folder Schemas

// Folder Status enum
export const FolderStatusSchema = Type.Union([
  Type.Literal('active'),
  Type.Literal('archived'), 
  Type.Literal('deleted')
])

// Create Folder Request Schema
export const CreateFolderRequestSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255, description: 'Folder name' }),
  path: Type.Optional(Type.String({ description: 'Parent folder path' })),
  parentId: Type.Optional(Type.Number({ description: 'Parent folder ID' })),
  description: Type.Optional(Type.String({ maxLength: 1000, description: 'Folder description' })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any(), { description: 'Custom metadata' })),
  icon: Type.Optional(Type.String({ maxLength: 100, description: 'Folder icon name' })),
  color: Type.Optional(Type.String({ pattern: '^#[0-9A-Fa-f]{6}$', description: 'Folder color (hex)' })),
  dataClassification: Type.Optional(DataClassificationSchema),
  inheritPermissions: Type.Optional(Type.Boolean({ default: true, description: 'Inherit parent permissions' }))
})

// Folder Response Schema
export const FolderResponseSchema = Type.Object({
  id: Type.Number({ description: 'Folder unique identifier' }),
  name: Type.String({ description: 'Folder name' }),
  path: Type.String({ description: 'Full folder path' }),
  parentId: Type.Optional(Type.Union([Type.Number(), Type.Null()], { description: 'Parent folder ID' })),
  description: Type.Optional(Type.String({ description: 'Folder description' })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any(), { description: 'Custom metadata' })),
  icon: Type.Optional(Type.String({ description: 'Folder icon name' })),
  color: Type.Optional(Type.String({ description: 'Folder color (hex)' })),
  dataClassification: DataClassificationSchema,
  inheritPermissions: Type.Boolean({ description: 'Inherits parent permissions' }),
  fileCount: Type.Number({ description: 'Number of files in folder' }),
  subfolderCount: Type.Number({ description: 'Number of subfolders' }),
  totalSize: Type.Number({ description: 'Total size in bytes' }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  lastAccessedAt: Type.Optional(Type.String({ format: 'date-time' })),
  status: FolderStatusSchema,
  deletedAt: Type.Optional(Type.String({ format: 'date-time' }))
})

// List Folders Request Schema
export const ListFoldersRequestSchema = Type.Object({
  parentId: Type.Optional(Type.Union([Type.Number(), Type.Null()], { description: 'Parent folder ID (null for root)' })),
  path: Type.Optional(Type.String({ description: 'Filter by path' })),
  recursive: Type.Optional(Type.Boolean({ default: false, description: 'Include subfolders recursively' })),
  includeFiles: Type.Optional(Type.Boolean({ default: false, description: 'Include files in response' })),
  includeStats: Type.Optional(Type.Boolean({ default: true, description: 'Include folder statistics' })),
  status: Type.Optional(FolderStatusSchema),
  sortBy: Type.Optional(Type.Union([
    Type.Literal('name'),
    Type.Literal('created_at'),
    Type.Literal('updated_at'),
    Type.Literal('size')
  ])),
  sortOrder: Type.Optional(Type.Union([
    Type.Literal('asc'),
    Type.Literal('desc')
  ])),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 1000, default: 50 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 }))
})

// List Folders Response Schema
export const ListFoldersResponseSchema = Type.Object({
  folders: Type.Array(FolderResponseSchema),
  files: Type.Optional(Type.Array(FileListItemSchema, { description: 'Files (if includeFiles=true)' })),
  total: Type.Number({ description: 'Total number of folders' }),
  hasMore: Type.Boolean(),
  pagination: Type.Object({
    limit: Type.Number(),
    offset: Type.Number(),
    total: Type.Number()
  })
})

// Folder Tree Node Schema (for tree view)
export const FolderTreeNodeSchema: any = Type.Object({
  folder: FolderResponseSchema,
  children: Type.Optional(Type.Array(Type.Any(), { description: 'Child folders' })),
  files: Type.Optional(Type.Array(FileListItemSchema, { description: 'Files in folder' }))
})

// Folder Tree Response Schema
export const FolderTreeResponseSchema = Type.Object({
  tree: Type.Array(FolderTreeNodeSchema),
  totalFolders: Type.Number(),
  totalFiles: Type.Number(),
  totalSize: Type.Number()
})

// Update Folder Request Schema
export const UpdateFolderRequestSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  description: Type.Optional(Type.String({ maxLength: 1000 })),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
  icon: Type.Optional(Type.String({ maxLength: 100 })),
  color: Type.Optional(Type.String({ pattern: '^#[0-9A-Fa-f]{6}$' })),
  dataClassification: Type.Optional(DataClassificationSchema),
  inheritPermissions: Type.Optional(Type.Boolean())
})

// Delete Folder Response Schema
export const DeleteFolderResponseSchema = Type.Object({
  success: Type.Boolean(),
  folderId: Type.Number(),
  deletedFolders: Type.Number({ description: 'Number of folders deleted' }),
  deletedFiles: Type.Number({ description: 'Number of files deleted' }),
  message: Type.Optional(Type.String())
})

// Folder ID Params Schema
export const FolderIdParamsSchema = Type.Object({
  folderId: Type.String({ pattern: '^[0-9]+$', description: 'Folder identifier (numeric string)' })
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
export type MultipartUploadBody = Static<typeof MultipartUploadBodySchema>

// Shared Files types
export type SharePermissions = Static<typeof SharePermissionsSchema>
export type SharedFileInfo = Static<typeof SharedFileInfoSchema>
export type SharedFileResponse = Static<typeof SharedFileResponseSchema>
export type SharedFilesResponse = Static<typeof SharedFilesResponseSchema>
export type MySharesResponse = Static<typeof MySharesResponseSchema>
export type RevokeShareParams = Static<typeof RevokeShareParamsSchema>
export type RevokeShareResponse = Static<typeof RevokeShareResponseSchema>
export type UuidPublicParams = Static<typeof UuidPublicParamsSchema>

// Folder types
export type CreateFolderRequest = Static<typeof CreateFolderRequestSchema>
export type FolderResponse = Static<typeof FolderResponseSchema>
export type ListFoldersRequest = Static<typeof ListFoldersRequestSchema>
export type ListFoldersResponse = Static<typeof ListFoldersResponseSchema>
export type FolderTreeNode = Static<typeof FolderTreeNodeSchema>
export type FolderTreeResponse = Static<typeof FolderTreeResponseSchema>
export type UpdateFolderRequest = Static<typeof UpdateFolderRequestSchema>
export type DeleteFolderResponse = Static<typeof DeleteFolderResponseSchema>
export type FolderIdParams = Static<typeof FolderIdParamsSchema>

// === MULTIPART UPLOAD BODY SCHEMA ===
// For Swagger documentation with @aegisx/fastify-multipart
// This schema is used for OpenAPI documentation only

/**
 * Multipart Upload Body Schema for Swagger UI with @aegisx/fastify-multipart
 *
 * This schema enables proper form display in Swagger UI
 * The @aegisx/fastify-multipart plugin handles the actual parsing
 *
 * Usage:
 * ```typescript
 * fastify.post('/upload', {
 *   schema: {
 *     body: MultipartUploadBodySchema,
 *     consumes: ['multipart/form-data']
 *   }
 * }, handler)
 * ```
 */
export const MultipartUploadBodySchema = Type.Object({
  file: Type.String({ 
    format: 'binary',
    description: 'File to upload (required)'
  }),
  path: Type.Optional(Type.String({ 
    description: 'Storage folder path (e.g., "documents/2024")'
  })),
  dataClassification: Type.Optional(Type.String({ 
    enum: ['public', 'internal', 'confidential', 'restricted'],
    default: 'internal',
    description: 'Data classification level for compliance'
  })),
  tags: Type.Optional(Type.String({ 
    description: 'JSON array of tags for categorization (e.g., ["invoice", "2024", "customer-123"])',
    pattern: '^\\[.*\\]$', // JSON array pattern
    default: '[]'
  })),
  customMetadata: Type.Optional(Type.String({ 
    description: 'JSON object with custom metadata (e.g., {"department": "sales", "project": "Q4-2024"})',
    pattern: '^\\{.*\\}$', // JSON object pattern
    default: '{}'
  })),
  encrypt: Type.Optional(Type.String({ 
    enum: ['true', 'false'],
    default: 'false',
    description: 'Encrypt file at rest'
  })),
  overwrite: Type.Optional(Type.String({ 
    enum: ['true', 'false'],
    default: 'false',
    description: 'Overwrite if file exists'
  }))
}, {
  $id: 'MultipartUploadBody',
  additionalProperties: false
})
