import { FastifyInstance, RouteGenericInterface } from 'fastify';
import { AuthController } from '../controllers/auth-controller';
import { AuthSchemas } from '../schemas/auth-schemas';
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
 * Handles all authentication-related endpoints
 */
export async function authRoutes(fastify: FastifyInstance) {
  // Initialize auth controller
  const authController = new AuthController(fastify);

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
  // 1. POST /auth/register - Register new user
  fastify.post<RegisterRoute>('/register', {
    schema: AuthSchemas.register
  }, register);

  // 2. POST /auth/login - Login user
  fastify.post<LoginRoute>('/login', {
    schema: AuthSchemas.login
  }, login);

  // 3. POST /auth/refresh - Refresh access token
  fastify.post<RefreshRoute>('/refresh', {
    schema: AuthSchemas.refresh
  }, refresh);

  // 4. POST /auth/logout - Logout user (Protected)
  fastify.post<LogoutRoute>('/logout', {
    schema: AuthSchemas.logout,
    preHandler: [fastify.authenticate]
  }, logout);

  // 5. GET /auth/profile - Get current user profile (Protected)
  fastify.get('/profile', {
    schema: AuthSchemas.getProfile,
    preHandler: [fastify.authenticate]
  }, getProfile);

  // 6. PUT /auth/profile - Update user profile (Protected)
  fastify.put<UpdateProfileRoute>('/profile', {
    schema: AuthSchemas.updateProfile,
    preHandler: [fastify.authenticate]
  }, updateProfile);

  // 7. PUT /auth/change-password - Change password (Protected)
  fastify.put<ChangePasswordRoute>('/change-password', {
    schema: AuthSchemas.changePassword,
    preHandler: [fastify.authenticate]
  }, changePassword);

  // 8. POST /auth/verify-email - Verify email address (Protected)
  fastify.post('/verify-email', {
    schema: AuthSchemas.verifyEmail,
    preHandler: [fastify.authenticate]
  }, verifyEmail);
}

export default authRoutes;
