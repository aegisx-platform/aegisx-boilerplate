/**
 * Core Configuration Management Types
 * สำหรับระบบจัดการ configuration แบบ dynamic
 */

export type ConfigValueType = 'string' | 'number' | 'boolean' | 'password' | 'json';
export type ConfigInputType = 'text' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
export type ConfigEnvironment = 'development' | 'production' | 'staging' | 'test';

/**
 * ตาราง system_configurations
 */
export interface SystemConfiguration {
  id: number;
  category: string;
  configKey: string;
  configValue?: string;
  valueType: ConfigValueType;
  isEncrypted: boolean;
  isActive: boolean;
  environment: ConfigEnvironment;
  updatedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * สำหรับการสร้าง configuration ใหม่
 */
export interface CreateConfigurationRequest {
  category: string;
  configKey: string;
  configValue?: string;
  valueType?: ConfigValueType;
  isEncrypted?: boolean;
  isActive?: boolean;
  environment?: ConfigEnvironment;
  changeReason?: string;
}

/**
 * สำหรับการอัพเดท configuration
 */
export interface UpdateConfigurationRequest {
  configValue?: string;
  valueType?: ConfigValueType;
  isEncrypted?: boolean;
  isActive?: boolean;
  changeReason?: string;
}

/**
 * ตาราง configuration_metadata
 */
export interface ConfigurationMetadata {
  id: number;
  category: string;
  configKey: string;
  displayName: string;
  description?: string;
  inputType: ConfigInputType;
  validationRules?: ValidationRules;
  defaultValue?: string;
  isRequired: boolean;
  sortOrder: number;
  groupName?: string;
  helpText?: string;
  createdAt: Date;
}

/**
 * กฎการ validation
 */
export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
  options?: string[]; // สำหรับ select/radio
  custom?: {
    [key: string]: any;
  };
}

/**
 * ตาราง configuration_history
 */
export interface ConfigurationHistory {
  id: number;
  configId: number;
  oldValue?: string;
  newValue?: string;
  changedBy?: number;
  changeReason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

/**
 * ตาราง configuration_templates
 */
export interface ConfigurationTemplate {
  id: number;
  category: string;
  templateName: string;
  displayName: string;
  description?: string;
  templateConfig: TemplateConfig;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

/**
 * การตั้งค่า template ในรูปแบบ JSON
 */
export interface TemplateConfig {
  [configKey: string]: {
    value: string;
    valueType: ConfigValueType;
    isEncrypted?: boolean;
    description?: string;
  };
}

/**
 * สำหรับดึงข้อมูล configuration พร้อม metadata
 */
export interface ConfigurationWithMetadata extends SystemConfiguration {
  metadata?: ConfigurationMetadata;
  displayName?: string;
  description?: string;
  inputType?: ConfigInputType;
  validationRules?: ValidationRules;
  isRequired?: boolean;
  groupName?: string;
  helpText?: string;
}

/**
 * สำหรับจัดกลุ่ม configuration ตาม category
 */
export interface ConfigurationCategory {
  category: string;
  displayName: string;
  description?: string;
  configs: ConfigurationWithMetadata[];
  groups?: ConfigurationGroup[];
}

/**
 * สำหรับจัดกลุ่ม configuration ภายใน category
 */
export interface ConfigurationGroup {
  groupName: string;
  displayName: string;
  description?: string;
  configs: ConfigurationWithMetadata[];
}

/**
 * สำหรับ bulk update configuration
 */
export interface BulkUpdateConfigurationRequest {
  updates: Array<{
    id: number;
    configValue?: string;
    isActive?: boolean;
  }>;
  changeReason?: string;
  environment?: ConfigEnvironment;
}

/**
 * Response สำหรับการทดสอบ configuration
 */
export interface ConfigurationTestResult {
  success: boolean;
  message: string;
  details?: {
    [key: string]: any;
  };
  responseTime?: number;
  error?: string;
}

/**
 * สำหรับการ export/import configuration
 */
export interface ConfigurationExport {
  category: string;
  environment: ConfigEnvironment;
  configurations: Array<{
    configKey: string;
    configValue: string;
    valueType: ConfigValueType;
    isEncrypted: boolean;
  }>;
  exportedAt: Date;
  exportedBy: number;
}

/**
 * สำหรับการติดตาม configuration changes
 */
export interface ConfigurationChangeEvent {
  type: 'created' | 'updated' | 'deleted' | 'activated' | 'deactivated';
  category: string;
  configKey: string;
  environment: ConfigEnvironment;
  oldValue?: string;
  newValue?: string;
  changedBy: number;
  timestamp: Date;
  changeReason?: string;
}

/**
 * สำหรับการค้นหา configuration
 */
export interface ConfigurationSearchParams {
  category?: string;
  configKey?: string;
  environment?: ConfigEnvironment;
  isActive?: boolean;
  isEncrypted?: boolean;
  groupName?: string;
  search?: string; // search ใน configKey, displayName, description
  page?: number;
  limit?: number;
  sortBy?: 'configKey' | 'category' | 'updatedAt' | 'createdAt' | 'updated_at' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response สำหรับการค้นหา configuration
 */
export interface ConfigurationSearchResult {
  configurations: ConfigurationWithMetadata[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    categories: string[];
    environments: ConfigEnvironment[];
    groups: string[];
  };
}

/**
 * สำหรับการ backup/restore configuration
 */
export interface ConfigurationBackup {
  id: number;
  backupName: string;
  description?: string;
  environment: ConfigEnvironment;
  categories: string[];
  backupData: ConfigurationExport[];
  createdBy: number;
  createdAt: Date;
}

/**
 * สำหรับการ hot reload configuration
 */
export interface ConfigurationReloadEvent {
  category: string;
  environment: ConfigEnvironment;
  configs: Record<string, any>; // processed config values
  reloadedAt: Date;
  requestedBy: number;
}

/**
 * Configuration service options
 */
export interface ConfigurationServiceOptions {
  enableCache?: boolean;
  cacheTimeout?: number; // seconds
  enableEncryption?: boolean;
  enableAuditLog?: boolean;
  enableHotReload?: boolean;
  environment?: ConfigEnvironment;
}

/**
 * สำหรับการรวม configuration จากหลายแหล่ง
 */
export interface ConfigurationSource {
  source: 'database' | 'cache' | 'environment' | 'default';
  priority: number;
  values: Record<string, any>;
  lastUpdated: Date;
}

/**
 * ผลลัพธ์การรวม configuration จากหลายแหล่ง
 */
export interface MergedConfiguration {
  category: string;
  environment: ConfigEnvironment;
  values: Record<string, any>;
  sources: ConfigurationSource[];
  mergedAt: Date;
}