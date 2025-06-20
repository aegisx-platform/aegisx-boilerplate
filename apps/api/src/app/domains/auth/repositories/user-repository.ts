import { FastifyInstance } from 'fastify';
import { InternalUser, CreateUserData, UserRepository } from '../types/auth-types';

/**
 * User Repository Implementation
 *
 * Handles all database operations for user data including:
 * - User CRUD operations
 * - Email verification
 * - User lookup and validation
 *
 * This repository provides a clean abstraction over the database layer.
 */
export class UserRepositoryImpl implements UserRepository {
  private readonly tableName = 'users';

  constructor(private readonly fastify: FastifyInstance) {}

  /**
   * Find user by email address
   */
  async findByEmail(email: string): Promise<InternalUser | null> {
    try {
      const user = await this.fastify.knex(this.tableName)
        .where('email', email)
        .first();

      return user || null;
    } catch (error) {
      this.fastify.log.error('Database error finding user by email', { error });
      throw new Error('Database operation failed');
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<InternalUser | null> {
    try {
      const user = await this.fastify.knex(this.tableName)
        .where('username', username)
        .first();

      return user || null;
    } catch (error) {
      this.fastify.log.error('Database error finding user by username', { error });
      throw new Error('Database operation failed');
    }
  }

  /**
   * Find user by identifier (username or email)
   */
  async findByIdentifier(identifier: string): Promise<InternalUser | null> {
    try {
      // Check if identifier looks like an email
      const isEmail = identifier.includes('@');
      
      if (isEmail) {
        return await this.findByEmail(identifier);
      } else {
        return await this.findByUsername(identifier);
      }
    } catch (error) {
      this.fastify.log.error('Database error finding user by identifier', { error });
      throw new Error('Database operation failed');
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<InternalUser | null> {
    try {
      const user = await this.fastify.knex(this.tableName)
        .where('id', id)
        .first();

      return user || null;
    } catch (error) {
      this.fastify.log.error('Database error finding user by ID', { error });
      throw new Error('Database operation failed');
    }
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<InternalUser> {
    try {
      const now = new Date();
      const userData = {
        name: data.name,
        username: data.username || null,
        email: data.email,
        password_hash: data.password_hash,
        status: data.status || 'active',
        email_verified_at: data.email_verified_at || null,
        created_at: now,
        updated_at: now
      };

      const [user] = await this.fastify.knex(this.tableName)
        .insert(userData)
        .returning('*');

      if (!user) {
        throw new Error('Insert operation returned no data');
      }

      this.fastify.log.debug('User created in database', { userId: user.id });
      return user;
    } catch (error) {
      this.fastify.log.error('Database error creating user', { error });

      // Handle specific database constraint errors
      if (error instanceof Error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          throw new Error('DUPLICATE_EMAIL');
        }
        if (error.message.includes('violates not-null constraint')) {
          throw new Error('MISSING_REQUIRED_FIELD');
        }
      }

      throw new Error('Database operation failed');
    }
  }

  /**
   * Update user data
   */
  async update(id: string, data: Partial<InternalUser>): Promise<InternalUser | null> {
    try {
      // Prepare update data
      const updateData = {
        ...data,
        updated_at: new Date()
      };

      // Remove fields that shouldn't be updated at repository level
      delete updateData.id;
      delete updateData.created_at;

      const [user] = await this.fastify.knex(this.tableName)
        .where('id', id)
        .update(updateData)
        .returning('*');

      if (user) {
        this.fastify.log.debug('User updated in database', { userId: id });
      }

      return user || null;
    } catch (error) {
      this.fastify.log.error('Database error updating user', { error });

      // Handle specific database constraint errors
      if (error instanceof Error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          throw new Error('DUPLICATE_EMAIL');
        }
        if (error.message.includes('violates not-null constraint')) {
          throw new Error('MISSING_REQUIRED_FIELD');
        }
      }

      throw new Error('Database operation failed');
    }
  }

  /**
   * Delete user (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    try {
      const deletedCount = await this.fastify.knex(this.tableName)
        .where('id', id)
        .del();

      const success = deletedCount > 0;

      if (success) {
        this.fastify.log.debug('User deleted from database', { userId: id });
      }

      return success;
    } catch (error) {
      this.fastify.log.error('Database error deleting user', { error });

      // Handle foreign key constraint errors
      if (error instanceof Error && error.message.includes('foreign key constraint')) {
        throw new Error('FOREIGN_KEY_CONSTRAINT');
      }

      throw new Error('Database operation failed');
    }
  }

  /**
   * Mark user email as verified
   */
  async verifyEmail(id: string): Promise<boolean> {
    try {
      const now = new Date();
      const updatedCount = await this.fastify.knex(this.tableName)
        .where('id', id)
        .whereNull('email_verified_at') // Only update if not already verified
        .update({
          email_verified_at: now,
          updated_at: now
        });

      const success = updatedCount > 0;

      if (success) {
        this.fastify.log.debug('User email verified', { userId: id });
      }

      return success;
    } catch (error) {
      this.fastify.log.error('Database error verifying email', { error });
      throw new Error('Database operation failed');
    }
  }

  /**
   * Get user statistics (optional utility method)
   */
  async getUserStats(): Promise<{ total: number; active: number; verified: number }> {
    try {
      const stats = await this.fastify.knex(this.tableName)
        .select(
          this.fastify.knex.raw('COUNT(*) as total'),
          this.fastify.knex.raw('COUNT(CASE WHEN status = \'active\' THEN 1 END) as active'),
          this.fastify.knex.raw('COUNT(CASE WHEN email_verified_at IS NOT NULL THEN 1 END) as verified')
        )
        .first();

      return {
        total: parseInt(stats.total, 10),
        active: parseInt(stats.active, 10),
        verified: parseInt(stats.verified, 10)
      };
    } catch (error) {
      this.fastify.log.error('Failed to get user statistics', { error });
      throw new Error('Database error while getting user statistics');
    }
  }
}
