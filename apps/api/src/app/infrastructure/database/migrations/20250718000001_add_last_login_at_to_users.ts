import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.timestamp('last_login_at').nullable();
    
    // Add index for performance optimization
    table.index('last_login_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropIndex('last_login_at');
    table.dropColumn('last_login_at');
  });
}