import { FastifyInstance } from 'fastify';
import { UserRepository } from '../../auth/types/auth-types';
import {
  UserFilters,
  PaginationParams,
  PaginatedUsers,
  UserStats,
  CreateUserRequest,
  UpdateUserRequest,
  UserDetailResponse,
  BulkActionType,
  BulkActionResult,
  UserManagementService as IUserManagementService,
  UserNotFoundError,
  DuplicateUserError
} from '../types/user-management-types';
import * as bcrypt from 'bcrypt';

/**
 * User Management Service Implementation
 * 
 * Provides comprehensive user management capabilities for administrators:
 * - User listing, searching, and filtering
 * - User creation, updating, and deletion
 * - Status management (activate, deactivate, suspend)
 * - Bulk operations
 * - User statistics and reporting
 */
export class UserManagementService implements IUserManagementService {
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    private readonly fastify: FastifyInstance,
    private readonly userRepo: UserRepository
  ) {}

  /**
   * List users with pagination and filtering
   */
  async listUsers(filters?: UserFilters, pagination?: PaginationParams): Promise<PaginatedUsers> {
    try {
      const page = pagination?.page || 1;
      const limit = Math.min(pagination?.limit || 20, 100);
      const offset = (page - 1) * limit;
      const sortBy = pagination?.sort_by || 'created_at';
      const sortOrder = pagination?.sort_order || 'desc';

      let query = this.fastify.knex('users').select('*');

      // Apply filters
      if (filters?.status) {
        query = query.where('status', filters.status);
      }

      if (filters?.email_verified !== undefined) {
        if (filters.email_verified) {
          query = query.whereNotNull('email_verified_at');
        } else {
          query = query.whereNull('email_verified_at');
        }
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.where(function() {
          this.whereILike('name', searchTerm)
            .orWhereILike('email', searchTerm)
            .orWhereILike('username', searchTerm);
        });
      }

      if (filters?.created_after) {
        query = query.where('created_at', '>=', filters.created_after);
      }

      if (filters?.created_before) {
        query = query.where('created_at', '<=', filters.created_before);
      }

      // Get total count for pagination
      const totalQuery = query.clone();
      const [{ count: total }] = await totalQuery.count('* as count');
      const totalUsers = parseInt(total as string, 10);

      // Apply pagination and sorting
      const users = await query
        .orderBy(sortBy, sortOrder)
        .limit(limit)
        .offset(offset);

      const pages = Math.ceil(totalUsers / limit);

      return {
        users: users.map(this.transformUserForResponse),
        pagination: {
          page,
          limit,
          total: totalUsers,
          pages,
          has_next: page < pages,
          has_prev: page > 1
        }
      };
    } catch (error) {
      this.fastify.log.error('Failed to list users', { error, filters, pagination });
      throw new Error('Failed to retrieve user list');
    }
  }

  /**
   * Search users by query string
   */
  async searchUsers(query: string, filters?: UserFilters): Promise<UserDetailResponse[]> {
    try {
      const searchTerm = `%${query}%`;
      let dbQuery = this.fastify.knex('users')
        .select('*')
        .where(function() {
          this.whereILike('name', searchTerm)
            .orWhereILike('email', searchTerm)
            .orWhereILike('username', searchTerm);
        });

      // Apply additional filters
      if (filters?.status) {
        dbQuery = dbQuery.where('status', filters.status);
      }

      if (filters?.email_verified !== undefined) {
        if (filters.email_verified) {
          dbQuery = dbQuery.whereNotNull('email_verified_at');
        } else {
          dbQuery = dbQuery.whereNull('email_verified_at');
        }
      }

      const users = await dbQuery.limit(50).orderBy('name');
      return users.map(this.transformUserForResponse);
    } catch (error) {
      this.fastify.log.error('Failed to search users', { error, query, filters });
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserDetailResponse | null> {
    try {
      const user = await this.userRepo.findById(id);
      if (!user) {
        return null;
      }
      return this.transformUserForResponse(user);
    } catch (error) {
      this.fastify.log.error('Failed to get user by ID', { error, userId: id });
      throw new Error('Failed to retrieve user');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<UserStats> {
    try {
      const stats = await this.fastify.knex('users')
        .select(
          this.fastify.knex.raw('COUNT(*) as total_users'),
          this.fastify.knex.raw('COUNT(CASE WHEN status = \'active\' THEN 1 END) as active_users'),
          this.fastify.knex.raw('COUNT(CASE WHEN status = \'inactive\' THEN 1 END) as inactive_users'),
          this.fastify.knex.raw('COUNT(CASE WHEN status = \'suspended\' THEN 1 END) as suspended_users'),
          this.fastify.knex.raw('COUNT(CASE WHEN email_verified_at IS NOT NULL THEN 1 END) as verified_users'),
          this.fastify.knex.raw('COUNT(CASE WHEN email_verified_at IS NULL THEN 1 END) as unverified_users')
        )
        .first();

      // Get recent registrations (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [{ count: recentRegistrations }] = await this.fastify.knex('users')
        .where('created_at', '>=', thirtyDaysAgo)
        .count('* as count');

      return {
        total_users: parseInt(stats.total_users, 10),
        active_users: parseInt(stats.active_users, 10),
        inactive_users: parseInt(stats.inactive_users, 10),
        suspended_users: parseInt(stats.suspended_users, 10),
        verified_users: parseInt(stats.verified_users, 10),
        unverified_users: parseInt(stats.unverified_users, 10),
        recent_registrations: parseInt(recentRegistrations as string, 10)
      };
    } catch (error) {
      this.fastify.log.error('Failed to get user statistics', { error });
      throw new Error('Failed to retrieve user statistics');
    }
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<UserDetailResponse> {
    try {
      // Check for existing email
      const existingEmail = await this.userRepo.findByEmail(data.email);
      if (existingEmail) {
        throw new DuplicateUserError('email');
      }

      // Check for existing username if provided
      if (data.username) {
        const existingUsername = await this.userRepo.findByUsername(data.username);
        if (existingUsername) {
          throw new DuplicateUserError('username');
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, this.BCRYPT_ROUNDS);

      // Create user data
      const userData = {
        name: data.name,
        username: data.username || undefined,
        email: data.email.toLowerCase(),
        password: data.password,
        password_hash: passwordHash,
        status: data.status || 'active',
        email_verified_at: data.email_verified ? new Date() : null
      };

      const user = await this.userRepo.create(userData);
      
      this.fastify.log.info('User created by admin', { 
        userId: user.id, 
        email: user.email,
        username: user.username 
      });

      return this.transformUserForResponse(user);
    } catch (error) {
      if (error instanceof DuplicateUserError) {
        throw error;
      }
      this.fastify.log.error('Failed to create user', { error, userData: data });
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user information
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<UserDetailResponse> {
    try {
      // Check if user exists
      const existingUser = await this.userRepo.findById(id);
      if (!existingUser) {
        throw new UserNotFoundError(id);
      }

      // Check for duplicate email if email is being updated
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await this.userRepo.findByEmail(data.email);
        if (emailExists) {
          throw new DuplicateUserError('email');
        }
      }

      // Check for duplicate username if username is being updated
      if (data.username && data.username !== existingUser.username) {
        const usernameExists = await this.userRepo.findByUsername(data.username);
        if (usernameExists) {
          throw new DuplicateUserError('username');
        }
      }

      // Prepare update data
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.username !== undefined) updateData.username = data.username;
      if (data.email) updateData.email = data.email.toLowerCase();
      if (data.status) updateData.status = data.status;

      const updatedUser = await this.userRepo.update(id, updateData);
      if (!updatedUser) {
        throw new UserNotFoundError(id);
      }

      this.fastify.log.info('User updated by admin', { 
        userId: id, 
        updatedFields: Object.keys(updateData) 
      });

      return this.transformUserForResponse(updatedUser);
    } catch (error) {
      if (error instanceof UserNotFoundError || error instanceof DuplicateUserError) {
        throw error;
      }
      this.fastify.log.error('Failed to update user', { error, userId: id, updateData: data });
      throw new Error('Failed to update user');
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      const user = await this.userRepo.findById(id);
      if (!user) {
        throw new UserNotFoundError(id);
      }

      const deleted = await this.userRepo.delete(id);
      
      if (deleted) {
        this.fastify.log.info('User deleted by admin', { 
          userId: id, 
          email: user.email 
        });
      }

      return deleted;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.fastify.log.error('Failed to delete user', { error, userId: id });
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Activate user
   */
  async activateUser(id: string): Promise<boolean> {
    return this.updateUserStatus(id, 'active');
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: string): Promise<boolean> {
    return this.updateUserStatus(id, 'inactive');
  }

  /**
   * Suspend user
   */
  async suspendUser(id: string): Promise<boolean> {
    return this.updateUserStatus(id, 'suspended');
  }

  /**
   * Verify user email
   */
  async verifyUserEmail(id: string): Promise<boolean> {
    try {
      const success = await this.userRepo.verifyEmail(id);
      
      if (success) {
        this.fastify.log.info('User email verified by admin', { userId: id });
      }

      return success;
    } catch (error) {
      this.fastify.log.error('Failed to verify user email', { error, userId: id });
      throw new Error('Failed to verify user email');
    }
  }

  /**
   * Perform bulk actions on users
   */
  async bulkAction(action: BulkActionType, userIds: string[]): Promise<BulkActionResult> {
    const result: BulkActionResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    };

    for (const userId of userIds) {
      try {
        let success = false;

        switch (action) {
          case 'activate':
            success = await this.activateUser(userId);
            break;
          case 'deactivate':
            success = await this.deactivateUser(userId);
            break;
          case 'suspend':
            success = await this.suspendUser(userId);
            break;
          case 'verify_email':
            success = await this.verifyUserEmail(userId);
            break;
          case 'delete':
            success = await this.deleteUser(userId);
            break;
          default:
            throw new Error(`Unknown action: ${action}`);
        }

        if (success) {
          result.processed++;
        } else {
          result.failed++;
          result.errors.push(`Failed to ${action} user ${userId}`);
        }
      } catch (error) {
        result.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`User ${userId}: ${errorMessage}`);
      }
    }

    result.success = result.failed === 0;

    this.fastify.log.info('Bulk action completed', {
      action,
      processed: result.processed,
      failed: result.failed,
      userIds: userIds.length
    });

    return result;
  }

  /**
   * Get user activity (placeholder for future implementation)
   */
  async getUserActivity(userId: string, limit: number = 50): Promise<any[]> {
    // This would integrate with an activity logging system
    // For now, return empty array
    return [];
  }

  /**
   * Update user status
   */
  private async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<boolean> {
    try {
      const user = await this.userRepo.findById(id);
      if (!user) {
        throw new UserNotFoundError(id);
      }

      const updatedUser = await this.userRepo.update(id, { status });
      const success = !!updatedUser;

      if (success) {
        this.fastify.log.info('User status updated by admin', { 
          userId: id, 
          oldStatus: user.status, 
          newStatus: status 
        });
      }

      return success;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw error;
      }
      this.fastify.log.error('Failed to update user status', { error, userId: id, status });
      throw new Error(`Failed to ${status} user`);
    }
  }

  /**
   * Transform user object for API response (remove sensitive fields)
   */
  private transformUserForResponse(user: any): UserDetailResponse {
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      status: user.status,
      email_verified_at: user.email_verified_at,
      created_at: user.created_at,
      updated_at: user.updated_at,
      last_login_at: user.last_login_at || null
    };
  }
}