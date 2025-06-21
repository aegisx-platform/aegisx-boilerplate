import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { AuthController } from '../controllers/auth-controller';
import { AuthService } from '../services/auth-service';
import { UserRepositoryImpl } from '../repositories/user-repository';
import { RefreshTokenRepositoryImpl } from '../repositories/refresh-token-repository';
import { AuthSchemas } from '../schemas/auth-schemas';
import { CheckTokenSchema } from '../schemas/auth-route-schemas';
import { RBACService } from '../../rbac/services/rbac-service';
import { RoleRepository } from '../../rbac/repositories/role-repository';
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  LogoutRequest
} from '../types/auth-types';

// Route interface definitions
interface RegisterRoute extends RouteGenericInterface {
  Body: RegisterRequest;
}

interface LoginRoute extends RouteGenericInterface {
  Body: LoginRequest;
}

interface RefreshRoute extends RouteGenericInterface {
  Body: RefreshTokenRequest;
}

interface LogoutRoute extends RouteGenericInterface {
  Body: LogoutRequest;
}

interface UpdateProfileRoute extends RouteGenericInterface {
  Body: UpdateProfileRequest;
}

interface ChangePasswordRoute extends RouteGenericInterface {
  Body: ChangePasswordRequest;
}

/**
 * Authentication Routes
 *
 * Handles all authentication-related endpoints with proper:
 * - Input validation using TypeBox schemas
 * - Error handling and logging
 * - Rate limiting for security
 * - JWT authentication for protected routes
 *
 * Routes provided:
 * - POST /register - User registration
 * - POST /login - User authentication
 * - POST /refresh - Token refresh
 * - POST /logout - User logout (protected)
 * - GET /profile - Get user profile (protected)
 * - PUT /profile - Update profile (protected)
 * - PUT /change-password - Change password (protected)
 * - POST /verify-email - Verify email (protected)
 */
export async function authRoutes(fastify: FastifyInstance) {
  // Initialize repositories
  const userRepository = new UserRepositoryImpl(fastify);
  const refreshTokenRepository = new RefreshTokenRepositoryImpl(fastify);
  const roleRepository = new RoleRepository(fastify.knex);

  // Initialize RBAC service
  const rbacService = new RBACService(roleRepository);

  // Initialize service with RBAC dependency
  const authService = new AuthService(fastify, userRepository, refreshTokenRepository, rbacService);

  // Initialize controller
  const authController = new AuthController(fastify, authService);

  // Route handlers
  const register = authController.register.bind(authController);
  const login = authController.login.bind(authController);
  const refresh = authController.refresh.bind(authController);
  const logout = authController.logout.bind(authController);
  const getProfile = authController.getProfile.bind(authController);
  const updateProfile = authController.updateProfile.bind(authController);
  const changePassword = authController.changePassword.bind(authController);
  const verifyEmail = authController.verifyEmail.bind(authController);

  // Routes
  // 1. POST /register - Register new user
  fastify.post<RegisterRoute>('/register', {
    schema: AuthSchemas.register,
    config: {
      rateLimit: {
        max: 5, // 5 registration attempts
        timeWindow: '5 minutes'
      }
    }
  }, register);

  // 2. POST /login - Login user
  fastify.post<LoginRoute>('/login', {
    schema: AuthSchemas.login,
    config: {
      rateLimit: {
        max: 10, // 10 login attempts
        timeWindow: '5 minutes'
      }
    }
  }, login);

  // 3. POST /refresh - Refresh access token
  fastify.post<RefreshRoute>('/refresh', {
    schema: AuthSchemas.refresh,
    config: {
      rateLimit: {
        max: 20, // 20 refresh attempts
        timeWindow: '5 minutes'
      }
    }
  }, refresh);

  // 3.5. GET /check-token - Check if token needs refresh (Protected)
  fastify.get('/check-token', {
    schema: CheckTokenSchema,
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    try {
      const user = (request as any).user;
      
      // Calculate time until expiration
      const expiresIn = user.exp ? user.exp - Math.floor(Date.now() / 1000) : 0;
      
      // Check if roles/permissions changed
      const shouldRefresh = await authService.shouldRefreshToken(
        user.id, 
        user.roles || [], 
        user.permissions || []
      );
      
      let reason = '';
      if (expiresIn < 300) { // Less than 5 minutes
        reason = 'Token expires soon';
      } else if (shouldRefresh) {
        reason = 'Roles or permissions changed';
      }
      
      return {
        should_refresh: expiresIn < 300 || shouldRefresh,
        reason,
        expires_in: Math.max(0, expiresIn),
        roles_changed: shouldRefresh,
        permissions_changed: shouldRefresh
      };
    } catch (error: any) {
      fastify.log.error('Token check failed:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to check token status'
      });
    }
  });

  // 4. POST /logout - Logout user (Protected)
  fastify.post<LogoutRoute>('/logout', {
    schema: AuthSchemas.logout,
    preHandler: [fastify.authenticate]
  }, logout);

  // 5. GET /profile - Get current user profile (Protected)
  fastify.get('/profile', {
    schema: AuthSchemas.getProfile,
    preHandler: [fastify.authenticate]
  }, getProfile);

  // 6. PUT /profile - Update user profile (Protected)
  fastify.put<UpdateProfileRoute>('/profile', {
    schema: AuthSchemas.updateProfile,
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: {
        max: 10, // 10 profile updates
        timeWindow: '1 hour'
      }
    }
  }, updateProfile);

  // 7. PUT /change-password - Change password (Protected)
  fastify.put<ChangePasswordRoute>('/change-password', {
    schema: AuthSchemas.changePassword,
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: {
        max: 3, // 3 password changes
        timeWindow: '1 hour'
      }
    }
  }, changePassword);

  // 8. POST /verify-email - Verify email address (Protected)
  fastify.post('/verify-email', {
    schema: AuthSchemas.verifyEmail,
    preHandler: [fastify.authenticate],
    config: {
      rateLimit: {
        max: 5, // 5 verification attempts
        timeWindow: '1 hour'
      }
    }
  }, verifyEmail);

  fastify.log.info('Auth routes registered with rate limiting and validation');
}

export default authRoutes;
