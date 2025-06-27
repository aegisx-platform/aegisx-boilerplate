export interface ValidationRule {
  name: string;
  validator: (value: any, config: any) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
  description: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  actualValue?: any;
  expectedValue?: any;
  severity?: 'error' | 'warning' | 'info';
}

export interface ConfigValidationResult {
  valid: boolean;
  timestamp: Date;
  duration: number;
  environment: string;
  summary: {
    total: number;
    passed: number;
    warnings: number;
    errors: number;
  };
  results: Array<{
    rule: string;
    field: string;
    valid: boolean;
    severity: 'error' | 'warning' | 'info';
    message: string;
    actualValue?: any;
    expectedValue?: any;
    suggestion?: string;
  }>;
  errors: string[];
  warnings: string[];
}

export interface DatabaseValidationConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl: boolean;
  poolMin: number;
  poolMax: number;
  connectionTimeout: number;
}

export interface RedisValidationConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
  connectTimeout: number;
  commandTimeout: number;
}

export interface SecurityValidationConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  rateLimitMax: number;
  rateLimitTimeWindow: number;
  corsOrigin: string;
}

export interface LoggingValidationConfig {
  level: string;
  consoleEnabled: boolean;
  fileEnabled: boolean;
  seqEnabled: boolean;
  seqUrl?: string;
  structuredEnabled: boolean;
}

export interface ValidationCategory {
  name: string;
  description: string;
  rules: ValidationRule[];
  enabled: boolean;
  stopOnError: boolean;
}

export interface ValidationOptions {
  categories?: string[];
  severity?: 'error' | 'warning' | 'info';
  stopOnFirstError?: boolean;
  includeWarnings?: boolean;
  includeInfo?: boolean;
  validateConnections?: boolean;
  timeout?: number;
}

export interface ConnectionValidationResult {
  service: string;
  connected: boolean;
  responseTime: number;
  error?: string;
  details?: any;
}

export interface EnvironmentValidationMetrics {
  totalVariables: number;
  validVariables: number;
  missingVariables: number;
  invalidVariables: number;
  overriddenVariables: number;
  deprecatedVariables: number;
}

export interface ConfigValidatorEventData {
  type: 'validation-started' | 'validation-completed' | 'validation-failed' | 'rule-executed';
  timestamp: Date;
  data?: any;
}

export type ConfigValidatorEvents = 
  | 'validation-started'
  | 'validation-completed' 
  | 'validation-failed'
  | 'rule-executed'
  | 'category-completed'
  | 'connection-tested';