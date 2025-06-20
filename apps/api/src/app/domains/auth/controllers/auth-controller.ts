import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth-service';
import {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  LogoutRequest,
  JWTPayload
} from '../types/auth-types';

/**
 * Authentication Controller
 * 
 * Handles HTTP requests for authentication operations including:
 * - User registration and login
 * - Token management (refresh, logout)
 * - Profile management
 * - Password operations
 * 
 * All methods include proper error handling and validation
 */
export class AuthController {
  constructor(
    private readonly fastify: FastifyInstance,
    private readonly authService: AuthService
  ) {}

  /**
   * Register a new user account
   */
  async register(request: FastifyRequest<{ Body: RegisterRequest }>, reply: FastifyReply) {
    try {
      this.fastify.log.info('User registration attempt', { email: request.body.email });
      
      const user = await this.authService.register(request.body);
      
      this.fastify.log.info('User registered successfully', { userId: user.id, email: user.email });
      
      return reply.code(201).send({
        message: 'User registered successfully',
        user
      });
    } catch (error) {
      this.fastify.log.error('Registration failed', { 
        email: request.body.email, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Authenticate user login
   */
  async login(request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) {
    try {
      this.fastify.log.info('Login attempt', { identifier: request.body.identifier });
      
      const loginResponse = await this.authService.login(request.body);
      
      this.fastify.log.info('Login successful', { 
        userId: loginResponse.user.id, 
        email: loginResponse.user.email 
      });
      
      return reply.send(loginResponse);
    } catch (error) {
      this.fastify.log.warn('Login failed', { 
        identifier: request.body.identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(request: FastifyRequest<{ Body: RefreshTokenRequest }>, reply: FastifyReply) {
    try {
      const tokens = await this.authService.refreshToken(request.body.refresh_token);
      
      this.fastify.log.info('Token refreshed successfully');
      
      return reply.send(tokens);
    } catch (error) {
      this.fastify.log.warn('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Logout user and revoke tokens
   */
  async logout(request: FastifyRequest<{ Body: LogoutRequest }>, reply: FastifyReply) {
    try {
      const user = this.extractUserFromRequest(request);
      
      await this.authService.logout(user.id, request.body.refresh_token);
      
      this.fastify.log.info('User logged out', { userId: user.id });
      
      return reply.send({ message: 'Logged out successfully' });
    } catch (error) {
      this.fastify.log.error('Logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = this.extractUserFromRequest(request);
      
      const profile = await this.authService.getProfile(user.id);
      
      return reply.send({ user: profile });
    } catch (error) {
      this.fastify.log.error('Get profile failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Update current user profile
   */
  async updateProfile(request: FastifyRequest<{ Body: UpdateProfileRequest }>, reply: FastifyReply) {
    try {
      const user = this.extractUserFromRequest(request);
      
      this.fastify.log.info('Profile update attempt', { userId: user.id });
      
      const updatedUser = await this.authService.updateProfile(user.id, request.body);
      
      this.fastify.log.info('Profile updated successfully', { userId: user.id });
      
      return reply.send({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      this.fastify.log.error('Profile update failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(request: FastifyRequest<{ Body: ChangePasswordRequest }>, reply: FastifyReply) {
    try {
      const user = this.extractUserFromRequest(request);
      
      this.fastify.log.info('Password change attempt', { userId: user.id });
      
      await this.authService.changePassword(user.id, request.body);
      
      this.fastify.log.info('Password changed successfully', { userId: user.id });
      
      return reply.send({ message: 'Password changed successfully' });
    } catch (error) {
      this.fastify.log.error('Password change failed', {
        userId: this.extractUserFromRequest(request)?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Verify user email address
   */
  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = this.extractUserFromRequest(request);
      
      this.fastify.log.info('Email verification attempt', { userId: user.id });
      
      await this.authService.verifyEmail(user.id);
      
      this.fastify.log.info('Email verified successfully', { userId: user.id });
      
      return reply.send({ message: 'Email verified successfully' });
    } catch (error) {
      this.fastify.log.error('Email verification failed', {
        userId: this.extractUserFromRequest(request)?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Extract authenticated user from request
   * Provides type safety and centralized user extraction
   */
  private extractUserFromRequest(request: FastifyRequest): JWTPayload {
    const user = (request as FastifyRequest & { user: JWTPayload }).user;
    
    if (!user?.id) {
      throw this.fastify.httpErrors.unauthorized('User not authenticated');
    }
    
    return user;
  }
}
