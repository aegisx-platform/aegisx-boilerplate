import type { Knex } from 'knex';
import * as bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Deletes ALL existing entries
  await knex('users').del();

  // Generate password hashes for default password 'admin123' for admin, 'password123' for others
  const saltRounds = 10;
  const defaultPassword = 'password123';
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
  const hashedAdminPassword = await bcrypt.hash(adminPassword, saltRounds);

  // Inserts seed entries
  await knex('users').insert([
    {
      name: 'Admin User',
      username: 'admin',
      email: 'admin@aegisx.com',
      password_hash: hashedAdminPassword, // admin123
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Manager User',
      username: 'manager',
      email: 'manager@aegisx.com',
      password_hash: hashedPassword, // password123
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Test User',
      username: 'testuser',
      email: 'test@aegisx.com',
      password_hash: hashedPassword, // password123
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Viewer User',
      username: 'viewer',
      email: 'viewer@aegisx.com',
      password_hash: hashedPassword, // password123
      status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      name: 'Demo User',
      username: 'demo',
      email: 'demo@aegisx.com',
      password_hash: hashedPassword, // password123
      status: 'active',
      email_verified_at: null, // Unverified email
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log(`✅ Users seed completed: Created 5 test users`);
  console.log(`   - admin@aegisx.com (password: admin123) -> will get 'admin' role`);
  console.log(`   - manager@aegisx.com (password: password123) -> will get 'manager' role`);
  console.log(`   - viewer@aegisx.com (password: password123) -> will get 'viewer' role`);
  console.log(`   - test@aegisx.com (password: password123) -> will get 'user' role`);
  console.log(`   - demo@aegisx.com (password: password123) -> will get 'user' role`);
}
