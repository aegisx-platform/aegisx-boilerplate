import { FastifyInstance } from 'fastify';
import { ConfigRepository } from '../repositories/config-repository';
import { ConfigMetadataRepository } from '../repositories/config-metadata-repository';
import { ConfigHistoryRepository } from '../repositories/config-history-repository';
import {
  SystemConfiguration,
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
  ConfigurationWithMetadata,
  ConfigurationCategory,
  ConfigurationGroup,
  ConfigEnvironment,
  ConfigurationSearchParams,
  ConfigurationSearchResult,
  BulkUpdateConfigurationRequest,
  ConfigurationChangeEvent,
  MergedConfiguration,
  ConfigurationSource,
  ConfigurationServiceOptions,
} from '../types/config.types';

export class ConfigService {
  private fastify: FastifyInstance;
  private configRepo: ConfigRepository;
  private metadataRepo: ConfigMetadataRepository;
  private historyRepo: ConfigHistoryRepository;
  private options: ConfigurationServiceOptions;

  constructor(
    fastify: FastifyInstance,
    options: ConfigurationServiceOptions = {}
  ) {
    this.fastify = fastify;
    this.configRepo = new ConfigRepository(fastify);
    this.metadataRepo = new ConfigMetadataRepository(fastify);
    this.historyRepo = new ConfigHistoryRepository(fastify);
    this.options = {
      enableCache: true,
      cacheTimeout: 300, // 5 minutes
      enableEncryption: true,
      enableAuditLog: true,
      enableHotReload: true,
      environment: 'development',
      ...options,
    };
  }

