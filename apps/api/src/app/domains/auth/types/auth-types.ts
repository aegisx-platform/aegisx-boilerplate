import { Static } from '@sinclair/typebox';
import {
  UserSchema,
  ErrorResponseSchema,
  MessageResponseSchema,
  LoginResponseSchema,
  RefreshResponseSchema,
  RegisterRequestSchema,
  LoginRequestSchema,
  RefreshTokenRequestSchema,
  ChangePasswordRequestSchema,
  UpdateProfileRequestSchema,
  LogoutRequestSchema
} from '../schemas/auth-schemas';

/**
 * TypeScript types derived from TypeBox schemas
 */
export type User = Static<typeof UserSchema>;
export type ErrorResponse = Static<typeof ErrorResponseSchema>;
export type MessageResponse = Static<typeof MessageResponseSchema>;
export type LoginResponse = Static<typeof LoginResponseSchema>;
export type RefreshResponse = Static<typeof RefreshResponseSchema>;
export type RegisterRequest = Static<typeof RegisterRequestSchema>;
export type LoginRequest = Static<typeof LoginRequestSchema>;
export type RefreshTokenRequest = Static<typeof RefreshTokenRequestSchema>;
export type ChangePasswordRequest = Static<typeof ChangePasswordRequestSchema>;
export type UpdateProfileRequest = Static<typeof UpdateProfileRequestSchema>;
export type LogoutRequest = Static<typeof LogoutRequestSchema>;

/**
 * Database entity interfaces
 * These represent the actual database table structures
 */
export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
}

/**
 * User status enum for better type safety
 */
export type UserStatus = 'active' | 'inactive' | 'suspended';

/**
 * Extended user interface for internal operations
 */
export interface InternalUser extends User {
  password_hash: string;
}

/**
 * User creation data interface
 */
export interface CreateUserData extends RegisterRequest {
  password_hash: string;
  status?: UserStatus;
  email_verified_at?: Date | null;
}

/**
 * JWT payload interfaces for token management
 */
export interface JWTPayload {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  roles: string[];        // User roles: ["admin", "doctor", "nurse"]
  permissions: string[];  // User permissions: ["patients:read:own", "appointments:write:department"]
  iat?: number; // Issued at
  exp?: number; // Expires at
}

export interface RefreshTokenPayload {
  id: string;
  token_id: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Extended request interface for authenticated routes
 */
export interface AuthenticatedRequest {
  user: JWTPayload;
}

/**
 * Repository interfaces for data access layer
 * These define the contract for database operations
 */
export interface UserRepository {
  // Read operations
  findByEmail(email: string): Promise<InternalUser | null>;
  findByUsername(username: string): Promise<InternalUser | null>;
  findByIdentifier(identifier: string): Promise<InternalUser | null>;
  findById(id: string): Promise<InternalUser | null>;

  // Write operations
  create(data: CreateUserData): Promise<InternalUser>;
  update(id: string, data: Partial<InternalUser>): Promise<InternalUser | null>;
  delete(id: string): Promise<boolean>;

  // Special operations
  verifyEmail(id: string): Promise<boolean>;
  getUserStats?(): Promise<UserStats>;
}

export interface RefreshTokenRepository {
  // Core operations
  create(user_id: string, token_hash: string, expires_at: Date): Promise<RefreshToken>;
  findByTokenHash(token_hash: string): Promise<RefreshToken | null>;

  // Revocation operations
  revokeByUserId(user_id: string): Promise<void>;
  revokeByTokenHash(token_hash: string): Promise<void>;

  // Maintenance operations
  cleanup(): Promise<void>;
  getTokenStats?(): Promise<TokenStats>;
}

/**
 * Statistics interfaces for monitoring
 */
export interface UserStats {
  total: number;
  active: number;
  verified: number;
}

export interface TokenStats {
  total: number;
  active: number;
  expired: number;
  revoked: number;
}

/**
 * Service configuration interface
 */
export interface AuthConfig {
  bcryptRounds: number;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  maxLoginAttempts: number;
}

/**
 * Authentication result types
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  tokens?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  error?: string;
}

/**
 * Password validation result
 */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Type guards for runtime type checking
 */
export function isJWTPayload(obj: any): obj is JWTPayload {
  return obj && 
    typeof obj.id === 'string' && 
    typeof obj.email === 'string' && 
    typeof obj.name === 'string' &&
    Array.isArray(obj.roles) &&
    Array.isArray(obj.permissions);
}

export function isRefreshTokenPayload(obj: any): obj is RefreshTokenPayload {
  return obj && typeof obj.id === 'string' && typeof obj.token_id === 'string' && obj.type === 'refresh';
}

export function isValidUserStatus(status: string): status is UserStatus {
  return ['active', 'inactive', 'suspended'].includes(status);
}

/**
 * Error types for better error handling
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends AuthError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AuthError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}
