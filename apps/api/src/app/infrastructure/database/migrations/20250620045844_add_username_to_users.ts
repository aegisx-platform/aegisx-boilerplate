import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.string('username', 50).unique().nullable();
    
    // Add index for username
    table.index('username');
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('users', (table) => {
    table.dropIndex('username');
    table.dropColumn('username');
  });
}