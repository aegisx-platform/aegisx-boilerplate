import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create roles table
  await knex.schema.createTable('roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').unique().notNullable();
    table.string('display_name').notNullable();
    table.text('description').nullable();
    table.boolean('is_system').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('name');
    table.index('is_active');
    table.index('is_system');
  });

  // 2. Create permissions table
  await knex.schema.createTable('permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('resource').notNullable(); // patients, appointments, reports
    table.string('action').notNullable();   // create, read, update, delete
    table.string('scope').notNullable();    // own, department, all
    table.string('display_name').notNullable();
    table.text('description').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint on resource:action:scope combination
    table.unique(['resource', 'action', 'scope']);
    
    // Indexes
    table.index('resource');
    table.index(['resource', 'action']);
  });

  // 3. Create user_roles junction table
  await knex.schema.createTable('user_roles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('assigned_by').nullable().references('id').inTable('users');
    table.timestamp('expires_at').nullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint - user can have same role only once (active)
    table.unique(['user_id', 'role_id']);
    
    // Indexes
    table.index('user_id');
    table.index('role_id');
    table.index('is_active');
    table.index('expires_at');
  });

  // 4. Create role_permissions junction table
  await knex.schema.createTable('role_permissions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.uuid('permission_id').notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Unique constraint - role can have same permission only once
    table.unique(['role_id', 'permission_id']);
    
    // Indexes
    table.index('role_id');
    table.index('permission_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('permissions');
  await knex.schema.dropTableIfExists('roles');
}