  /**
   * สร้าง configuration ใหม่
   */
  async createConfiguration(
    data: CreateConfigurationRequest,
    context: {
      userId?: number;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<SystemConfiguration> {
    const { userId, ipAddress, userAgent } = context;

    // ตรวจสอบว่า configuration key ซ้ำหรือไม่
    const exists = await this.configRepo.exists(
      data.category,
      data.configKey,
      data.environment || 'development'
    );

    if (exists) {
      throw new Error(`Configuration key '${data.configKey}' already exists in category '${data.category}'`);
    }

    // Encrypt sensitive values ถ้าจำเป็น
    let configValue = data.configValue;
    if (data.isEncrypted && configValue && this.options.enableEncryption) {
      configValue = await this.encryptValue(configValue);
    }

    // สร้าง configuration
    const config = await this.configRepo.create({
      ...data,
      configValue,
    }, userId);

    // บันทึกประวัติ
    if (this.options.enableAuditLog) {
      await this.historyRepo.create({
        configId: config.id,
        oldValue: undefined,
        newValue: config.configValue,
        changedBy: userId,
        changeReason: data.changeReason || 'Configuration created',
        ipAddress,
        userAgent,
      });
    }

    // ส่ง event สำหรับ hot reload
    if (this.options.enableHotReload) {
      await this.publishChangeEvent({
        type: 'created',
        category: config.category,
        configKey: config.configKey,
        environment: config.environment,
        oldValue: undefined,
        newValue: config.configValue,
        changedBy: userId || 0,
        timestamp: new Date(),
        changeReason: data.changeReason,
      });
    }

    // อัพเดท cache
    if (this.options.enableCache) {
      await this.updateCache(config.category, config.environment);
    }

    return config;
  }

  /**
   * อัพเดท configuration
   */
  async updateConfiguration(
    id: number,
    data: UpdateConfigurationRequest,
    context: {
      userId?: number;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<SystemConfiguration> {
    const { userId, ipAddress, userAgent } = context;

    // ดึง configuration เดิม
    const existingConfig = await this.configRepo.findById(id);
    if (!existingConfig) {
      throw new Error(`Configuration with id ${id} not found`);
    }

    const oldValue = existingConfig.configValue;

    // Encrypt sensitive values ถ้าจำเป็น
    let configValue = data.configValue;
    if (data.isEncrypted && configValue && this.options.enableEncryption) {
      configValue = await this.encryptValue(configValue);
    } else if (data.configValue !== undefined) {
      configValue = data.configValue;
    }

    // อัพเดท configuration
    const updatedConfig = await this.configRepo.update(id, {
      ...data,
      configValue,
    }, userId);

    if (!updatedConfig) {
      throw new Error(`Failed to update configuration with id ${id}`);
    }

    // บันทึกประวัติ
    if (this.options.enableAuditLog && (oldValue !== updatedConfig.configValue || data.isActive !== undefined)) {
      await this.historyRepo.create({
        configId: id,
        oldValue,
        newValue: updatedConfig.configValue,
        changedBy: userId,
        changeReason: data.changeReason || 'Configuration updated',
        ipAddress,
        userAgent,
      });
    }

    // ส่ง event สำหรับ hot reload
    if (this.options.enableHotReload) {
      await this.publishChangeEvent({
        type: 'updated',
        category: updatedConfig.category,
        configKey: updatedConfig.configKey,
        environment: updatedConfig.environment,
        oldValue,
        newValue: updatedConfig.configValue,
        changedBy: userId || 0,
        timestamp: new Date(),
        changeReason: data.changeReason,
      });
    }

    // อัพเดท cache
    if (this.options.enableCache) {
      await this.updateCache(updatedConfig.category, updatedConfig.environment);
    }

    return updatedConfig;
  }

  /**
   * ดึง configuration พร้อม metadata
   */
  async getConfigurationWithMetadata(
    category: string,
    environment: ConfigEnvironment = 'development',
    includeInactive = false
  ): Promise<ConfigurationCategory> {
    const configs = await this.configRepo.findWithMetadata(category, environment, includeInactive);
    
    // จัดกลุ่ม configurations
    const groups: Record<string, ConfigurationWithMetadata[]> = {};
    
    for (const config of configs) {
      const groupName = config.groupName || 'general';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(config);
    }

    // แปลงเป็น ConfigurationGroup[]
    const configGroups: ConfigurationGroup[] = Object.entries(groups).map(([groupName, groupConfigs]) => ({
      groupName,
      displayName: groupName.charAt(0).toUpperCase() + groupName.slice(1),
      description: `${groupName} configurations`,
      configs: groupConfigs,
    }));

    return {
      category,
      displayName: category.charAt(0).toUpperCase() + category.slice(1),
      description: `${category} configuration settings`,
      configs,
      groups: configGroups,
    };
  }

  /**
   * ค้นหา configuration
   */
  async searchConfigurations(params: ConfigurationSearchParams): Promise<ConfigurationSearchResult> {
    const { configurations, total } = await this.configRepo.search(params);
    
    const page = params.page || 1;
    const limit = params.limit || 50;
    const totalPages = Math.ceil(total / limit);

    // ดึงข้อมูลสำหรับ filters
    const categories = await this.configRepo.getCategories(params.environment);
    const environments = await this.configRepo.getEnvironments();
    const groups = params.category ? 
      await this.metadataRepo.getGroupsByCategory(params.category) : [];

    return {
      configurations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      filters: {
        categories,
        environments,
        groups,
      },
    };
  }

  /**
   * Bulk update configurations
   */
  async bulkUpdateConfigurations(
    data: BulkUpdateConfigurationRequest,
    context: {
      userId?: number;
      ipAddress?: string;
      userAgent?: string;
    } = {}
  ): Promise<SystemConfiguration[]> {
    const { userId, ipAddress, userAgent } = context;

    // ดึง configurations เดิม
    const configIds = data.updates.map(u => u.id);
    const existingConfigs = await Promise.all(
      configIds.map(id => this.configRepo.findById(id))
    );

    // อัพเดท configurations
    const updatedConfigs = await this.configRepo.bulkUpdate(data, userId);

    // บันทึกประวัติและส่ง events
    if (this.options.enableAuditLog || this.options.enableHotReload) {
      for (let i = 0; i < updatedConfigs.length; i++) {
        const config = updatedConfigs[i];
        const existingConfig = existingConfigs[i];
        const update = data.updates[i];

        if (existingConfig) {
          // บันทึกประวัติ
          if (this.options.enableAuditLog) {
            await this.historyRepo.create({
              configId: config.id,
              oldValue: existingConfig.configValue,
              newValue: config.configValue,
              changedBy: userId,
              changeReason: data.changeReason || 'Bulk update',
              ipAddress,
              userAgent,
            });
          }

          // ส่ง event สำหรับ hot reload
          if (this.options.enableHotReload) {
            await this.publishChangeEvent({
              type: 'updated',
              category: config.category,
              configKey: config.configKey,
              environment: config.environment,
              oldValue: existingConfig.configValue,
              newValue: config.configValue,
              changedBy: userId || 0,
              timestamp: new Date(),
              changeReason: data.changeReason,
            });
          }
        }
      }
    }

    // อัพเดท cache
    if (this.options.enableCache) {
      const categories = [...new Set(updatedConfigs.map(c => c.category))];
      const environment = data.environment || 'development';
      
      for (const category of categories) {
        await this.updateCache(category, environment);
      }
    }

    return updatedConfigs;
  }

  /**
   * ดึง configuration values เป็น object
   */
  async getConfigValues(
    category: string,
    environment: ConfigEnvironment = 'development',
    activeOnly = true
  ): Promise<Record<string, any>> {
    // ลองดึงจาก cache ก่อน
    if (this.options.enableCache) {
      const cached = await this.getFromCache(category, environment);
      if (cached) {
        return cached;
      }
    }

    // ดึงจาก database
    const configValues = await this.configRepo.getConfigValues(category, environment, activeOnly);

    // Decrypt encrypted values
    if (this.options.enableEncryption) {
      const configs = await this.configRepo.findByCategory(category, environment, !activeOnly);
      for (const config of configs) {
        if (config.isEncrypted && config.configValue && configValues[config.configKey]) {
          try {
            configValues[config.configKey] = await this.decryptValue(config.configValue);
          } catch (error) {
            this.fastify.log.error(`Failed to decrypt config ${config.configKey}:`, error);
          }
        }
      }
    }

    // บันทึกลง cache
    if (this.options.enableCache) {
      await this.setCache(category, environment, configValues);
    }

    return configValues;
  }

  /**
   * รวม configuration จากหลายแหล่ง (hierarchical configuration)
   */
  async getMergedConfiguration(
    category: string,
    environment: ConfigEnvironment = 'development'
  ): Promise<MergedConfiguration> {
    const sources: ConfigurationSource[] = [];

    // 1. Default values from metadata
    const metadata = await this.metadataRepo.findByCategory(category);
    const defaultValues: Record<string, any> = {};
    for (const meta of metadata) {
      if (meta.defaultValue !== null && meta.defaultValue !== undefined) {
        defaultValues[meta.configKey] = this.parseValue(meta.defaultValue, 'string');
      }
    }
    if (Object.keys(defaultValues).length > 0) {
      sources.push({
        source: 'default',
        priority: 1,
        values: defaultValues,
        lastUpdated: new Date(),
      });
    }

    // 2. Environment variables
    const envValues: Record<string, any> = {};
    for (const meta of metadata) {
      const envKey = `${category.toUpperCase()}_${meta.configKey.toUpperCase()}`;
      const envValue = process.env[envKey];
      if (envValue !== undefined) {
        envValues[meta.configKey] = this.parseValue(envValue, 'string');
      }
    }
    if (Object.keys(envValues).length > 0) {
      sources.push({
        source: 'environment',
        priority: 2,
        values: envValues,
        lastUpdated: new Date(),
      });
    }

    // 3. Cache
    if (this.options.enableCache) {
      const cacheValues = await this.getFromCache(category, environment);
      if (cacheValues && Object.keys(cacheValues).length > 0) {
        sources.push({
          source: 'cache',
          priority: 3,
          values: cacheValues,
          lastUpdated: new Date(),
        });
      }
    }

    // 4. Database
    const dbValues = await this.getConfigValues(category, environment);
    if (Object.keys(dbValues).length > 0) {
      sources.push({
        source: 'database',
        priority: 4,
        values: dbValues,
        lastUpdated: new Date(),
      });
    }

    // Merge ตาม priority (higher priority overwrites lower)
    const mergedValues: Record<string, any> = {};
    sources.sort((a, b) => a.priority - b.priority);
    
    for (const source of sources) {
      Object.assign(mergedValues, source.values);
    }

    return {
      category,
      environment,
      values: mergedValues,
      sources,
      mergedAt: new Date(),
    };
  }

  /**
   * ลบ configuration
   */
  async deleteConfiguration(
    id: number,
    context: {
      userId?: number;
      ipAddress?: string;
      userAgent?: string;
      changeReason?: string;
    } = {}
  ): Promise<boolean> {
    const { userId, ipAddress, userAgent, changeReason } = context;

    // ดึง configuration เดิม
    const existingConfig = await this.configRepo.findById(id);
    if (!existingConfig) {
      return false;
    }

    // บันทึกประวัติก่อนลบ
    if (this.options.enableAuditLog) {
      await this.historyRepo.create({
        configId: id,
        oldValue: existingConfig.configValue,
        newValue: undefined,
        changedBy: userId,
        changeReason: changeReason || 'Configuration deleted',
        ipAddress,
        userAgent,
      });
    }

    // ลบ configuration
    const deleted = await this.configRepo.delete(id);

    if (deleted) {
      // ส่ง event สำหรับ hot reload
      if (this.options.enableHotReload) {
        await this.publishChangeEvent({
          type: 'deleted',
          category: existingConfig.category,
          configKey: existingConfig.configKey,
          environment: existingConfig.environment,
          oldValue: existingConfig.configValue,
          newValue: undefined,
          changedBy: userId || 0,
          timestamp: new Date(),
          changeReason,
        });
      }

      // อัพเดท cache
      if (this.options.enableCache) {
        await this.updateCache(existingConfig.category, existingConfig.environment);
      }
    }

    return deleted;
  }

  /**
   * ส่ง change event ผ่าน EventBus
   */
  private async publishChangeEvent(event: ConfigurationChangeEvent): Promise<void> {
    try {
      await this.fastify.eventBus.publish('config.changed', event);
      await this.fastify.eventBus.publish(`config.${event.category}.changed`, event);
      
      this.fastify.log.info('Configuration change event published', {
        type: event.type,
        category: event.category,
        configKey: event.configKey,
        environment: event.environment,
        changedBy: event.changedBy,
      });
    } catch (error) {
      this.fastify.log.error('Failed to publish configuration change event:', error);
    }
  }

  /**
   * อัพเดท cache
   */
  private async updateCache(category: string, environment: ConfigEnvironment): Promise<void> {
    if (!this.options.enableCache || !this.fastify.redis) {
      return;
    }

    try {
      const configValues = await this.configRepo.getConfigValues(category, environment);
      const cacheKey = `config:${category}:${environment}`;
      
      await this.fastify.redis.setex(
        cacheKey,
        this.options.cacheTimeout || 300,
        JSON.stringify(configValues)
      );

      this.fastify.log.debug(`Configuration cache updated for ${category}:${environment}`);
    } catch (error) {
      this.fastify.log.error('Failed to update configuration cache:', error);
    }
  }

  /**
   * ดึงข้อมูลจาก cache
   */
  private async getFromCache(category: string, environment: ConfigEnvironment): Promise<Record<string, any> | null> {
    if (!this.options.enableCache || !this.fastify.redis) {
      return null;
    }

    try {
      const cacheKey = `config:${category}:${environment}`;
      const cached = await this.fastify.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      this.fastify.log.error('Failed to get configuration from cache:', error);
    }

    return null;
  }

  /**
   * บันทึกลง cache
   */
  private async setCache(
    category: string, 
    environment: ConfigEnvironment, 
    values: Record<string, any>
  ): Promise<void> {
    if (!this.options.enableCache || !this.fastify.redis) {
      return;
    }

    try {
      const cacheKey = `config:${category}:${environment}`;
      await this.fastify.redis.setex(
        cacheKey,
        this.options.cacheTimeout || 300,
        JSON.stringify(values)
      );
    } catch (error) {
      this.fastify.log.error('Failed to set configuration cache:', error);
    }
  }

  /**
   * เข้ารหัสค่า sensitive
   */
  private async encryptValue(value: string): Promise<string> {
    // TODO: Implement encryption using crypto or dedicated encryption service
    // For now, return as-is (should be implemented based on security requirements)
    return value;
  }

  /**
   * ถอดรหัสค่า sensitive
   */
  private async decryptValue(encryptedValue: string): Promise<string> {
    // TODO: Implement decryption using crypto or dedicated encryption service
    // For now, return as-is (should be implemented based on security requirements)
    return encryptedValue;
  }

  /**
   * แปลงค่าตาม type
   */
  private parseValue(value: string, valueType: string): any {
    switch (valueType) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
}