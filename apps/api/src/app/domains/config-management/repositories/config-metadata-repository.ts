import { Knex } from 'knex';
import { FastifyInstance } from 'fastify';
import { ConfigurationMetadata } from '../types/config.types';

export class ConfigMetadataRepository {
  private db: Knex;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.db = fastify.knex;
  }

  /**
   * สร้าง metadata ใหม่
   */
  async create(data: Omit<ConfigurationMetadata, 'id' | 'createdAt'>): Promise<ConfigurationMetadata> {
    const metadataData = {
      category: data.category,
      config_key: data.configKey,
      display_name: data.displayName,
      description: data.description,
      input_type: data.inputType,
      validation_rules: data.validationRules ? JSON.stringify(data.validationRules) : null,
      default_value: data.defaultValue,
      is_required: data.isRequired,
      sort_order: data.sortOrder,
      group_name: data.groupName,
      help_text: data.helpText,
    };

    const [result] = await this.db('configuration_metadata')
      .insert(metadataData)
      .returning('*');

    return this.mapToConfigurationMetadata(result);
  }

  /**
   * ดึง metadata ตาม ID
   */
  async findById(id: number): Promise<ConfigurationMetadata | null> {
    const result = await this.db('configuration_metadata')
      .where('id', id)
      .first();

    return result ? this.mapToConfigurationMetadata(result) : null;
  }

  /**
   * ดึง metadata ตาม category และ key
   */
  async findByKey(category: string, configKey: string): Promise<ConfigurationMetadata | null> {
    const result = await this.db('configuration_metadata')
      .where({
        category,
        config_key: configKey,
      })
      .first();

    return result ? this.mapToConfigurationMetadata(result) : null;
  }

  /**
   * ดึง metadata ทั้งหมดของ category
   */
  async findByCategory(category: string): Promise<ConfigurationMetadata[]> {
    const results = await this.db('configuration_metadata')
      .where('category', category)
      .orderBy('sort_order')
      .orderBy('config_key');

    return results.map(this.mapToConfigurationMetadata);
  }

  /**
   * ดึง metadata จัดกลุ่มตาม group_name
   */
  async findByCategoryGrouped(category: string): Promise<Record<string, ConfigurationMetadata[]>> {
    const results = await this.db('configuration_metadata')
      .where('category', category)
      .orderBy('sort_order')
      .orderBy('config_key');

    const grouped: Record<string, ConfigurationMetadata[]> = {};
    
    for (const row of results) {
      const metadata = this.mapToConfigurationMetadata(row);
      const groupName = metadata.groupName || 'general';
      
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(metadata);
    }

    return grouped;
  }

  /**
   * อัพเดท metadata
   */
  async update(
    id: number, 
    data: Partial<Omit<ConfigurationMetadata, 'id' | 'category' | 'configKey' | 'createdAt'>>
  ): Promise<ConfigurationMetadata | null> {
    const updateData: any = {};

    if (data.displayName !== undefined) {
      updateData.display_name = data.displayName;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.inputType !== undefined) {
      updateData.input_type = data.inputType;
    }
    if (data.validationRules !== undefined) {
      updateData.validation_rules = data.validationRules ? JSON.stringify(data.validationRules) : null;
    }
    if (data.defaultValue !== undefined) {
      updateData.default_value = data.defaultValue;
    }
    if (data.isRequired !== undefined) {
      updateData.is_required = data.isRequired;
    }
    if (data.sortOrder !== undefined) {
      updateData.sort_order = data.sortOrder;
    }
    if (data.groupName !== undefined) {
      updateData.group_name = data.groupName;
    }
    if (data.helpText !== undefined) {
      updateData.help_text = data.helpText;
    }

    const [result] = await this.db('configuration_metadata')
      .where('id', id)
      .update(updateData)
      .returning('*');

    return result ? this.mapToConfigurationMetadata(result) : null;
  }

  /**
   * ลบ metadata
   */
  async delete(id: number): Promise<boolean> {
    const deleted = await this.db('configuration_metadata')
      .where('id', id)
      .del();

    return deleted > 0;
  }

  /**
   * ดึงรายการ categories ทั้งหมด
   */
  async getCategories(): Promise<string[]> {
    const results = await this.db('configuration_metadata')
      .distinct('category')
      .orderBy('category');

    return results.map(row => row.category);
  }

  /**
   * ดึงรายการ groups ของ category
   */
  async getGroupsByCategory(category: string): Promise<string[]> {
    const results = await this.db('configuration_metadata')
      .distinct('group_name')
      .where('category', category)
      .whereNotNull('group_name')
      .orderBy('group_name');

    return results.map(row => row.group_name);
  }

  /**
   * ตรวจสอบว่า metadata key ซ้ำหรือไม่
   */
  async exists(category: string, configKey: string, excludeId?: number): Promise<boolean> {
    let query = this.db('configuration_metadata')
      .where({
        category,
        config_key: configKey,
      });

    if (excludeId) {
      query = query.where('id', '!=', excludeId);
    }

    const result = await query.first();
    return !!result;
  }

  /**
   * Bulk insert metadata
   */
  async bulkCreate(metadataList: Omit<ConfigurationMetadata, 'id' | 'createdAt'>[]): Promise<ConfigurationMetadata[]> {
    const insertData = metadataList.map(data => ({
      category: data.category,
      config_key: data.configKey,
      display_name: data.displayName,
      description: data.description,
      input_type: data.inputType,
      validation_rules: data.validationRules ? JSON.stringify(data.validationRules) : null,
      default_value: data.defaultValue,
      is_required: data.isRequired,
      sort_order: data.sortOrder,
      group_name: data.groupName,
      help_text: data.helpText,
    }));

    const results = await this.db('configuration_metadata')
      .insert(insertData)
      .returning('*');

    return results.map(this.mapToConfigurationMetadata);
  }

  /**
   * ลบ metadata ทั้งหมดของ category
   */
  async deleteByCategory(category: string): Promise<number> {
    return await this.db('configuration_metadata')
      .where('category', category)
      .del();
  }

  /**
   * ค้นหา metadata
   */
  async search(params: {
    category?: string;
    search?: string;
    inputType?: string;
    isRequired?: boolean;
    groupName?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    metadata: ConfigurationMetadata[];
    total: number;
  }> {
    const {
      category,
      search,
      inputType,
      isRequired,
      groupName,
      page = 1,
      limit = 50,
    } = params;

    let query = this.db('configuration_metadata');

    // Apply filters
    if (category) {
      query = query.where('category', category);
    }
    if (search) {
      query = query.where(function() {
        this.where('config_key', 'like', `%${search}%`)
            .orWhere('display_name', 'like', `%${search}%`)
            .orWhere('description', 'like', `%${search}%`);
      });
    }
    if (inputType) {
      query = query.where('input_type', inputType);
    }
    if (isRequired !== undefined) {
      query = query.where('is_required', isRequired);
    }
    if (groupName) {
      query = query.where('group_name', groupName);
    }

    // Get total count
    const totalResult = await query.clone().count('id as count').first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Apply pagination
    const offset = (page - 1) * limit;
    const results = await query
      .orderBy('sort_order')
      .orderBy('config_key')
      .limit(limit)
      .offset(offset);

    const metadata = results.map(this.mapToConfigurationMetadata);

    return { metadata, total };
  }

  /**
   * อัพเดท sort order ของ metadata ใน category
   */
  async updateSortOrders(updates: Array<{ id: number; sortOrder: number }>): Promise<void> {
    await this.db.transaction(async (trx) => {
      for (const update of updates) {
        await trx('configuration_metadata')
          .where('id', update.id)
          .update({ sort_order: update.sortOrder });
      }
    });
  }

  /**
   * Clone metadata จาก category หนึ่งไปยังอีก category หนึ่ง
   */
  async cloneToCategory(
    sourceCategory: string, 
    targetCategory: string, 
    overwrite = false
  ): Promise<ConfigurationMetadata[]> {
    const sourceMetadata = await this.findByCategory(sourceCategory);
    
    if (sourceMetadata.length === 0) {
      return [];
    }

    // ถ้าไม่ overwrite ให้ตรวจสอบว่ามี metadata ใน target category แล้วหรือไม่
    if (!overwrite) {
      const existingMetadata = await this.findByCategory(targetCategory);
      if (existingMetadata.length > 0) {
        throw new Error(`Target category '${targetCategory}' already has metadata. Use overwrite=true to replace.`);
      }
    } else {
      // ลบ metadata เก่าใน target category
      await this.deleteByCategory(targetCategory);
    }

    // Clone metadata
    const clonedData = sourceMetadata.map(metadata => ({
      category: targetCategory,
      configKey: metadata.configKey,
      displayName: metadata.displayName,
      description: metadata.description,
      inputType: metadata.inputType,
      validationRules: metadata.validationRules,
      defaultValue: metadata.defaultValue,
      isRequired: metadata.isRequired,
      sortOrder: metadata.sortOrder,
      groupName: metadata.groupName,
      helpText: metadata.helpText,
    }));

    return await this.bulkCreate(clonedData);
  }

  /**
   * แปลง database row เป็น ConfigurationMetadata object
   */
  private mapToConfigurationMetadata(row: any): ConfigurationMetadata {
    return {
      id: row.id,
      category: row.category,
      configKey: row.config_key,
      displayName: row.display_name,
      description: row.description,
      inputType: row.input_type,
      validationRules: row.validation_rules ? JSON.parse(row.validation_rules) : undefined,
      defaultValue: row.default_value,
      isRequired: row.is_required,
      sortOrder: row.sort_order,
      groupName: row.group_name,
      helpText: row.help_text,
      createdAt: new Date(row.created_at),
    };
  }
}