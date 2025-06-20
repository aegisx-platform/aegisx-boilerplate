import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import {
  User,
  InternalUser,
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  UserRepository,
  RefreshTokenRepository,
  RefreshTokenPayload,
  JWTPayload
} from '../types/auth-types';

/**
 * Authentication Service
 * 
 * Handles all authentication business logic including:
 * - User registration and validation
 * - Authentication and authorization
 * - Token management (JWT + Refresh tokens)
 * - Password security operations
 * - Profile management
 * 
 * This service is responsible for enforcing business rules and security policies.
 */
export class AuthService {
  // Security constants
  private readonly BCRYPT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRY = '1h';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  // TODO: Implement rate limiting with MAX_LOGIN_ATTEMPTS = 5
  
  constructor(
    private readonly fastify: FastifyInstance,
    private readonly userRepo: UserRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository
  ) {}

  /**
   * Register a new user with comprehensive validation
   */
  async register(data: RegisterRequest): Promise<User> {
    // Validate input data
    this.validateRegistrationData(data);
    
    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(data.email.toLowerCase());
    if (existingUser) {
      throw this.fastify.httpErrors.conflict('An account with this email already exists');
    }

    try {
      // Hash password with secure rounds
      const password_hash = await this.hashPassword(data.password);

      // Create user with normalized data
      const user: InternalUser = await this.userRepo.create({
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: data.password, // This will be ignored by repo
        password_hash,
        status: 'active'
      });

      this.fastify.log.info('User created successfully', { userId: user.id, email: user.email });

      return this.sanitizeUser(user);
    } catch (error) {
      this.fastify.log.error('Failed to create user', { email: data.email, error });
      
      // Handle repository-specific errors
      if (error instanceof Error) {
        if (error.message === 'DUPLICATE_EMAIL') {
          throw this.fastify.httpErrors.conflict('An account with this email already exists');
        }
        if (error.message === 'MISSING_REQUIRED_FIELD') {
          throw this.fastify.httpErrors.badRequest('Missing required user information');
        }
      }
      
      throw this.fastify.httpErrors.internalServerError('Failed to create user account');
    }
  }

