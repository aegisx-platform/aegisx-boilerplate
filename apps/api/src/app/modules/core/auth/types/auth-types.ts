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
 * Database entities
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
 * JWT payload interfaces
 */
export interface RefreshTokenPayload {
  id: string;
  token_id: string;
  iat?: number;
  exp?: number;
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Internal types for database operations
 */
export interface InternalUser extends User {
  password_hash: string;
}

/**
 * Repository interfaces
 */
export interface UserRepository {
  findByEmail(email: string): Promise<InternalUser | null>;
  findById(id: string): Promise<InternalUser | null>;
  create(data: RegisterRequest & { password_hash: string }): Promise<InternalUser>;
  update(id: string, data: Partial<InternalUser>): Promise<InternalUser | null>;
  delete(id: string): Promise<boolean>;
  verifyEmail(id: string): Promise<boolean>;
}

export interface RefreshTokenRepository {
  create(user_id: string, token_hash: string, expires_at: Date): Promise<RefreshToken>;
  findByTokenHash(token_hash: string): Promise<RefreshToken | null>;
  revokeByUserId(user_id: string): Promise<void>;
  revokeByTokenHash(token_hash: string): Promise<void>;
  cleanup(): Promise<void>; // Remove expired tokens
}