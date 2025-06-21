import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('action').notNullable(); // CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    table.string('resource_type').notNullable(); // user, patient, appointment, etc.
    table.string('resource_id').nullable(); // ID of the affected resource
    table.string('ip_address').nullable();
    table.string('user_agent').nullable();
    table.string('session_id').nullable();
    table.jsonb('old_values').nullable(); // Previous state for updates
    table.jsonb('new_values').nullable(); // New state for creates/updates
    table.jsonb('metadata').nullable(); // Additional context data
    table.string('status').notNullable().defaultTo('success'); // success, failed, error
    table.string('error_message').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index('user_id');
    table.index('action');
    table.index('resource_type');
    table.index('resource_id');
    table.index('created_at');
    table.index(['user_id', 'created_at']);
    table.index(['resource_type', 'resource_id']);
    table.index(['action', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('audit_logs');
}