  /**
   * Authenticate user login with security measures
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Normalize email for lookup
    const email = credentials.email.toLowerCase();
    
    // Find user by email
    const user: InternalUser | null = await this.userRepo.findByEmail(email);
    if (!user) {
      // Use generic error message to prevent email enumeration
      throw this.fastify.httpErrors.unauthorized('Invalid email or password');
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw this.fastify.httpErrors.forbidden('Account is not active');
    }

    try {
      // Verify password
      const isPasswordValid = await this.verifyPassword(credentials.password, user.password_hash);
      if (!isPasswordValid) {
        this.fastify.log.warn('Invalid password attempt', { userId: user.id, email });
        throw this.fastify.httpErrors.unauthorized('Invalid email or password');
      }

      // Generate tokens
      const tokenPayload: JWTPayload = {
        id: user.id,
        email: user.email,
        name: user.name
      };
      
      const access_token = this.generateAccessToken(tokenPayload);
      const refresh_token = await this.generateRefreshToken(user.id);

      this.fastify.log.info('Successful login', { userId: user.id, email });

      return {
        access_token,
        refresh_token,
        user: this.sanitizeUser(user),
        expires_in: 3600 // 1 hour in seconds
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid email or password')) {
        throw error;
      }
      this.fastify.log.error('Login process failed', { email, error });
      throw this.fastify.httpErrors.internalServerError('Login failed');
    }
  }

  /**
   * Refresh access token with comprehensive validation
   */
  async refreshToken(refresh_token: string): Promise<{ access_token: string; refresh_token: string }> {
    if (!refresh_token?.trim()) {
      throw this.fastify.httpErrors.badRequest('Refresh token is required');
    }

    try {
      // Verify refresh token JWT signature
      const payload = this.fastify.jwt.verify(refresh_token) as RefreshTokenPayload;

      // Check if refresh token exists in database
      const tokenHash = this.hashToken(refresh_token);
      const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash);

      if (!storedToken) {
        throw this.fastify.httpErrors.unauthorized('Invalid refresh token');
      }

      if (storedToken.revoked_at) {
        this.fastify.log.warn('Attempted use of revoked refresh token', { userId: payload.id });
        throw this.fastify.httpErrors.unauthorized('Refresh token has been revoked');
      }

      // Check expiration
      if (new Date() > storedToken.expires_at) {
        await this.refreshTokenRepo.revokeByTokenHash(tokenHash);
        throw this.fastify.httpErrors.unauthorized('Refresh token has expired');
      }

      // Verify user still exists and is active
      const user = await this.userRepo.findById(payload.id);
      if (!user || user.status !== 'active') {
        await this.refreshTokenRepo.revokeByTokenHash(tokenHash);
        throw this.fastify.httpErrors.unauthorized('User account is not valid');
      }

      // Generate new tokens
      const tokenPayload: JWTPayload = {
        id: user.id,
        email: user.email,
        name: user.name
      };
      
      const access_token = this.generateAccessToken(tokenPayload);
      const new_refresh_token = await this.generateRefreshToken(user.id);

      // Revoke old refresh token
      await this.refreshTokenRepo.revokeByTokenHash(tokenHash);

      this.fastify.log.info('Token refreshed successfully', { userId: user.id });

      return {
        access_token,
        refresh_token: new_refresh_token
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('jwt')) {
        throw this.fastify.httpErrors.unauthorized('Invalid refresh token format');
      }
      throw error;
    }
  }

  /**
   * Logout user and revoke tokens
   */
  async logout(user_id: string, refresh_token?: string): Promise<void> {
    if (!user_id) {
      throw this.fastify.httpErrors.badRequest('User ID is required');
    }

    try {
      if (refresh_token?.trim()) {
        // Revoke specific refresh token
        const tokenHash = this.hashToken(refresh_token);
        await this.refreshTokenRepo.revokeByTokenHash(tokenHash);
        this.fastify.log.info('Specific refresh token revoked', { userId: user_id });
      } else {
        // Revoke all refresh tokens for user (logout from all devices)
        await this.refreshTokenRepo.revokeByUserId(user_id);
        this.fastify.log.info('All refresh tokens revoked for user', { userId: user_id });
      }
    } catch (error) {
      this.fastify.log.error('Failed to revoke tokens during logout', { userId: user_id, error });
      throw this.fastify.httpErrors.internalServerError('Failed to logout user');
    }
  }

  /**
   * Change user password with security validation
   */
  async changePassword(user_id: string, data: ChangePasswordRequest): Promise<void> {
    // Validate inputs
    if (!user_id || !data.current_password || !data.new_password) {
      throw this.fastify.httpErrors.badRequest('All password fields are required');
    }

    if (data.current_password === data.new_password) {
      throw this.fastify.httpErrors.badRequest('New password must be different from current password');
    }

    // Get user
    const user: InternalUser | null = await this.userRepo.findById(user_id);
    if (!user) {
      throw this.fastify.httpErrors.notFound('User not found');
    }

    try {
      // Verify current password
      const isCurrentPasswordValid = await this.verifyPassword(data.current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        this.fastify.log.warn('Invalid current password during password change', { userId: user_id });
        throw this.fastify.httpErrors.badRequest('Current password is incorrect');
      }

      // Hash new password
      const new_password_hash = await this.hashPassword(data.new_password);

      // Update password
      await this.userRepo.update(user_id, {
        password_hash: new_password_hash
      } as Partial<InternalUser>);

      // Revoke all refresh tokens to force re-login on all devices
      await this.refreshTokenRepo.revokeByUserId(user_id);

      this.fastify.log.info('Password changed successfully', { userId: user_id });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Current password is incorrect')) {
        throw error;
      }
      this.fastify.log.error('Failed to change password', { userId: user_id, error });
      throw this.fastify.httpErrors.internalServerError('Failed to change password');
    }
  }

  /**
   * Get user profile information
   */
  async getProfile(user_id: string): Promise<User> {
    if (!user_id) {
      throw this.fastify.httpErrors.badRequest('User ID is required');
    }

    const user: InternalUser | null = await this.userRepo.findById(user_id);
    if (!user) {
      throw this.fastify.httpErrors.notFound('User profile not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Update user profile information
   */
  async updateProfile(user_id: string, data: Partial<User>): Promise<User> {
    if (!user_id) {
      throw this.fastify.httpErrors.badRequest('User ID is required');
    }

    // Validate update data
    this.validateProfileUpdateData(data);

    try {
      const updatedUser: InternalUser | null = await this.userRepo.update(user_id, data);
      if (!updatedUser) {
        throw this.fastify.httpErrors.notFound('User not found');
      }

      this.fastify.log.info('Profile updated', { userId: user_id, fields: Object.keys(data) });
      
      return this.sanitizeUser(updatedUser);
    } catch (error) {
      this.fastify.log.error('Failed to update profile', { userId: user_id, error });
      throw this.fastify.httpErrors.internalServerError('Failed to update profile');
    }
  }

  /**
   * Verify user email address
   */
  async verifyEmail(user_id: string): Promise<void> {
    if (!user_id) {
      throw this.fastify.httpErrors.badRequest('User ID is required');
    }

    try {
      const success = await this.userRepo.verifyEmail(user_id);
      if (!success) {
        throw this.fastify.httpErrors.notFound('User not found');
      }

      this.fastify.log.info('Email verified successfully', { userId: user_id });
    } catch (error) {
      this.fastify.log.error('Failed to verify email', { userId: user_id, error });
      if (error instanceof Error && error.message.includes('User not found')) {
        throw error;
      }
      throw this.fastify.httpErrors.internalServerError('Failed to verify email');
    }
  }

  // === Private Helper Methods ===

  /**
   * Generate secure access token
   */
  private generateAccessToken(payload: JWTPayload): string {
    // Use type assertion to bypass Fastify JWT type constraints
    return this.fastify.jwt.sign(payload as any, { expiresIn: this.ACCESS_TOKEN_EXPIRY });
  }

  /**
   * Generate secure refresh token
   */
  private async generateRefreshToken(user_id: string): Promise<string> {
    const token_id = crypto.randomUUID();

    // Create refresh token payload and sign
    const refreshPayload = {
      id: user_id,
      token_id: token_id,
      type: 'refresh'
    };
    
    const refresh_token = this.fastify.jwt.sign(refreshPayload as any, { expiresIn: this.REFRESH_TOKEN_EXPIRY });

    // Hash and store refresh token
    const tokenHash = this.hashToken(refresh_token);
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenRepo.create(user_id, tokenHash, expires_at);

    return refresh_token;
  }

  /**
   * Hash password securely
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Remove sensitive data from user object
   */
  private sanitizeUser(user: InternalUser): User {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: RegisterRequest): void {
    if (!data.email?.trim()) {
      throw this.fastify.httpErrors.badRequest('Email is required');
    }
    
    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      throw this.fastify.httpErrors.badRequest('Invalid email format');
    }
    
    if (!data.name?.trim()) {
      throw this.fastify.httpErrors.badRequest('Name is required');
    }
    
    if (data.name.trim().length < 2) {
      throw this.fastify.httpErrors.badRequest('Name must be at least 2 characters');
    }
    
    if (!data.password?.trim()) {
      throw this.fastify.httpErrors.badRequest('Password is required');
    }
    
    // Password strength validation
    this.validatePasswordStrength(data.password);
  }
  
  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw this.fastify.httpErrors.badRequest('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      throw this.fastify.httpErrors.badRequest('Password must contain at least one lowercase letter');
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      throw this.fastify.httpErrors.badRequest('Password must contain at least one uppercase letter');
    }
    
    if (!/(?=.*\d)/.test(password)) {
      throw this.fastify.httpErrors.badRequest('Password must contain at least one number');
    }
  }

  /**
   * Validate profile update data
   */
  private validateProfileUpdateData(data: Partial<User>): void {
    if (data.email && !data.email.trim()) {
      throw this.fastify.httpErrors.badRequest('Email cannot be empty');
    }
    if (data.name && !data.name.trim()) {
      throw this.fastify.httpErrors.badRequest('Name cannot be empty');
    }
    
    // Prevent updating sensitive fields
    const restrictedFields = ['id', 'created_at', 'updated_at'];
    for (const field of restrictedFields) {
      if (field in data) {
        throw this.fastify.httpErrors.badRequest(`Field '${field}' cannot be updated`);
      }
    }
  }
}
