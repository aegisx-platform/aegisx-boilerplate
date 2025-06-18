import { FastifyInstance } from 'fastify';
import { RefreshToken, RefreshTokenRepository } from '../types/auth-types';

export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(private fastify: FastifyInstance) { }

  async create(user_id: string, token_hash: string, expires_at: Date): Promise<RefreshToken> {
    const [token] = await this.fastify.knex('refresh_tokens')
      .insert({
        user_id,
        token_hash,
        expires_at,
        created_at: new Date()
      })
      .returning('*');

    return token;
  }

  async findByTokenHash(token_hash: string): Promise<RefreshToken | null> {
    const token = await this.fastify.knex('refresh_tokens')
      .where('token_hash', token_hash)
      .whereNull('revoked_at')
      .where('expires_at', '>', new Date())
      .first();

    return token || null;
  }

  async revokeByUserId(user_id: string): Promise<void> {
    await this.fastify.knex('refresh_tokens')
      .where('user_id', user_id)
      .whereNull('revoked_at')
      .update({
        revoked_at: new Date()
      });
  }

  async revokeByTokenHash(token_hash: string): Promise<void> {
    await this.fastify.knex('refresh_tokens')
      .where('token_hash', token_hash)
      .update({
        revoked_at: new Date()
      });
  }

  async cleanup(): Promise<void> {
    // Remove tokens expired more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await this.fastify.knex('refresh_tokens')
      .where('expires_at', '<', thirtyDaysAgo)
      .del();
  }
}
