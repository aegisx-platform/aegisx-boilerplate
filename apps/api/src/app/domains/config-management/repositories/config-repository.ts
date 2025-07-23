import { Knex } from 'knex';
import { FastifyInstance } from 'fastify';
import {
  SystemConfiguration,
  CreateConfigurationRequest,
  UpdateConfigurationRequest,
  ConfigurationSearchParams,
  ConfigurationWithMetadata,
  ConfigEnvironment,
  BulkUpdateConfigurationRequest,
} from '../types/config.types';

export class ConfigRepository {
  private db: Knex;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.db = fastify.knex;
  }

  /**
   * สร้าง configuration ใหม่
   */
  async create(data: CreateConfigurationRequest, userId?: number): Promise<SystemConfiguration> {
    const configData = {
      category: data.category,
      config_key: data.configKey,
      config_value: data.configValue,
      value_type: data.valueType || 'string',
      is_encrypted: data.isEncrypted || false,
      is_active: data.isActive !== undefined ? data.isActive : true,
      environment: data.environment || 'development',
      updated_by: userId,
    };

    const [result] = await this.db('system_configurations')
      .insert(configData)
      .returning('*');

    return this.mapToSystemConfiguration(result);
  }

  /**
   * ดึง configuration ตาม ID
   */
  async findById(id: number): Promise<SystemConfiguration | null> {
    const result = await this.db('system_configurations')
      .where('id', id)
      .first();

    return result ? this.mapToSystemConfiguration(result) : null;
  }

  /**
   * ดึง configuration ตาม category, key, และ environment
   */
  async findByKey(
    category: string,
    configKey: string,
    environment: ConfigEnvironment = 'development'
  ): Promise<SystemConfiguration | null> {
    const result = await this.db('system_configurations')
      .where({
        category,
        config_key: configKey,
        environment,
      })
      .first();

    return result ? this.mapToSystemConfiguration(result) : null;
  }

  /**
   * ดึง configuration ทั้งหมดของ category
   */
  async findByCategory(
    category: string,
    environment: ConfigEnvironment = 'development',
    includeInactive = false
  ): Promise<SystemConfiguration[]> {
    let query = this.db('system_configurations')
      .where({
        category,
        environment,
      });

    if (!includeInactive) {
      query = query.where('is_active', true);
    }

    const results = await query.orderBy('config_key');
    return results.map(this.mapToSystemConfiguration);
  }

  /**
   * ดึง configuration พร้อม metadata
   */
  async findWithMetadata(
    category: string,
    environment: ConfigEnvironment = 'development',
    includeInactive = false
  ): Promise<ConfigurationWithMetadata[]> {
    let query = this.db('system_configurations as sc')
      .leftJoin('configuration_metadata as cm', function() {
        this.on('sc.category', 'cm.category')
            .andOn('sc.config_key', 'cm.config_key');
      })
      .select(
        'sc.*',
        'cm.display_name',
        'cm.description',
        'cm.input_type',
        'cm.validation_rules',
        'cm.default_value',
        'cm.is_required',
        'cm.sort_order',
        'cm.group_name',
        'cm.help_text'
      )
      .where('sc.category', category)
      .where('sc.environment', environment);

    if (!includeInactive) {
      query = query.where('sc.is_active', true);
    }

    const results = await query.orderBy('cm.sort_order').orderBy('sc.config_key');
    
    return results.map(row => ({
      ...this.mapToSystemConfiguration(row),
      metadata: row.display_name ? {
        id: 0, // metadata ไม่มี id ในการ join
        category: row.category,
        configKey: row.config_key,
        displayName: row.display_name,
        description: row.description,
        inputType: row.input_type,
        validationRules: row.validation_rules,
        defaultValue: row.default_value,
        isRequired: row.is_required,
        sortOrder: row.sort_order || 0,
        groupName: row.group_name,
        helpText: row.help_text,
        createdAt: new Date(),
      } : undefined,
      displayName: row.display_name,
      description: row.description,
      inputType: row.input_type,
      validationRules: row.validation_rules,
      isRequired: row.is_required,
      groupName: row.group_name,
      helpText: row.help_text,
    }));
  }

  /**
   * ค้นหา configuration ด้วยเงื่อนไขต่างๆ
   */
  async search(params: ConfigurationSearchParams): Promise<{
    configurations: ConfigurationWithMetadata[];
    total: number;
  }> {
    const {
      category,
      configKey,
      environment = 'development',
      isActive,
      isEncrypted,
      groupName,
      search,
      page = 1,
      limit = 50,
      sortBy = 'config_key',
      sortOrder = 'asc',
    } = params;

    let query = this.db('system_configurations as sc')
      .leftJoin('configuration_metadata as cm', function() {
        this.on('sc.category', 'cm.category')
            .andOn('sc.config_key', 'cm.config_key');
      })
      .select(
        'sc.*',
        'cm.display_name',
        'cm.description',
        'cm.input_type',
        'cm.validation_rules',
        'cm.default_value',
        'cm.is_required',
        'cm.sort_order',
        'cm.group_name',
        'cm.help_text'
      );

    // Apply filters
    if (category) {
      query = query.where('sc.category', category);
    }
    if (configKey) {
      query = query.where('sc.config_key', 'like', `%${configKey}%`);
    }
    if (environment) {
      query = query.where('sc.environment', environment);
    }
    if (isActive !== undefined) {
      query = query.where('sc.is_active', isActive);
    }
    if (isEncrypted !== undefined) {
      query = query.where('sc.is_encrypted', isEncrypted);
    }
    if (groupName) {
      query = query.where('cm.group_name', groupName);
    }
    if (search) {
      query = query.where(function() {
        this.where('sc.config_key', 'like', `%${search}%`)
            .orWhere('cm.display_name', 'like', `%${search}%`)
            .orWhere('cm.description', 'like', `%${search}%`);
      });
    }

    // Get total count
    const totalResult = await query.clone().count('sc.id as count').first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination and sorting
    const offset = (page - 1) * limit;
    const sortColumn = sortBy === 'configKey' ? 'sc.config_key' :
                      sortBy === 'category' ? 'sc.category' :
                      sortBy === 'updatedAt' ? 'sc.updated_at' :
                      sortBy === 'createdAt' ? 'sc.created_at' : 'sc.config_key';

    const results = await query
      .orderBy(sortColumn, sortOrder)
      .limit(limit)
      .offset(offset);

    const configurations = results.map(row => ({
      ...this.mapToSystemConfiguration(row),
      metadata: row.display_name ? {
        id: 0,
        category: row.category,
        configKey: row.config_key,
        displayName: row.display_name,
        description: row.description,
        inputType: row.input_type,
        validationRules: row.validation_rules,
        defaultValue: row.default_value,
        isRequired: row.is_required,
        sortOrder: row.sort_order || 0,
        groupName: row.group_name,
        helpText: row.help_text,
        createdAt: new Date(),
      } : undefined,
      displayName: row.display_name,
      description: row.description,
      inputType: row.input_type,
      validationRules: row.validation_rules,
      isRequired: row.is_required,
      groupName: row.group_name,
      helpText: row.help_text,
    }));

    return { configurations, total };
  }

  /**
   * อัพเดท configuration
   */
  async update(id: number, data: UpdateConfigurationRequest, userId?: number): Promise<SystemConfiguration | null> {
    const updateData: any = {
      updated_by: userId,
      updated_at: new Date(),
    };

    if (data.configValue !== undefined) {
      updateData.config_value = data.configValue;
    }
    if (data.valueType !== undefined) {
      updateData.value_type = data.valueType;
    }
    if (data.isEncrypted !== undefined) {
      updateData.is_encrypted = data.isEncrypted;
    }
    if (data.isActive !== undefined) {
      updateData.is_active = data.isActive;
    }

    const [result] = await this.db('system_configurations')
      .where('id', id)
      .update(updateData)
      .returning('*');

    return result ? this.mapToSystemConfiguration(result) : null;
  }

  /**
   * Bulk update configurations
   */
  async bulkUpdate(data: BulkUpdateConfigurationRequest, userId?: number): Promise<SystemConfiguration[]> {
    const results: SystemConfiguration[] = [];

    await this.db.transaction(async (trx) => {
      for (const update of data.updates) {
        const updateData: any = {
          updated_by: userId,
          updated_at: new Date(),
        };

        if (update.configValue !== undefined) {
          updateData.config_value = update.configValue;
        }
        if (update.isActive !== undefined) {
          updateData.is_active = update.isActive;
        }

        const [result] = await trx('system_configurations')
          .where('id', update.id)
          .update(updateData)
          .returning('*');

        if (result) {
          results.push(this.mapToSystemConfiguration(result));
        }
      }
    });

    return results;
  }

  /**
   * ลบ configuration
   */
  async delete(id: number): Promise<boolean> {
    const deleted = await this.db('system_configurations')
      .where('id', id)
      .del();

    return deleted > 0;
  }

  /**
   * ดึง configurations ทั้งหมดของ environment
   */
  async findByEnvironment(
    environment: ConfigEnvironment,
    activeOnly = true
  ): Promise<SystemConfiguration[]> {
    let query = this.db('system_configurations')
      .where('environment', environment);

    if (activeOnly) {
      query = query.where('is_active', true);
    }

    const results = await query.orderBy('category').orderBy('config_key');
    return results.map(this.mapToSystemConfiguration);
  }

  /**
   * ดึงรายการ categories ที่มีอยู่
   */
  async getCategories(environment?: ConfigEnvironment): Promise<string[]> {
    let query = this.db('system_configurations')
      .distinct('category');

    if (environment) {
      query = query.where('environment', environment);
    }

    const results = await query.orderBy('category');
    return results.map(row => row.category);
  }

  /**
   * ดึงรายการ environments ที่มีอยู่
   */
  async getEnvironments(): Promise<ConfigEnvironment[]> {
    const results = await this.db('system_configurations')
      .distinct('environment')
      .orderBy('environment');

    return results.map(row => row.environment as ConfigEnvironment);
  }

  /**
   * ตรวจสอบว่า configuration key ซ้ำหรือไม่
   */
  async exists(
    category: string,
    configKey: string,
    environment: ConfigEnvironment,
    excludeId?: number
  ): Promise<boolean> {
    let query = this.db('system_configurations')
      .where({
        category,
        config_key: configKey,
        environment,
      });

    if (excludeId) {
      query = query.where('id', '!=', excludeId);
    }

    const result = await query.first();
    return !!result;
  }

  /**
   * ดึง configuration เป็น key-value pairs
   */
  async getConfigValues(
    category: string,
    environment: ConfigEnvironment = 'development',
    activeOnly = true
  ): Promise<Record<string, any>> {
    let query = this.db('system_configurations')
      .select('config_key', 'config_value', 'value_type')
      .where({
        category,
        environment,
      });

    if (activeOnly) {
      query = query.where('is_active', true);
    }

    const results = await query;
    const configValues: Record<string, any> = {};

    for (const row of results) {
      const value = this.parseConfigValue(row.config_value, row.value_type);
      configValues[row.config_key] = value;
    }

    return configValues;
  }

  /**
   * แปลงค่า configuration ตามประเภท
   */
  private parseConfigValue(value: string | null, valueType: string): any {
    if (value === null || value === undefined) {
      return null;
    }

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

  /**
   * แปลง database row เป็น SystemConfiguration object
   */
  private mapToSystemConfiguration(row: any): SystemConfiguration {
    return {
      id: row.id,
      category: row.category,
      configKey: row.config_key,
      configValue: row.config_value,
      valueType: row.value_type,
      isEncrypted: row.is_encrypted,
      isActive: row.is_active,
      environment: row.environment,
      updatedBy: row.updated_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}