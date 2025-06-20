import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();

  // Inserts seed entries
  await knex('users').insert([
    {
      name: 'Admin User',
      email: 'admin@aegisx.com',
      password_hash: '$2b$10$example_hash_here', // In real app, use bcrypt
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Test User',
      email: 'test@aegisx.com',
      password_hash: '$2b$10$example_hash_here',
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Demo User',
      email: 'demo@aegisx.com',
      password_hash: '$2b$10$example_hash_here',
      status: 'active',
      email_verified_at: null, // Unverified email
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}
