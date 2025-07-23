import { Knex } from 'knex';
import { FastifyInstance } from 'fastify';
import { ConfigurationHistory } from '../types/config.types';

export class ConfigHistoryRepository {
  private db: Knex;
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.db = fastify.knex;
  }

  /**
   * บันทึกประวัติการเปลี่ยนแปลง configuration
   */
  async create(data: {
    configId: number;
    oldValue?: string;
    newValue?: string;
    changedBy?: number;
    changeReason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<ConfigurationHistory> {
    const historyData = {
      config_id: data.configId,
      old_value: data.oldValue,
      new_value: data.newValue,
      changed_by: data.changedBy,
      change_reason: data.changeReason,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
    };

    const [result] = await this.db('configuration_history')
      .insert(historyData)
      .returning('*');

    return this.mapToConfigurationHistory(result);
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงของ configuration
   */
  async findByConfigId(
    configId: number,
    options: {
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    history: ConfigurationHistory[];
    total: number;
  }> {
    const { page = 1, limit = 50, sortOrder = 'desc' } = options;

    // Get total count
    const totalResult = await this.db('configuration_history')
      .where('config_id', configId)
      .count('id as count')
      .first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Get history records
    const offset = (page - 1) * limit;
    const results = await this.db('configuration_history')
      .where('config_id', configId)
      .orderBy('created_at', sortOrder)
      .limit(limit)
      .offset(offset);

    const history = results.map(this.mapToConfigurationHistory);

    return { history, total };
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงพร้อมข้อมูล configuration
   */
  async findByConfigIdWithDetails(
    configId: number,
    options: {
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ): Promise<{
    history: Array<ConfigurationHistory & {
      config?: {
        category: string;
        configKey: string;
        environment: string;
      };
      changedByUser?: {
        id: number;
        email: string;
        username?: string;
      };
    }>;
    total: number;
  }> {
    const { page = 1, limit = 50, sortOrder = 'desc' } = options;

    // Get total count
    const totalResult = await this.db('configuration_history')
      .where('config_id', configId)
      .count('id as count')
      .first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Get history records with joins
    const offset = (page - 1) * limit;
    const results = await this.db('configuration_history as ch')
      .leftJoin('system_configurations as sc', 'ch.config_id', 'sc.id')
      .leftJoin('users as u', 'ch.changed_by', 'u.id')
      .select(
        'ch.*',
        'sc.category',
        'sc.config_key',
        'sc.environment',
        'u.id as user_id',
        'u.email as user_email',
        'u.username as user_username'
      )
      .where('ch.config_id', configId)
      .orderBy('ch.created_at', sortOrder)
      .limit(limit)
      .offset(offset);

    const history = results.map(row => ({
      ...this.mapToConfigurationHistory(row),
      config: row.category ? {
        category: row.category,
        configKey: row.config_key,
        environment: row.environment,
      } : undefined,
      changedByUser: row.user_id ? {
        id: row.user_id,
        email: row.user_email,
        username: row.user_username,
      } : undefined,
    }));

    return { history, total };
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงของ category
   */
  async findByCategory(
    category: string,
    environment?: string,
    options: {
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<{
    history: Array<ConfigurationHistory & {
      config: {
        category: string;
        configKey: string;
        environment: string;
      };
      changedByUser?: {
        id: number;
        email: string;
        username?: string;
      };
    }>;
    total: number;
  }> {
    const { page = 1, limit = 50, sortOrder = 'desc', fromDate, toDate } = options;

    let query = this.db('configuration_history as ch')
      .join('system_configurations as sc', 'ch.config_id', 'sc.id')
      .leftJoin('users as u', 'ch.changed_by', 'u.id')
      .where('sc.category', category);

    if (environment) {
      query = query.where('sc.environment', environment);
    }

    if (fromDate) {
      query = query.where('ch.created_at', '>=', fromDate);
    }

    if (toDate) {
      query = query.where('ch.created_at', '<=', toDate);
    }

    // Get total count
    const totalResult = await query.clone().count('ch.id as count').first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Get history records
    const offset = (page - 1) * limit;
    const results = await query
      .select(
        'ch.*',
        'sc.category',
        'sc.config_key',
        'sc.environment',
        'u.id as user_id',
        'u.email as user_email',
        'u.username as user_username'
      )
      .orderBy('ch.created_at', sortOrder)
      .limit(limit)
      .offset(offset);

    const history = results.map(row => ({
      ...this.mapToConfigurationHistory(row),
      config: {
        category: row.category,
        configKey: row.config_key,
        environment: row.environment,
      },
      changedByUser: row.user_id ? {
        id: row.user_id,
        email: row.user_email,
        username: row.user_username,
      } : undefined,
    }));

    return { history, total };
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงของผู้ใช้
   */
  async findByUser(
    userId: number,
    options: {
      category?: string;
      environment?: string;
      page?: number;
      limit?: number;
      sortOrder?: 'asc' | 'desc';
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<{
    history: Array<ConfigurationHistory & {
      config: {
        category: string;
        configKey: string;
        environment: string;
      };
    }>;
    total: number;
  }> {
    const { category, environment, page = 1, limit = 50, sortOrder = 'desc', fromDate, toDate } = options;

    let query = this.db('configuration_history as ch')
      .join('system_configurations as sc', 'ch.config_id', 'sc.id')
      .where('ch.changed_by', userId);

    if (category) {
      query = query.where('sc.category', category);
    }

    if (environment) {
      query = query.where('sc.environment', environment);
    }

    if (fromDate) {
      query = query.where('ch.created_at', '>=', fromDate);
    }

    if (toDate) {
      query = query.where('ch.created_at', '<=', toDate);
    }

    // Get total count
    const totalResult = await query.clone().count('ch.id as count').first();
    const total = parseInt(totalResult?.count as string) || 0;

    // Get history records
    const offset = (page - 1) * limit;
    const results = await query
      .select(
        'ch.*',
        'sc.category',
        'sc.config_key',
        'sc.environment'
      )
      .orderBy('ch.created_at', sortOrder)
      .limit(limit)
      .offset(offset);

    const history = results.map(row => ({
      ...this.mapToConfigurationHistory(row),
      config: {
        category: row.category,
        configKey: row.config_key,
        environment: row.environment,
      },
    }));

    return { history, total };
  }

  /**
   * ดึงสถิติการเปลี่ยนแปลง configuration
   */
  async getChangeStatistics(
    options: {
      category?: string;
      environment?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<{
    totalChanges: number;
    changesByCategory: Array<{ category: string; count: number }>;
    changesByUser: Array<{ userId: number; userEmail: string; count: number }>;
    changesByDay: Array<{ date: string; count: number }>;
  }> {
    const { category, environment, fromDate, toDate } = options;

    let baseQuery = this.db('configuration_history as ch')
      .join('system_configurations as sc', 'ch.config_id', 'sc.id');

    if (category) {
      baseQuery = baseQuery.where('sc.category', category);
    }

    if (environment) {
      baseQuery = baseQuery.where('sc.environment', environment);
    }

    if (fromDate) {
      baseQuery = baseQuery.where('ch.created_at', '>=', fromDate);
    }

    if (toDate) {
      baseQuery = baseQuery.where('ch.created_at', '<=', toDate);
    }

    // Total changes
    const totalResult = await baseQuery.clone().count('ch.id as count').first();
    const totalChanges = parseInt(totalResult?.count as string) || 0;

    // Changes by category
    const changesByCategory = await baseQuery.clone()
      .select('sc.category')
      .count('ch.id as count')
      .groupBy('sc.category')
      .orderBy('count', 'desc');

    // Changes by user
    const changesByUser = await baseQuery.clone()
      .leftJoin('users as u', 'ch.changed_by', 'u.id')
      .select('ch.changed_by as userId', 'u.email as userEmail')
      .count('ch.id as count')
      .whereNotNull('ch.changed_by')
      .groupBy('ch.changed_by', 'u.email')
      .orderBy('count', 'desc');

    // Changes by day (last 30 days)
    const changesByDay = await baseQuery.clone()
      .select(this.db.raw('DATE(ch.created_at) as date'))
      .count('ch.id as count')
      .where('ch.created_at', '>=', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .groupBy(this.db.raw('DATE(ch.created_at)'))
      .orderBy('date', 'asc');

    return {
      totalChanges,
      changesByCategory: changesByCategory.map((row: any) => ({
        category: String(row.category),
        count: parseInt(row.count as string),
      })),
      changesByUser: changesByUser.map((row: any) => ({
        userId: Number(row.userId),
        userEmail: String(row.userEmail || 'Unknown'),
        count: parseInt(row.count as string),
      })),
      changesByDay: changesByDay.map((row: any) => ({
        date: row.date,
        count: parseInt(row.count as string),
      })),
    };
  }

  /**
   * ลบประวัติเก่าที่เกินระยะเวลาที่กำหนด
   */
  async cleanupOldHistory(
    daysToKeep: number = 365,
    category?: string
  ): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    let query = this.db('configuration_history')
      .where('created_at', '<', cutoffDate);

    if (category) {
      query = query.whereIn('config_id', 
        this.db('system_configurations')
          .select('id')
          .where('category', category)
      );
    }

    return await query.del();
  }

  /**
   * ลบประวัติของ configuration ที่ถูกลบแล้ว
   */
  async cleanupOrphanedHistory(): Promise<number> {
    return await this.db('configuration_history')
      .whereNotIn('config_id', 
        this.db('system_configurations').select('id')
      )
      .del();
  }

  /**
   * แปลง database row เป็น ConfigurationHistory object
   */
  private mapToConfigurationHistory(row: any): ConfigurationHistory {
    return {
      id: row.id,
      configId: row.config_id,
      oldValue: row.old_value,
      newValue: row.new_value,
      changedBy: row.changed_by,
      changeReason: row.change_reason,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: new Date(row.created_at),
    };
  }
}