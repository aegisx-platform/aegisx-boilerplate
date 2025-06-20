import type { Knex } from 'knex';
import * as bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();

  // Generate password hashes for default password 'password123'
  const saltRounds = 10;
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

  // Inserts seed entries
  await knex('users').insert([
    {
      name: 'Admin User',
      email: 'admin@aegisx.com',
      password_hash: hashedPassword,
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Test User',
      email: 'test@aegisx.com',
      password_hash: hashedPassword,
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Demo User',
      email: 'demo@aegisx.com',
      password_hash: hashedPassword,
      status: 'active',
      email_verified_at: null, // Unverified email
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}
