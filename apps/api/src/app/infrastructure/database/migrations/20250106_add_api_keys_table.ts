/**
 * API Keys Table Migration
 * 
 * Creates the api_keys table for API key authentication
 * with full audit trail and permission management
 */

export async function up(knex: any): Promise<void> {
  // Create api_keys table
  await knex.schema.createTable('api_keys', (table: any) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    
    // User relationship
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE')
    
    // Key information
    table.string('key_hash', 255).notNullable().unique()
    table.string('key_prefix', 20).notNullable() // for identification (sk_live_xxxx)
    table.string('name', 255).notNullable()
    table.text('description')
    
    // Permissions and constraints
    table.jsonb('permissions').defaultTo('{}')
    table.timestamp('expires_at')
    table.integer('rate_limit').defaultTo(1000) // per hour
    table.jsonb('ip_whitelist').defaultTo('[]')
    
    // Usage tracking
    table.timestamp('last_used_at')
    table.string('last_used_ip', 45)
    table.integer('usage_count').defaultTo(0)
    
    // Status
    table.boolean('is_active').defaultTo(true)
    table.timestamp('revoked_at')
    table.uuid('revoked_by').references('id').inTable('users')
    table.text('revoked_reason')
    
    // Timestamps
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now())
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now())
  })
  
  // Create indexes for performance
  await knex.schema.raw('CREATE INDEX idx_api_keys_user_id ON api_keys(user_id)')
  await knex.schema.raw('CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash)')
  await knex.schema.raw('CREATE INDEX idx_api_keys_is_active ON api_keys(is_active)')
  await knex.schema.raw('CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at)')
  await knex.schema.raw('CREATE INDEX idx_api_keys_last_used_at ON api_keys(last_used_at)')
  
  // Create composite index for active key lookups
  await knex.schema.raw('CREATE INDEX idx_api_keys_active_lookup ON api_keys(key_hash, is_active) WHERE is_active = true')
}

export async function down(knex: any): Promise<void> {
  // Drop indexes
  await knex.schema.raw('DROP INDEX IF EXISTS idx_api_keys_active_lookup')
  await knex.schema.raw('DROP INDEX IF EXISTS idx_api_keys_last_used_at')
  await knex.schema.raw('DROP INDEX IF EXISTS idx_api_keys_expires_at')
  await knex.schema.raw('DROP INDEX IF EXISTS idx_api_keys_is_active')
  await knex.schema.raw('DROP INDEX IF EXISTS idx_api_keys_key_hash')
  await knex.schema.raw('DROP INDEX IF EXISTS idx_api_keys_user_id')
  
  // Drop table
  await knex.schema.dropTableIfExists('api_keys')
}