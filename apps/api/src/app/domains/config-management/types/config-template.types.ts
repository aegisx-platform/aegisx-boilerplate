/**
 * Configuration Template Types
 * สำหรับจัดการ templates ของ configuration providers ต่างๆ
 */

import { ConfigValueType, ValidationRules } from './config.types';

/**
 * ประเภทของ configuration category
 */
export type ConfigurationCategoryType = 
  | 'smtp' 
  | 'database' 
  | 'redis' 
  | 'security' 
  | 'storage' 
  | 'notification' 
  | 'logging'
  | 'queue'
  | 'custom';

/**
 * ประเภทของ SMTP provider
 */
export type SMTPProviderType = 
  | 'gmail' 
  | 'sendgrid' 
  | 'mailtrap' 
  | 'amazon-ses' 
  | 'mailgun'
  | 'postmark'
  | 'custom';

/**
 * ประเภทของ Database provider
 */
export type DatabaseProviderType = 
  | 'postgresql' 
  | 'mysql' 
  | 'mongodb' 
  | 'sqlite'
  | 'mariadb';

/**
 * ประเภทของ Storage provider
 */
export type StorageProviderType = 
  | 'local' 
  | 'minio' 
  | 'aws-s3' 
  | 'azure-blob'
  | 'gcp-storage';

/**
 * Template field definition
 */
export interface TemplateField {
  key: string;
  displayName: string;
  description?: string;
  valueType: ConfigValueType;
  inputType: 'text' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox';
  defaultValue?: string;
  isRequired: boolean;
  isEncrypted?: boolean;
  validationRules?: ValidationRules;
  helpText?: string;
  placeholder?: string;
  options?: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
  dependsOn?: {
    field: string;
    value: string | string[];
  };
  group?: string;
  sortOrder?: number;
}

/**
 * Template group สำหรับจัดกลุ่ม fields
 */
export interface TemplateGroup {
  name: string;
  displayName: string;
  description?: string;
  sortOrder: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Configuration template definition
 */
export interface ConfigurationTemplateDefinition {
  category: ConfigurationCategoryType;
  templateName: string;
  displayName: string;
  description?: string;
  provider?: string; // เช่น 'gmail', 'sendgrid' สำหรับ SMTP
  icon?: string;
  documentationUrl?: string;
  
  // Template structure
  fields: TemplateField[];
  groups?: TemplateGroup[];
  
  // Template validation
  globalValidation?: {
    rules: ValidationRules;
    message?: string;
  };
  
  // Template features
  features?: {
    testConnection?: boolean;
    hasAuthentication?: boolean;
    supportsBulkOperation?: boolean;
    requiresSpecialSetup?: boolean;
  };
  
  // Template metadata
  version: string;
  tags?: string[];
  isActive: boolean;
  sortOrder: number;
}

/**
 * SMTP Template สำหรับ Email providers
 */
export interface SMTPTemplateDefinition extends ConfigurationTemplateDefinition {
  category: 'smtp';
  provider: SMTPProviderType;
  
  // SMTP specific features
  smtpFeatures: {
    supportsTLS: boolean;
    supportsOAuth2: boolean;
    requiresAppPassword: boolean;
    defaultPort: number;
    securePort?: number;
    maxRecipientsPerEmail?: number;
    rateLimit?: {
      perMinute: number;
      perHour: number;
      perDay: number;
    };
  };
}

/**
 * Database Template สำหรับ Database providers
 */
export interface DatabaseTemplateDefinition extends ConfigurationTemplateDefinition {
  category: 'database';
  provider: DatabaseProviderType;
  
  // Database specific features
  databaseFeatures: {
    supportsSSL: boolean;
    supportsConnectionPooling: boolean;
    defaultPort: number;
    maxConnections?: number;
    supportedVersions?: string[];
    requiredExtensions?: string[];
  };
}

/**
 * Storage Template สำหรับ Storage providers
 */
export interface StorageTemplateDefinition extends ConfigurationTemplateDefinition {
  category: 'storage';
  provider: StorageProviderType;
  
  // Storage specific features
  storageFeatures: {
    supportsEncryption: boolean;
    supportsVersioning: boolean;
    supportedRegions?: string[];
    maxFileSize?: number;
    supportedFileTypes?: string[];
    hasCDN?: boolean;
  };
}

/**
 * Template instance ที่ผู้ใช้สร้างจาก template
 */
export interface ConfigurationTemplateInstance {
  id: number;
  templateId: number;
  instanceName: string;
  category: ConfigurationCategoryType;
  provider?: string;
  environment: 'development' | 'production' | 'staging' | 'test';
  
  // Instance configuration values
  configurationValues: Record<string, {
    value: string;
    isEncrypted: boolean;
    lastUpdated: Date;
    updatedBy: number;
  }>;
  
  // Instance metadata
  isActive: boolean;
  description?: string;
  tags?: string[];
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Test results
  lastTestResult?: {
    success: boolean;
    message: string;
    testedAt: Date;
    responseTime?: number;
    error?: string;
  };
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Template import/export
 */
export interface TemplateExportData {
  templates: ConfigurationTemplateDefinition[];
  instances?: ConfigurationTemplateInstance[];
  exportedAt: Date;
  exportedBy: number;
  version: string;
}

/**
 * Provider-specific template collections
 */
export interface ProviderTemplateCollection {
  category: ConfigurationCategoryType;
  providers: Array<{
    name: string;
    displayName: string;
    description?: string;
    logo?: string;
    website?: string;
    popularity: number;
    template: ConfigurationTemplateDefinition;
  }>;
}

/**
 * Built-in template definitions
 */
export interface BuiltInTemplates {
  smtp: {
    gmail: SMTPTemplateDefinition;
    sendgrid: SMTPTemplateDefinition;
    mailtrap: SMTPTemplateDefinition;
    amazonSes: SMTPTemplateDefinition;
    custom: SMTPTemplateDefinition;
  };
  database: {
    postgresql: DatabaseTemplateDefinition;
    mysql: DatabaseTemplateDefinition;
    mongodb: DatabaseTemplateDefinition;
  };
  storage: {
    local: StorageTemplateDefinition;
    minio: StorageTemplateDefinition;
    awsS3: StorageTemplateDefinition;
  };
}

/**
 * Template usage statistics
 */
export interface TemplateUsageStats {
  templateId: number;
  templateName: string;
  category: ConfigurationCategoryType;
  totalInstances: number;
  activeInstances: number;
  successfulTests: number;
  failedTests: number;
  lastUsed?: Date;
  popularityScore: number;
}