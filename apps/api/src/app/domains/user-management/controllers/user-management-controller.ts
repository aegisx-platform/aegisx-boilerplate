import { FastifyInstance, FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { UserManagementService } from '../services/user-management-service';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserSearchRequest,
  BulkUserActionRequest,
  UserNotFoundError,
  DuplicateUserError
} from '../types/user-management-types';

// Route interface definitions
interface ListUsersRoute extends RouteGenericInterface {
  Querystring: UserSearchRequest;
}

interface GetUserRoute extends RouteGenericInterface {
  Params: { id: string };
}

interface CreateUserRoute extends RouteGenericInterface {
  Body: CreateUserRequest;
}

interface UpdateUserRoute extends RouteGenericInterface {
  Params: { id: string };
  Body: UpdateUserRequest;
}

interface DeleteUserRoute extends RouteGenericInterface {
  Params: { id: string };
}

interface UserActionRoute extends RouteGenericInterface {
  Params: { id: string };
}

interface BulkActionRoute extends RouteGenericInterface {
  Body: BulkUserActionRequest;
}

/**
 * User Management Controller
 * 
 * Handles all HTTP requests for user management operations.
 * Provides admin-level user management capabilities including:
 * - User listing, searching, and filtering
 * - User CRUD operations
 * - Status management
 * - Bulk operations
 * - User statistics
 */
export class UserManagementController {
  constructor(
    private readonly fastify: FastifyInstance,
    private readonly userManagementService: UserManagementService
  ) {}

  /**
   * List users with pagination and filtering
   * GET /users
   */
  async listUsers(request: FastifyRequest<ListUsersRoute>, reply: FastifyReply) {
    try {
      this.fastify.log.info('Listing users', { 
        query: request.query,
        adminId: (request as any).user?.id 
      });

      const filters = {
        status: request.query.status,
        email_verified: request.query.email_verified,
        search: request.query.q
      };

      const pagination = {
        page: request.query.page || 1,
        limit: request.query.limit || 20,
        sort_by: request.query.sort_by || 'created_at',
        sort_order: request.query.sort_order || 'desc'
      };

      const result = await this.userManagementService.listUsers(filters, pagination);

      this.fastify.log.info('Users listed successfully', {
        total: result.pagination.total,
        page: result.pagination.page,
        adminId: (request as any).user?.id
      });

      return reply.send(result);
    } catch (error) {
      this.fastify.log.error('Failed to list users', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: request.query,
        adminId: (request as any).user?.id
      });
      throw this.fastify.httpErrors.internalServerError('Failed to list users');
    }
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  async getUser(request: FastifyRequest<GetUserRoute>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      this.fastify.log.info('Getting user details', { 
        userId: id,
        adminId: (request as any).user?.id 
      });

      const user = await this.userManagementService.getUserById(id);
      
      if (!user) {
        throw this.fastify.httpErrors.notFound(`User not found: ${id}`);
      }

      return reply.send(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw this.fastify.httpErrors.notFound(error.message);
      }
      
      this.fastify.log.error('Failed to get user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.params.id,
        adminId: (request as any).user?.id
      });
      
