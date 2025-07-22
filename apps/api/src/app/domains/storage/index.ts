/**
 * Storage Domain - Module Entry Point
 * 
 * Exports all storage domain components for easy importing
 */

// Controllers
export { StorageController } from './controllers/storage-controller'

// Services
export { StorageDatabaseService } from './services/storage-database-service'

// Repositories
export { StorageFileRepository } from './repositories/storage-file-repository'

// Routes
export { storageRoutes } from './routes/storage.routes'

// Schemas
export * from './schemas/storage.schemas'

// Types (excluding duplicates from schemas)
export type {
  StorageFileMetadata,
  StorageOperation,
  FileShare,
  StorageQuota,
  QuotaCheckResult,
  StorageStatistics,
  FileSearchOptions,
  FileListResult,
  UploadOptions,
  DownloadOptions,
  ShareOptions,
  ApiUploadRequest,
  ApiUploadResponse,
  ApiFileInfoResponse,
  ApiErrorResponse,
  StorageEventData,
  StorageFolder,
  CreateFolderOptions,
  FolderListOptions,
  FolderTreeNode as FolderTreeNodeType,
  ApiCreateFolderRequest,
  ApiFolderResponse,
  ApiFolderListResponse
} from './types/storage.types'