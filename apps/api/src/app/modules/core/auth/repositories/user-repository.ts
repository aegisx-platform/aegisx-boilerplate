import { FastifyInstance } from 'fastify';
import { InternalUser, RegisterRequest, UserRepository } from '../types';

export class UserRepositoryImpl implements UserRepository {
  constructor(private fastify: FastifyInstance) { }

  async findByEmail(email: string): Promise<InternalUser | null> {
    const user = await this.fastify.knex('users')
      .where('email', email)
      .first();

    return user || null;
  }

  async findById(id: string): Promise<InternalUser | null> {
    const user = await this.fastify.knex('users')
      .where('id', id)
      .first();

    return user || null;
  }

  async create(data: RegisterRequest & { password_hash: string }): Promise<InternalUser> {
    const [user] = await this.fastify.knex('users')
      .insert({
        name: data.name,
        email: data.email,
        password_hash: data.password_hash,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    return user;
  }

  async update(id: string, data: Partial<InternalUser>): Promise<InternalUser | null> {
    const [user] = await this.fastify.knex('users')
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*');

    return user || null;
  }

  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.fastify.knex('users')
      .where('id', id)
      .del();

    return deletedCount > 0;
  }

  async verifyEmail(id: string): Promise<boolean> {
    const updatedCount = await this.fastify.knex('users')
      .where('id', id)
      .update({
        email_verified_at: new Date(),
        updated_at: new Date()
      });

    return updatedCount > 0;
  }
}