      throw this.fastify.httpErrors.internalServerError('Failed to retrieve user');
    }
  }

  /**
   * Create a new user
   * POST /users
   */
  async createUser(request: FastifyRequest<CreateUserRoute>, reply: FastifyReply) {
    try {
      this.fastify.log.info('Creating new user', { 
        email: request.body.email,
        username: request.body.username,
        adminId: (request as any).user?.id 
      });

      const user = await this.userManagementService.createUser(request.body);

      this.fastify.log.info('User created successfully', {
        userId: user.id,
        email: user.email,
        adminId: (request as any).user?.id
      });

      return reply.code(201).send(user);
    } catch (error) {
      if (error instanceof DuplicateUserError) {
        throw this.fastify.httpErrors.conflict(error.message);
      }

      this.fastify.log.error('Failed to create user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userData: { ...request.body, password: '[REDACTED]' },
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to create user');
    }
  }

  /**
   * Update user information
   * PUT /users/:id
   */
  async updateUser(request: FastifyRequest<UpdateUserRoute>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      this.fastify.log.info('Updating user', { 
        userId: id,
        updateFields: Object.keys(request.body),
        adminId: (request as any).user?.id 
      });

      const user = await this.userManagementService.updateUser(id, request.body);

      this.fastify.log.info('User updated successfully', {
        userId: id,
        adminId: (request as any).user?.id
      });

      return reply.send(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw this.fastify.httpErrors.notFound(error.message);
      }
      if (error instanceof DuplicateUserError) {
        throw this.fastify.httpErrors.conflict(error.message);
      }

      this.fastify.log.error('Failed to update user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.params.id,
        updateData: request.body,
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to update user');
    }
  }

  /**
   * Delete a user
   * DELETE /users/:id
   */
  async deleteUser(request: FastifyRequest<DeleteUserRoute>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      this.fastify.log.info('Deleting user', { 
        userId: id,
        adminId: (request as any).user?.id 
      });

      const deleted = await this.userManagementService.deleteUser(id);

      if (!deleted) {
        throw this.fastify.httpErrors.notFound(`User not found: ${id}`);
      }

      this.fastify.log.info('User deleted successfully', {
        userId: id,
        adminId: (request as any).user?.id
      });

      return reply.send({ 
        message: 'User deleted successfully',
        success: true 
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw this.fastify.httpErrors.notFound(error.message);
      }

      this.fastify.log.error('Failed to delete user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.params.id,
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to delete user');
    }
  }

  /**
   * Get user statistics
   * GET /users/stats
   */
  async getUserStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      this.fastify.log.info('Getting user statistics', { 
        adminId: (request as any).user?.id 
      });

      const stats = await this.userManagementService.getUserStats();

      return reply.send(stats);
    } catch (error) {
      this.fastify.log.error('Failed to get user statistics', {
        error: error instanceof Error ? error.message : 'Unknown error',
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to retrieve user statistics');
    }
  }

  /**
   * Activate user
   * POST /users/:id/activate
   */
  async activateUser(request: FastifyRequest<UserActionRoute>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      this.fastify.log.info('Activating user', { 
        userId: id,
        adminId: (request as any).user?.id 
      });

      const success = await this.userManagementService.activateUser(id);

      if (!success) {
        throw this.fastify.httpErrors.notFound(`User not found: ${id}`);
      }

      return reply.send({ 
        message: 'User activated successfully',
        success: true 
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw this.fastify.httpErrors.notFound(error.message);
      }

      this.fastify.log.error('Failed to activate user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.params.id,
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to activate user');
    }
  }

  /**
   * Deactivate user
   * POST /users/:id/deactivate
   */
  async deactivateUser(request: FastifyRequest<UserActionRoute>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      this.fastify.log.info('Deactivating user', { 
        userId: id,
        adminId: (request as any).user?.id 
      });

      const success = await this.userManagementService.deactivateUser(id);

      if (!success) {
        throw this.fastify.httpErrors.notFound(`User not found: ${id}`);
      }

      return reply.send({ 
        message: 'User deactivated successfully',
        success: true 
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw this.fastify.httpErrors.notFound(error.message);
      }

      this.fastify.log.error('Failed to deactivate user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.params.id,
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to deactivate user');
    }
  }

  /**
   * Suspend user
   * POST /users/:id/suspend
   */
  async suspendUser(request: FastifyRequest<UserActionRoute>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      this.fastify.log.info('Suspending user', { 
        userId: id,
        adminId: (request as any).user?.id 
      });

      const success = await this.userManagementService.suspendUser(id);

      if (!success) {
        throw this.fastify.httpErrors.notFound(`User not found: ${id}`);
      }

      return reply.send({ 
        message: 'User suspended successfully',
        success: true 
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw this.fastify.httpErrors.notFound(error.message);
      }

      this.fastify.log.error('Failed to suspend user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.params.id,
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to suspend user');
    }
  }

  /**
   * Verify user email
   * POST /users/:id/verify-email
   */
  async verifyUserEmail(request: FastifyRequest<UserActionRoute>, reply: FastifyReply) {
    try {
      const { id } = request.params;

      this.fastify.log.info('Verifying user email', { 
        userId: id,
        adminId: (request as any).user?.id 
      });

      const success = await this.userManagementService.verifyUserEmail(id);

      if (!success) {
        throw this.fastify.httpErrors.notFound(`User not found: ${id}`);
      }

      return reply.send({ 
        message: 'User email verified successfully',
        success: true 
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw this.fastify.httpErrors.notFound(error.message);
      }

      this.fastify.log.error('Failed to verify user email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.params.id,
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to verify user email');
    }
  }

  /**
   * Perform bulk actions on users
   * POST /users/bulk-action
   */
  async bulkAction(request: FastifyRequest<BulkActionRoute>, reply: FastifyReply) {
    try {
      const { action, user_ids } = request.body;

      this.fastify.log.info('Performing bulk action', { 
        action,
        userCount: user_ids.length,
        adminId: (request as any).user?.id 
      });

      const result = await this.userManagementService.bulkAction(action, user_ids);

      this.fastify.log.info('Bulk action completed', {
        action,
        processed: result.processed,
        failed: result.failed,
        adminId: (request as any).user?.id
      });

      return reply.send(result);
    } catch (error) {
      this.fastify.log.error('Failed to perform bulk action', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: request.body.action,
        userCount: request.body.user_ids.length,
        adminId: (request as any).user?.id
      });

      throw this.fastify.httpErrors.internalServerError('Failed to perform bulk action');
    }
  }
}