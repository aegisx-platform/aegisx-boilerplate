import { FastifyInstance } from 'fastify';
import { RefreshToken, RefreshTokenRepository } from '../types/auth-types';

/**
 * Refresh Token Repository Implementation
 * 
 * Handles all database operations for refresh tokens including:
 * - Token creation and storage
 * - Token validation and lookup
 * - Token revocation and cleanup
 * 
 * This repository manages the lifecycle of refresh tokens for secure authentication.
 */
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  private readonly tableName = 'refresh_tokens';
  
  constructor(private readonly fastify: FastifyInstance) {}

  /**
   * Create a new refresh token
   */
  async create(user_id: string, token_hash: string, expires_at: Date): Promise<RefreshToken> {
    if (!user_id?.trim() || !token_hash?.trim() || !expires_at) {
      throw new Error('Missing required token data');
    }

    try {
      const tokenData = {
        user_id,
        token_hash,
        expires_at,
        created_at: new Date(),
        revoked_at: null
      };

      const [token] = await this.fastify.knex(this.tableName)
        .insert(tokenData)
        .returning('*');

      if (!token) {
        throw new Error('Failed to create refresh token');
      }

      this.fastify.log.debug('Refresh token created', { userId: user_id, tokenId: token.id });
      return token;
    } catch (error) {
      this.fastify.log.error('Failed to create refresh token', { userId: user_id, error });
      throw new Error('Database error while creating refresh token');
    }
  }

  /**
   * Find refresh token by hash
   */
  async findByTokenHash(token_hash: string): Promise<RefreshToken | null> {
    if (!token_hash?.trim()) {
      return null;
    }

    try {
      const token = await this.fastify.knex(this.tableName)
        .where('token_hash', token_hash)
        .first(); // Don't filter by revoked_at or expires_at here, let service decide

      return token || null;
    } catch (error) {
      this.fastify.log.error('Failed to find refresh token', { error });
      throw new Error('Database error while finding refresh token');
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeByUserId(user_id: string): Promise<void> {
    if (!user_id?.trim()) {
      throw new Error('User ID is required');
    }

    try {
      const revokedCount = await this.fastify.knex(this.tableName)
        .where('user_id', user_id)
        .whereNull('revoked_at')
        .update({
          revoked_at: new Date()
        });

      this.fastify.log.info('Refresh tokens revoked for user', { 
        userId: user_id, 
        revokedCount 
      });
    } catch (error) {
      this.fastify.log.error('Failed to revoke tokens for user', { userId: user_id, error });
      throw new Error('Database error while revoking user tokens');
    }
  }

  /**
   * Revoke a specific refresh token
   */
  async revokeByTokenHash(token_hash: string): Promise<void> {
    if (!token_hash?.trim()) {
      throw new Error('Token hash is required');
    }

    try {
      const revokedCount = await this.fastify.knex(this.tableName)
        .where('token_hash', token_hash)
        .whereNull('revoked_at')
        .update({
          revoked_at: new Date()
        });

      this.fastify.log.debug('Refresh token revoked', { revokedCount });
    } catch (error) {
      this.fastify.log.error('Failed to revoke refresh token', { error });
      throw new Error('Database error while revoking refresh token');
    }
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanup(): Promise<void> {
    try {
      // Remove tokens expired more than 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCount = await this.fastify.knex(this.tableName)
        .where('expires_at', '<', thirtyDaysAgo)
        .del();

      this.fastify.log.info('Expired refresh tokens cleaned up', { deletedCount });
    } catch (error) {
      this.fastify.log.error('Failed to cleanup expired tokens', { error });
      throw new Error('Database error during token cleanup');
    }
  }

  /**
   * Get refresh token statistics
   */
  async getTokenStats(): Promise<{ total: number; active: number; expired: number; revoked: number }> {
    try {
      const now = new Date();
      const stats = await this.fastify.knex(this.tableName)
        .select(
          this.fastify.knex.raw('COUNT(*) as total'),
          this.fastify.knex.raw('COUNT(CASE WHEN revoked_at IS NULL AND expires_at > ? THEN 1 END) as active', [now]),
          this.fastify.knex.raw('COUNT(CASE WHEN expires_at <= ? THEN 1 END) as expired', [now]),
          this.fastify.knex.raw('COUNT(CASE WHEN revoked_at IS NOT NULL THEN 1 END) as revoked')
        )
        .first();

      return {
        total: parseInt(stats.total, 10),
        active: parseInt(stats.active, 10),
        expired: parseInt(stats.expired, 10),
        revoked: parseInt(stats.revoked, 10)
      };
    } catch (error) {
      this.fastify.log.error('Failed to get token statistics', { error });
      throw new Error('Database error while getting token statistics');
    }
  }
}
