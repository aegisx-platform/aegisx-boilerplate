import type { Knex } from 'knex';
import { 
  AuditLogRepository, 
  AuditLogEntity, 
  CreateAuditLogData, 
  AuditLogSearchParams,
  AuditLogStats,
  AuditAction
} from '../types/audit-log-types';

export class AuditLogRepositoryImpl implements AuditLogRepository {
  private readonly tableName = 'audit_logs';

  constructor(private readonly knex: Knex) {}

  async create(data: CreateAuditLogData): Promise<AuditLogEntity> {
    const [result] = await this.knex(this.tableName)
      .insert({
        ...data,
        status: data.status || 'success',
        created_at: new Date()
      })
      .returning('*');
    
    return result;
  }

  async findById(id: string): Promise<AuditLogEntity | null> {
    const result = await this.knex(this.tableName)
      .where({ id })
      .first();
    
    return result || null;
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<AuditLogEntity[]> {
    return this.knex(this.tableName)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async findByResourceType(resourceType: string, limit = 50, offset = 0): Promise<AuditLogEntity[]> {
    return this.knex(this.tableName)
      .where({ resource_type: resourceType })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async findByAction(action: AuditAction, limit = 50, offset = 0): Promise<AuditLogEntity[]> {
    return this.knex(this.tableName)
      .where({ action })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async findByDateRange(startDate: Date, endDate: Date, limit = 50, offset = 0): Promise<AuditLogEntity[]> {
    return this.knex(this.tableName)
      .whereBetween('created_at', [startDate, endDate])
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async search(params: AuditLogSearchParams): Promise<{
    data: AuditLogEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      user_id,
      action,
      resource_type,
      resource_id,
      status,
      start_date,
      end_date,
      ip_address,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = params;

    const query = this.knex(this.tableName);
    const countQuery = this.knex(this.tableName);

    // Apply filters
    if (user_id) {
      query.where({ user_id });
      countQuery.where({ user_id });
    }

    if (action) {
      query.where({ action });
      countQuery.where({ action });
    }

    if (resource_type) {
      query.where({ resource_type });
      countQuery.where({ resource_type });
    }

    if (resource_id) {
      query.where({ resource_id });
      countQuery.where({ resource_id });
    }

    if (status) {
      query.where({ status });
      countQuery.where({ status });
    }

    if (ip_address) {
      query.where({ ip_address });
      countQuery.where({ ip_address });
    }

    if (start_date && end_date) {
      query.whereBetween('created_at', [start_date, end_date]);
      countQuery.whereBetween('created_at', [start_date, end_date]);
    } else if (start_date) {
      query.where('created_at', '>=', start_date);
      countQuery.where('created_at', '>=', start_date);
    } else if (end_date) {
      query.where('created_at', '<=', end_date);
      countQuery.where('created_at', '<=', end_date);
    }

    // Apply sorting and pagination
    query.orderBy(sort_by, sort_order);
    query.limit(limit).offset(offset);

    // Execute queries
    const [data, [{ count }]] = await Promise.all([
      query,
      countQuery.count('* as count')
    ]);

    const total = parseInt(count as string, 10);
    const page = Math.floor(offset / limit) + 1;

    return {
      data,
      total,
      page,
      limit
    };
  }

  async getStats(): Promise<AuditLogStats> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalStats,
      actionStats,
      resourceStats,
      last24hCount,
      last7dCount,
      last30dCount
    ] = await Promise.all([
      // Total and status counts
      this.knex(this.tableName)
        .select('status')
        .count('* as count')
        .groupBy('status'),
      
      // Action summary
      this.knex(this.tableName)
        .select('action')
        .count('* as count')
        .groupBy('action'),
      
      // Resource type summary
      this.knex(this.tableName)
        .select('resource_type')
        .count('* as count')
        .groupBy('resource_type'),
      
      // Time-based counts
      this.knex(this.tableName)
        .where('created_at', '>=', last24h)
        .count('* as count')
        .first(),
      
      this.knex(this.tableName)
        .where('created_at', '>=', last7d)
        .count('* as count')
        .first(),
      
      this.knex(this.tableName)
        .where('created_at', '>=', last30d)
        .count('* as count')
        .first()
    ]);

    // Process results
    let total_logs = 0;
    let success_count = 0;
    let failed_count = 0;
    let error_count = 0;

    totalStats.forEach((stat: any) => {
      const count = parseInt(stat.count, 10);
      total_logs += count;
      
      switch (stat.status) {
        case 'success':
          success_count = count;
          break;
        case 'failed':
          failed_count = count;
          break;
        case 'error':
          error_count = count;
          break;
      }
    });

    const actions_summary: Record<string, number> = {};
    actionStats.forEach((stat: any) => {
      actions_summary[stat.action] = parseInt(stat.count, 10);
    });

    const resource_types_summary: Record<string, number> = {};
    resourceStats.forEach((stat: any) => {
      resource_types_summary[stat.resource_type] = parseInt(stat.count, 10);
    });

    return {
      total_logs,
      success_count,
      failed_count,
      error_count,
      actions_summary,
      resource_types_summary,
      last_24h_count: parseInt(last24hCount?.count as string || '0', 10),
      last_7d_count: parseInt(last7dCount?.count as string || '0', 10),
      last_30d_count: parseInt(last30dCount?.count as string || '0', 10)
    };
  }

  async cleanup(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const deletedCount = await this.knex(this.tableName)
      .where('created_at', '<', cutoffDate)
      .del();

    return deletedCount;
  }
}