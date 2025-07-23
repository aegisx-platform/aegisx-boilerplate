/**
 * Configuration Management Domain
 * 
 * ระบบจัดการ configuration แบบ dynamic ที่รองรับ:
 * - Hot reload โดยไม่ต้อง restart ระบบ
 * - Multi-environment configuration
 * - Encryption สำหรับ sensitive data
 * - Audit logging และ change history
 * - Template-based configuration
 * - Real-time configuration updates
 */

// Types
export * from './types/config.types';
export * from './types/config-template.types';

// Repositories
export { ConfigRepository } from './repositories/config-repository';
export { ConfigMetadataRepository } from './repositories/config-metadata-repository';
export { ConfigHistoryRepository } from './repositories/config-history-repository';

// Services
export { ConfigService } from './services/config-service';
export { 
  ConfigHotReloadService,
  type HotReloadOptions,
  type ServiceReloadHandler 
} from './services/config-hot-reload.service';

// Default exports for convenience
export { ConfigRepository as DefaultConfigRepository } from './repositories/config-repository';
export { ConfigService as DefaultConfigService } from './services/config-service';

// Domain plugin
export { default } from './config-management.plugin';