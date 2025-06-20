import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('refresh_tokens', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('token_hash').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('revoked_at').nullable();

    // Indexes
    table.index('user_id');
    table.index('token_hash');
    table.index('expires_at');
    table.index('revoked_at');
    table.index(['user_id', 'revoked_at']); // Composite index for active tokens per user
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('refresh_tokens');
}
