/**
 * Simple Reports Test Migration
 */

export async function up(knex: any): Promise<void> {
  // Create a simple test table for reports
  await knex.schema.createTable('report_test', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name', 255).notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
  })

  console.log('✅ Simple reports test table created')
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('report_test')
  console.log('✅ Simple reports test table dropped')
}