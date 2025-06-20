/**
 * Common types used across the application
 */

export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface SoftDeletableEntity extends BaseEntity {
  is_active: boolean;
}

export interface TimestampedEntity {
  created_at: Date;
  updated_at: Date;
}

export interface AuditableEntity extends TimestampedEntity {
  created_by?: string;
  updated_by?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;