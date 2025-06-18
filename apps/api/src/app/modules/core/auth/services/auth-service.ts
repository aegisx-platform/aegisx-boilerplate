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
  RefreshTokenPayload
} from '../types/auth-types';

export class AuthService {
  constructor(
    private fastify: FastifyInstance,
    private userRepo: UserRepository,
    private refreshTokenRepo: RefreshTokenRepository
  ) { }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(data.email);
    if (existingUser) {
      throw this.fastify.httpErrors.badRequest('User already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(data.password, 12);

    // Create user
    const user: InternalUser = await this.userRepo.create({
      ...data,
      password_hash
    });

    // Return user without password hash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Find user by email
    const user: InternalUser | null = await this.userRepo.findByEmail(credentials.email);
    if (!user) {
      throw this.fastify.httpErrors.unauthorized('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isPasswordValid) {
      throw this.fastify.httpErrors.unauthorized('Invalid credentials');
    }

    // Generate tokens
    const access_token = this.fastify.jwt.sign({ id: user.id, email: user.email, name: user.name });
    const refresh_token = await this.generateRefreshToken(user.id);

    // Return response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...userWithoutPassword } = user;
    return {
      access_token,
      refresh_token,
      user: userWithoutPassword,
      expires_in: 3600 // 1 hour in seconds
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refresh_token: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      // Verify refresh token
      const payload = this.fastify.jwt.verify(refresh_token) as RefreshTokenPayload;

      // Check if refresh token exists and is valid
      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      const storedToken = await this.refreshTokenRepo.findByTokenHash(tokenHash);

      if (!storedToken || storedToken.revoked_at) {
        throw this.fastify.httpErrors.unauthorized('Invalid refresh token');
      }

      // Check if token is expired
      if (new Date() > storedToken.expires_at) {
        throw this.fastify.httpErrors.unauthorized('Refresh token expired');
      }

      // Get user
      const user = await this.userRepo.findById(payload.id);
      if (!user) {
        throw this.fastify.httpErrors.unauthorized('User not found');
      }

      // Generate new tokens
      const access_token = this.fastify.jwt.sign({ id: user.id, email: user.email, name: user.name });
      const new_refresh_token = await this.generateRefreshToken(user.id);

      // Revoke old refresh token
      await this.refreshTokenRepo.revokeByTokenHash(tokenHash);

      return {
        access_token,
        refresh_token: new_refresh_token
      };
    } catch {
      throw this.fastify.httpErrors.unauthorized('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(user_id: string, refresh_token?: string): Promise<void> {
    if (refresh_token) {
      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      await this.refreshTokenRepo.revokeByTokenHash(tokenHash);
    } else {
      // Revoke all refresh tokens for user
      await this.refreshTokenRepo.revokeByUserId(user_id);
    }
  }

  /**
   * Change user password
   */
  async changePassword(user_id: string, data: ChangePasswordRequest): Promise<void> {
    // Get user
    const user: InternalUser | null = await this.userRepo.findById(user_id);
    if (!user) {
      throw this.fastify.httpErrors.notFound('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(data.current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      throw this.fastify.httpErrors.badRequest('Current password is incorrect');
    }

    // Hash new password
    const new_password_hash = await bcrypt.hash(data.new_password, 12);

    // Update password
    await this.userRepo.update(user_id, {
      password_hash: new_password_hash
    } as Partial<InternalUser>);

    // Revoke all refresh tokens to force re-login
    await this.refreshTokenRepo.revokeByUserId(user_id);
  }

  /**
   * Get user profile
   */
  async getProfile(user_id: string): Promise<User> {
    const user: InternalUser | null = await this.userRepo.findById(user_id);
    if (!user) {
      throw this.fastify.httpErrors.notFound('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Update user profile
   */
  async updateProfile(user_id: string, data: Partial<User>): Promise<User> {
    const updatedUser: InternalUser | null = await this.userRepo.update(user_id, data);
    if (!updatedUser) {
      throw this.fastify.httpErrors.notFound('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  /**
   * Verify email address
   */
  async verifyEmail(user_id: string): Promise<void> {
    const success = await this.userRepo.verifyEmail(user_id);
    if (!success) {
      throw this.fastify.httpErrors.notFound('User not found');
    }
  }

  /**
   * Generate refresh token
   */
  private async generateRefreshToken(user_id: string): Promise<string> {
    const token_id = crypto.randomUUID();

    // Use direct JWT signing with object literal
    const refresh_token = this.fastify.jwt.sign({
      id: user_id,
      token_id: token_id,
      email: '',  // Add empty email for compatibility
      name: ''    // Add empty name for compatibility
    }, { expiresIn: '7d' });

    // Hash and store refresh token
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.refreshTokenRepo.create(user_id, tokenHash, expires_at);

    return refresh_token;
  }
}
