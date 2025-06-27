import type { Knex } from 'knex';
import * as bcrypt from 'bcrypt';

export async function seed(knex: Knex): Promise<void> {
  // Delete in correct order to avoid foreign key constraints
  // 1. Delete notification related data first
  await knex('healthcare_notifications').del();
  await knex('notification_batch_items').del();
  await knex('notification_batches').del();
  await knex('notification_errors').del();
  await knex('notification_preferences').del();
  await knex('notifications').del();
  
  // 2. Delete RBAC related data
  await knex('role_permissions').del();
  await knex('user_roles').del();
  await knex('permissions').del();
  await knex('roles').del();
  
  // 3. Delete audit logs that reference users
  await knex('audit_logs').del();
  
  // 4. Delete refresh tokens
  await knex('refresh_tokens').del();
  
  // 5. Finally delete users
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
