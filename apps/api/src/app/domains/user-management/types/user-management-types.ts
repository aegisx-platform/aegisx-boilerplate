import { Static } from '@sinclair/typebox';
import {
  UserListResponseSchema,
  UserDetailResponseSchema,
  CreateUserRequestSchema,
  UpdateUserRequestSchema,
  UserSearchRequestSchema,
  UserStatsResponseSchema,
  BulkUserActionRequestSchema
} from '../schemas/user-management-schemas';

/**
 * TypeScript types derived from TypeBox schemas for User Management
 */
export type UserListResponse = Static<typeof UserListResponseSchema>;
export type UserDetailResponse = Static<typeof UserDetailResponseSchema>;
export type CreateUserRequest = Static<typeof CreateUserRequestSchema>;
export type UpdateUserRequest = Static<typeof UpdateUserRequestSchema>;
export type UserSearchRequest = Static<typeof UserSearchRequestSchema>;
export type UserStatsResponse = Static<typeof UserStatsResponseSchema>;
export type BulkUserActionRequest = Static<typeof BulkUserActionRequestSchema>;

/**
 * User filters for search and listing
 */
export interface UserFilters {
  status?: 'active' | 'inactive' | 'suspended';
  email_verified?: boolean;
  search?: string;
  created_after?: Date;
  created_before?: Date;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'email';
  sort_order?: 'asc' | 'desc';
}

/**
 * User list with pagination metadata
 */
export interface PaginatedUsers {
  users: UserDetailResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

/**
 * User statistics
 */
export interface UserStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  verified_users: number;
  unverified_users: number;
  recent_registrations: number; // last 30 days
}

/**
 * Bulk action types
 */
export type BulkActionType = 'activate' | 'deactivate' | 'suspend' | 'delete' | 'verify_email';

/**
 * Bulk action result
 */
export interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
}

/**
 * User activity log entry
 */
export interface UserActivity {
  id: string;
  user_id: string;
  action: string;
  details?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

/**
 * User management service interface
 */
export interface UserManagementService {
  // List and search
  listUsers(filters?: UserFilters, pagination?: PaginationParams): Promise<PaginatedUsers>;
  searchUsers(query: string, filters?: UserFilters): Promise<UserDetailResponse[]>;
  getUserById(id: string): Promise<UserDetailResponse | null>;
  getUserStats(): Promise<UserStats>;

  // User management
  createUser(data: CreateUserRequest): Promise<UserDetailResponse>;
  updateUser(id: string, data: UpdateUserRequest): Promise<UserDetailResponse>;
  deleteUser(id: string): Promise<boolean>;

  // Status management
  activateUser(id: string): Promise<boolean>;
  deactivateUser(id: string): Promise<boolean>;
  suspendUser(id: string): Promise<boolean>;
  verifyUserEmail(id: string): Promise<boolean>;

  // Bulk operations
  bulkAction(action: BulkActionType, userIds: string[]): Promise<BulkActionResult>;

  // Activity tracking
  getUserActivity(userId: string, limit?: number): Promise<UserActivity[]>;
}

/**
 * Extended user repository interface for user management
 */
export interface UserManagementRepository {
  // Enhanced search and filtering
  findWithFilters(filters: UserFilters, pagination: PaginationParams): Promise<{
    users: any[];
    total: number;
  }>;
  searchUsers(query: string, filters?: UserFilters): Promise<any[]>;
  
  // Bulk operations
  bulkUpdateStatus(userIds: string[], status: 'active' | 'inactive' | 'suspended'): Promise<number>;
  bulkDelete(userIds: string[]): Promise<number>;
  bulkVerifyEmail(userIds: string[]): Promise<number>;

  // Statistics
  getDetailedStats(): Promise<UserStats>;
  getRecentRegistrations(days: number): Promise<number>;
}

/**
 * Error types for user management
 */
export class UserManagementError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'UserManagementError';
  }
}

export class UserNotFoundError extends UserManagementError {
  constructor(userId: string) {
    super(`User not found: ${userId}`, 'USER_NOT_FOUND', 404);
    this.name = 'UserNotFoundError';
  }
}

export class DuplicateUserError extends UserManagementError {
  constructor(field: string) {
    super(`User already exists with this ${field}`, 'DUPLICATE_USER', 409);
    this.name = 'DuplicateUserError';
  }
}

export class InvalidUserStatusError extends UserManagementError {
  constructor(status: string) {
    super(`Invalid user status: ${status}`, 'INVALID_STATUS', 400);
    this.name = 'InvalidUserStatusError';
  }
}