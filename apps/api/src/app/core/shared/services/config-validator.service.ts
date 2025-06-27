import { EventEmitter } from 'events';
import { FastifyInstance } from 'fastify';
import {
  ValidationRule,
  ConfigValidationResult,
  ValidationCategory,
  ValidationOptions,
  ConnectionValidationResult,
  EnvironmentValidationMetrics,
  ConfigValidatorEventData,
} from '../types/config-validator.types';

export class ConfigValidatorService extends EventEmitter {
  private fastify: FastifyInstance;
  private categories: Map<string, ValidationCategory> = new Map();
  private lastValidationResult?: ConfigValidationResult;

  constructor(fastify: FastifyInstance) {
    super();
    this.fastify = fastify;
    this.initializeValidationCategories();
  }

  private initializeValidationCategories(): void {
    // Database validation rules
    this.addCategory({
      name: 'database',
      description: 'Database connection and configuration validation',
      enabled: true,
      stopOnError: false,
      rules: [
        {
          name: 'db-host-required',
          validator: (value: any, config: any) => ({
            valid: !!config.DB_HOST,
            message: config.DB_HOST ? 'Database host is configured' : 'Database host is required',
            actualValue: config.DB_HOST,
          }),
          severity: 'error',
          description: 'Database host must be specified',
          suggestion: 'Set DB_HOST environment variable',
        },
        {
          name: 'db-port-valid',
          validator: (value: any, config: any) => {
            const port = parseInt(config.DB_PORT, 10);
            const valid = !isNaN(port) && port > 0 && port <= 65535;
            return {
              valid,
              message: valid ? 'Database port is valid' : 'Database port must be between 1-65535',
              actualValue: config.DB_PORT,
              expectedValue: '1-65535',
            };
          },
          severity: 'error',
          description: 'Database port must be a valid port number',
        },
        {
          name: 'db-pool-size',
          validator: (value: any, config: any) => {
            const min = parseInt(config.DB_POOL_MIN, 10);
            const max = parseInt(config.DB_POOL_MAX, 10);
            const valid = min >= 1 && max >= min && max <= 100;
            return {
              valid,
              message: valid 
                ? 'Database pool size is within recommended range' 
                : 'Database pool size should be: min >= 1, max >= min, max <= 100',
              actualValue: `min: ${min}, max: ${max}`,
            };
          },
          severity: 'warning',
          description: 'Database connection pool should be properly sized',
        },
      ],
    });

    // Redis validation rules
    this.addCategory({
      name: 'redis',
      description: 'Redis connection and configuration validation',
      enabled: true,
      stopOnError: false,
      rules: [
        {
          name: 'redis-host-required',
          validator: (value: any, config: any) => ({
            valid: !!config.REDIS_HOST,
            message: config.REDIS_HOST ? 'Redis host is configured' : 'Redis host is required',
            actualValue: config.REDIS_HOST,
          }),
          severity: 'error',
          description: 'Redis host must be specified',
        },
        {
          name: 'redis-port-valid',
          validator: (value: any, config: any) => {
            const port = parseInt(config.REDIS_PORT, 10);
            const valid = !isNaN(port) && port > 0 && port <= 65535;
            return {
              valid,
              message: valid ? 'Redis port is valid' : 'Redis port must be between 1-65535',
              actualValue: config.REDIS_PORT,
            };
          },
          severity: 'error',
          description: 'Redis port must be a valid port number',
        },
        {
          name: 'redis-ttl-reasonable',
          validator: (value: any, config: any) => {
            const ttl = parseInt(config.REDIS_TTL, 10);
            const valid = ttl >= 60 && ttl <= 86400; // 1 minute to 1 day
            return {
              valid,
              message: valid 
                ? 'Redis TTL is within recommended range' 
                : 'Redis TTL should be between 60-86400 seconds (1min-1day)',
              actualValue: ttl,
              expectedValue: '60-86400',
            };
          },
          severity: 'warning',
          description: 'Redis TTL should be reasonable for caching',
        },
      ],
    });

    // Security validation rules
    this.addCategory({
      name: 'security',
      description: 'Security configuration validation',
      enabled: true,
      stopOnError: true,
      rules: [
        {
          name: 'jwt-secret-strength',
          validator: (value: any, config: any) => {
            const secret = config.JWT_SECRET;
            const isDefault = secret === 'your-super-secret-jwt-key-change-this-in-production';
            const isStrong = secret && secret.length >= 32;
            const valid = !isDefault && isStrong;
            return {
              valid,
              message: valid 
                ? 'JWT secret is strong' 
                : isDefault 
                  ? 'JWT secret is using default value - SECURITY RISK' 
                  : 'JWT secret should be at least 32 characters',
              actualValue: secret ? `${secret.length} characters` : 'not set',
              expectedValue: 'at least 32 characters, not default',
            };
          },
          severity: 'error',
          description: 'JWT secret must be strong and not default value',
          suggestion: 'Generate a strong JWT secret with at least 32 characters',
        },
        {
          name: 'production-password-required',
          validator: (value: any, config: any) => {
            if (config.NODE_ENV !== 'production') return { valid: true };
            const valid = !!config.DB_PASSWORD;
            return {
              valid,
              message: valid 
                ? 'Database password is set for production' 
                : 'Database password is required in production',
              actualValue: config.DB_PASSWORD ? 'set' : 'not set',
            };
          },
          severity: 'error',
          description: 'Database password is required in production environment',
        },
        {
          name: 'rate-limit-configured',
          validator: (value: any, config: any) => {
            const max = parseInt(config.RATE_LIMIT_MAX, 10);
            const timeWindow = parseInt(config.RATE_LIMIT_TIME_WINDOW, 10);
            const valid = max > 0 && timeWindow > 0;
            return {
              valid,
              message: valid 
                ? 'Rate limiting is properly configured' 
                : 'Rate limiting configuration is invalid',
              actualValue: `${max} requests per ${timeWindow}ms`,
            };
          },
          severity: 'warning',
          description: 'Rate limiting should be properly configured',
        },
      ],
    });

    // Environment validation rules
    this.addCategory({
      name: 'environment',
      description: 'Environment and runtime configuration validation',
      enabled: true,
      stopOnError: false,
      rules: [
        {
          name: 'node-env-valid',
          validator: (value: any, config: any) => {
            const validEnvs = ['development', 'production', 'test'];
            const valid = validEnvs.includes(config.NODE_ENV);
            return {
              valid,
              message: valid 
                ? 'NODE_ENV is valid' 
                : `NODE_ENV must be one of: ${validEnvs.join(', ')}`,
              actualValue: config.NODE_ENV,
              expectedValue: validEnvs.join(', '),
            };
          },
          severity: 'error',
          description: 'NODE_ENV must be a valid environment',
        },
        {
          name: 'port-available',
          validator: (value: any, config: any) => {
            const port = parseInt(config.PORT, 10);
            const valid = !isNaN(port) && port >= 1024 && port <= 65535;
            return {
              valid,
              message: valid 
                ? 'Port is in valid range' 
                : 'Port should be between 1024-65535',
              actualValue: config.PORT,
              expectedValue: '1024-65535',
            };
          },
          severity: 'warning',
          description: 'Application port should be in recommended range',
        },
        {
          name: 'log-level-valid',
          validator: (value: any, config: any) => {
            const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];
            const valid = validLevels.includes(config.LOG_LEVEL);
            return {
              valid,
              message: valid 
                ? 'Log level is valid' 
                : `Log level must be one of: ${validLevels.join(', ')}`,
              actualValue: config.LOG_LEVEL,
              expectedValue: validLevels.join(', '),
            };
          },
          severity: 'warning',
          description: 'Log level must be valid',
        },
      ],
    });
  }

  addCategory(category: ValidationCategory): void {
    this.categories.set(category.name, category);
  }

  addRule(categoryName: string, rule: ValidationRule): void {
    const category = this.categories.get(categoryName);
    if (category) {
      category.rules.push(rule);
    } else {
      throw new Error(`Category '${categoryName}' not found`);
    }
  }

  async validateConfiguration(options: ValidationOptions = {}): Promise<ConfigValidationResult> {
    const startTime = Date.now();
    
    this.emit('validation-started', {
      type: 'validation-started',
      timestamp: new Date(),
      data: { options },
    } as ConfigValidatorEventData);

    const result: ConfigValidationResult = {
      valid: true,
      timestamp: new Date(),
      duration: 0,
      environment: this.fastify.config.NODE_ENV,
      summary: {
        total: 0,
        passed: 0,
        warnings: 0,
        errors: 0,
      },
      results: [],
      errors: [],
      warnings: [],
    };

    try {
      const categoriesToRun = options.categories 
        ? Array.from(this.categories.values()).filter(cat => options.categories!.includes(cat.name))
        : Array.from(this.categories.values()).filter(cat => cat.enabled);

      for (const category of categoriesToRun) {
        await this.validateCategory(category, result, options);
        
        this.emit('category-completed', {
          type: 'validation-started',
          timestamp: new Date(),
          data: { category: category.name, results: result.results.length },
        } as ConfigValidatorEventData);

        if (category.stopOnError && result.errors.length > 0 && options.stopOnFirstError) {
          break;
        }
      }

      // Test connections if requested
      if (options.validateConnections) {
        await this.validateConnections(result);
      }

      result.duration = Date.now() - startTime;
      result.valid = result.errors.length === 0;
      this.lastValidationResult = result;

      this.emit('validation-completed', {
        type: 'validation-completed',
        timestamp: new Date(),
        data: { result },
      } as ConfigValidatorEventData);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.valid = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown validation error');

      this.emit('validation-failed', {
        type: 'validation-failed',
        timestamp: new Date(),
        data: { error },
      } as ConfigValidatorEventData);

      return result;
    }
  }

  private async validateCategory(
    category: ValidationCategory,
    result: ConfigValidationResult,
    options: ValidationOptions
  ): Promise<void> {
    for (const rule of category.rules) {
      if (options.severity && rule.severity !== options.severity) {
        continue;
      }

      try {
        const validationResult = rule.validator(null, this.fastify.config);
        
        result.summary.total++;
        
        const ruleResult = {
          rule: rule.name,
          field: category.name,
          valid: validationResult.valid,
          severity: rule.severity,
          message: validationResult.message || '',
          actualValue: validationResult.actualValue,
          expectedValue: validationResult.expectedValue,
          suggestion: rule.suggestion,
        };

        result.results.push(ruleResult);

        if (validationResult.valid) {
          result.summary.passed++;
        } else {
          if (rule.severity === 'error') {
            result.summary.errors++;
            result.errors.push(`${category.name}: ${validationResult.message}`);
          } else if (rule.severity === 'warning') {
            result.summary.warnings++;
            if (options.includeWarnings !== false) {
              result.warnings.push(`${category.name}: ${validationResult.message}`);
            }
          }
        }

        this.emit('rule-executed', {
          type: 'rule-executed',
          timestamp: new Date(),
          data: { rule: rule.name, result: validationResult },
        } as ConfigValidatorEventData);

      } catch (error) {
        result.summary.total++;
        result.summary.errors++;
        const errorMessage = `Rule '${rule.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMessage);
        
        result.results.push({
          rule: rule.name,
          field: category.name,
          valid: false,
          severity: 'error',
          message: errorMessage,
        });
      }
    }
  }

  private async validateConnections(result: ConfigValidationResult): Promise<void> {
    const connectionResults: ConnectionValidationResult[] = [];

    // Test database connection
    if (this.fastify.knex && typeof this.fastify.knex === 'object') {
      const dbResult = await this.testDatabaseConnection();
      connectionResults.push(dbResult);
      
      if (!dbResult.connected) {
        result.errors.push(`Database connection failed: ${dbResult.error}`);
        result.summary.errors++;
      }
    }

    // Test Redis connection
    if (this.fastify.redis) {
      const redisResult = await this.testRedisConnection();
      connectionResults.push(redisResult);
      
      if (!redisResult.connected) {
        result.errors.push(`Redis connection failed: ${redisResult.error}`);
        result.summary.errors++;
      }
    }

    // Add connection results to the validation result
    (result as any).connections = connectionResults;
  }

  private async testDatabaseConnection(): Promise<ConnectionValidationResult> {
    const startTime = Date.now();
    
    try {
      await this.fastify.knex.raw('SELECT 1');
      return {
        service: 'database',
        connected: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'database',
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  private async testRedisConnection(): Promise<ConnectionValidationResult> {
    const startTime = Date.now();
    
    try {
      const result = await this.fastify.redis.ping();
      return {
        service: 'redis',
        connected: result === 'PONG',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: 'redis',
        connected: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }

  getEnvironmentMetrics(): EnvironmentValidationMetrics {
    const config = this.fastify.config;
    const configKeys = Object.keys(config);
    
    const metrics: EnvironmentValidationMetrics = {
      totalVariables: configKeys.length,
      validVariables: 0,
      missingVariables: 0,
      invalidVariables: 0,
      overriddenVariables: 0,
      deprecatedVariables: 0,
    };

    // Count variables by checking against process.env
    for (const key of configKeys) {
      const configValue = (config as any)[key];
      const envValue = process.env[key];
      
      if (configValue) {
        metrics.validVariables++;
      } else {
        metrics.missingVariables++;
      }
      
      if (envValue && envValue !== configValue) {
        metrics.overriddenVariables++;
      }
    }

    metrics.invalidVariables = metrics.totalVariables - metrics.validVariables;

    return metrics;
  }

  getLastValidationResult(): ConfigValidationResult | undefined {
    return this.lastValidationResult;
  }

  getCategories(): ValidationCategory[] {
    return Array.from(this.categories.values());
  }

  enableCategory(categoryName: string): void {
    const category = this.categories.get(categoryName);
    if (category) {
      category.enabled = true;
    }
  }

  disableCategory(categoryName: string): void {
    const category = this.categories.get(categoryName);
    if (category) {
      category.enabled = false;
    }
  }

  async validateConfigurationQuick(): Promise<boolean> {
    const result = await this.validateConfiguration({
      severity: 'error',
      stopOnFirstError: true,
      includeWarnings: false,
      validateConnections: false,
    });
    
    return result.valid;
  }

  generateConfigurationReport(): string {
    if (!this.lastValidationResult) {
      return 'No validation results available. Run validateConfiguration() first.';
    }

    const result = this.lastValidationResult;
    const lines: string[] = [];
    
    lines.push('='.repeat(60));
    lines.push('CONFIGURATION VALIDATION REPORT');
    lines.push('='.repeat(60));
    lines.push(`Environment: ${result.environment}`);
    lines.push(`Timestamp: ${result.timestamp.toISOString()}`);
    lines.push(`Duration: ${result.duration}ms`);
    lines.push(`Overall Status: ${result.valid ? 'VALID' : 'INVALID'}`);
    lines.push('');
    
    lines.push('SUMMARY:');
    lines.push(`  Total Rules: ${result.summary.total}`);
    lines.push(`  Passed: ${result.summary.passed}`);
    lines.push(`  Warnings: ${result.summary.warnings}`);
    lines.push(`  Errors: ${result.summary.errors}`);
    lines.push('');
    
    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      result.errors.forEach(error => lines.push(`  ❌ ${error}`));
      lines.push('');
    }
    
    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      result.warnings.forEach(warning => lines.push(`  ⚠️  ${warning}`));
      lines.push('');
    }
    
    lines.push('DETAILED RESULTS:');
    result.results.forEach(r => {
      const icon = r.valid ? '✅' : r.severity === 'error' ? '❌' : '⚠️';
      lines.push(`  ${icon} ${r.rule}: ${r.message}`);
      if (r.actualValue !== undefined) {
        lines.push(`      Actual: ${r.actualValue}`);
      }
      if (r.expectedValue !== undefined) {
        lines.push(`      Expected: ${r.expectedValue}`);
      }
      if (r.suggestion) {
        lines.push(`      Suggestion: ${r.suggestion}`);
      }
    });
    
    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }
}