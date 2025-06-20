import type { Knex } from 'knex';
import { BaseEntity, PaginationParams, PaginatedResponse } from '../types/common';

/**
 * Base repository interface with common CRUD operations
 */
export interface BaseRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(params?: PaginationParams): Promise<T[]>;
  findAllPaginated(params: PaginationParams): Promise<PaginatedResponse<T>>;
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  exists(id: string): Promise<boolean>;
  count(conditions?: Partial<T>): Promise<number>;
}

/**
 * Base repository implementation with common functionality
 */
export abstract class AbstractRepository<T extends BaseEntity> implements BaseRepository<T> {
  protected abstract tableName: string;

  constructor(protected knex: Knex) {}

  async findById(id: string): Promise<T | null> {
    const result = await this.knex(this.tableName)
      .where({ id })
      .first();
    return result || null;
  }

  async findAll(params?: PaginationParams): Promise<T[]> {
    const query = this.knex(this.tableName);
    
    if (params?.sort) {
      query.orderBy(params.sort, params.order || 'ASC');
    }
    
    if (params?.limit) {
      query.limit(params.limit);
      if (params.page && params.page > 1) {
        query.offset((params.page - 1) * params.limit);
      }
    }
    
    return query;
  }

  async findAllPaginated(params: PaginationParams): Promise<PaginatedResponse<T>> {
    const { page = 1, limit = 10, sort, order = 'ASC' } = params;
    const offset = (page - 1) * limit;

    const query = this.knex(this.tableName);
    const countQuery = this.knex(this.tableName);

    if (sort) {
      query.orderBy(sort, order);
    }

    const [data, [{ count }]] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery.count('* as count')
    ]);

    const total = parseInt(count as string, 10);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const [result] = await this.knex(this.tableName)
      .insert(data)
      .returning('*');
    return result;
  }

  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null> {
    const [result] = await this.knex(this.tableName)
      .where({ id })
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*');
    return result || null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedRows = await this.knex(this.tableName)
      .where({ id })
      .del();
    return deletedRows > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.knex(this.tableName)
      .where({ id })
      .first();
    return !!result;
  }

  async count(conditions?: Partial<T>): Promise<number> {
    const query = this.knex(this.tableName);
    
    if (conditions) {
      query.where(conditions);
    }
    
    const [{ count }] = await query.count('* as count');
    return parseInt(count as string, 10);
  }
}