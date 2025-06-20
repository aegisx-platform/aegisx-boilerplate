import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { UserManagementController } from '../controllers/user-management-controller';
import { UserManagementService } from '../services/user-management-service';
import { UserRepositoryImpl } from '../../auth/repositories/user-repository';
import { UserManagementSchemas } from '../schemas/user-management-schemas';
import {
  CreateUserRequest,
  UpdateUserRequest,
  UserSearchRequest,
  BulkUserActionRequest
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
 * User Management Routes
 * 
 * Provides comprehensive user management API endpoints for administrators:
 * - User CRUD operations
 * - User listing with pagination and filtering
 * - User status management
 * - Bulk operations
 * - User statistics
 * 
 * All routes require authentication and appropriate permissions.
 */
export async function userManagementRoutes(fastify: FastifyInstance) {
  // Initialize repository
  const userRepository = new UserRepositoryImpl(fastify);
  
  // Initialize service
  const userManagementService = new UserManagementService(fastify, userRepository);
  
  // Initialize controller
  const userManagementController = new UserManagementController(fastify, userManagementService);

  // Bind controller methods
  const listUsers = userManagementController.listUsers.bind(userManagementController);
  const getUser = userManagementController.getUser.bind(userManagementController);
  const createUser = userManagementController.createUser.bind(userManagementController);
  const updateUser = userManagementController.updateUser.bind(userManagementController);
  const deleteUser = userManagementController.deleteUser.bind(userManagementController);
  const getUserStats = userManagementController.getUserStats.bind(userManagementController);
  const activateUser = userManagementController.activateUser.bind(userManagementController);
  const deactivateUser = userManagementController.deactivateUser.bind(userManagementController);
  const suspendUser = userManagementController.suspendUser.bind(userManagementController);
  const verifyUserEmail = userManagementController.verifyUserEmail.bind(userManagementController);
  const bulkAction = userManagementController.bulkAction.bind(userManagementController);

  // User statistics endpoint (placed first to avoid conflict with :id routes)  
  fastify.get('/stats', {
    schema: UserManagementSchemas.getUserStats
  }, getUserStats);

  // Bulk actions endpoint
  fastify.post<BulkActionRoute>('/bulk-action', {
    schema: UserManagementSchemas.bulkAction,
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute'
      }
    }
  }, bulkAction);

  // User CRUD operations
  // 1. GET /users - List users with pagination and filtering
  fastify.get<ListUsersRoute>('/', {
    schema: UserManagementSchemas.listUsers,
  }, listUsers);

  // 2. POST /users - Create new user
  fastify.post<CreateUserRoute>('/', {
    schema: UserManagementSchemas.createUser,
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '10 minutes'
      }
    }
  }, createUser);

  // 3. GET /users/:id - Get user by ID
  fastify.get<GetUserRoute>('/:id', {
    schema: UserManagementSchemas.getUser,
  }, getUser);

  // 4. PUT /users/:id - Update user
  fastify.put<UpdateUserRoute>('/:id', {
    schema: UserManagementSchemas.updateUser,
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, updateUser);

  // 5. DELETE /users/:id - Delete user
  fastify.delete<DeleteUserRoute>('/:id', {
    schema: UserManagementSchemas.deleteUser,
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '10 minutes'
      }
    }
  }, deleteUser);

  // User status management endpoints
  // 6. POST /users/:id/activate - Activate user
  fastify.post<UserActionRoute>('/:id/activate', {
    schema: {
      summary: 'Activate user account',
      description: 'Change user status to active',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' }
          }
        }
      },
      tags: ['User Management']
    },
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, activateUser);

  // 7. POST /users/:id/deactivate - Deactivate user
  fastify.post<UserActionRoute>('/:id/deactivate', {
    schema: {
      summary: 'Deactivate user account',
      description: 'Change user status to inactive',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' }
          }
        }
      },
      tags: ['User Management']
    },
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, deactivateUser);

  // 8. POST /users/:id/suspend - Suspend user
  fastify.post<UserActionRoute>('/:id/suspend', {
    schema: {
      summary: 'Suspend user account',
      description: 'Change user status to suspended',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' }
          }
        }
      },
      tags: ['User Management']
    },
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, suspendUser);

  // 9. POST /users/:id/verify-email - Verify user email
  fastify.post<UserActionRoute>('/:id/verify-email', {
    schema: {
      summary: 'Verify user email address',
      description: 'Mark user email as verified',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            success: { type: 'boolean' }
          }
        }
      },
      tags: ['User Management']
    },
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '10 minutes'
      }
    }
  }, verifyUserEmail);

  fastify.log.info('User management routes registered with authentication and rate limiting');
}

export default userManagementRoutes;