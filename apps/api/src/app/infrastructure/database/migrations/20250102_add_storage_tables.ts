/**
 * Storage System Database Migration
 * 
 * Creates tables for file metadata, storage operations, and file access tracking
 */

export async function up(knex: any): Promise<void> {
  // Create storage_files table for file metadata
  await knex.schema.createTable('storage_files', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('file_id', 255).notNullable().unique().index() // Provider-specific file ID
    table.string('filename', 255).notNullable()
    table.string('original_name', 255).notNullable()
    table.string('mime_type', 100).notNullable()
    table.bigInteger('size').notNullable()
    table.string('checksum', 64).notNullable()
    table.string('checksum_algorithm', 20).notNullable().defaultTo('sha256')
    table.string('encoding', 50).nullable()
    
    // Storage provider information
    table.string('provider', 50).notNullable() // 'local', 'minio', etc.
    table.string('provider_path', 500).notNullable()
    table.text('provider_metadata').nullable() // JSON string
    
    // Classification and security
    table.enu('data_classification', ['public', 'internal', 'confidential', 'restricted']).notNullable().defaultTo('internal')
    table.boolean('encrypted').notNullable().defaultTo(false)
    table.string('encryption_key_id', 255).nullable()
    
    // File organization
    table.text('tags').nullable() // JSON array as string
    table.text('custom_metadata').nullable() // JSON object as string
    
    // Audit and tracking
    table.uuid('created_by').nullable()
    table.uuid('updated_by').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
    table.timestamp('last_accessed_at').nullable()
    table.integer('access_count').notNullable().defaultTo(0)
    
    // File status
    table.enu('status', ['active', 'archived', 'deleted', 'corrupted']).notNullable().defaultTo('active')
    table.timestamp('deleted_at').nullable()
    
    // Performance indexes
    table.index(['provider', 'status'])
    table.index(['created_by', 'status'])
    table.index(['mime_type', 'status'])
    table.index(['data_classification', 'status'])
    table.index(['size'])
    table.index(['created_at'])
    table.index(['last_accessed_at'])
  })

  // Create storage_operations table for operation logging
  await knex.schema.createTable('storage_operations', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('file_id').references('id').inTable('storage_files').onDelete('CASCADE')
    table.enu('operation', ['upload', 'download', 'delete', 'copy', 'move', 'update_metadata']).notNullable().index()
    table.enu('status', ['success', 'failed', 'pending']).notNullable().index()
    
    // Operation details
    table.string('provider', 50).notNullable()
    table.bigInteger('bytes_transferred')
    table.integer('duration_ms') // Operation duration in milliseconds
    table.string('client_ip', 45) // IPv6 support
    table.string('user_agent', 500)
    
    // User and session tracking
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL')
    table.string('session_id', 255)
    table.string('correlation_id', 255).index() // For request tracking
    
    // Error tracking
    table.string('error_code', 50)
    table.text('error_message')
    table.text('error_details') // JSON string
    
    // Additional context
    table.string('purpose', 255) // Purpose of the operation
    table.text('metadata') // JSON string for additional operation metadata
    
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    
    // Performance indexes
    table.index(['operation', 'status'])
    table.index(['user_id', 'operation'])
    table.index(['provider', 'operation'])
    table.index('created_at')
  })

  // Create storage_file_shares table for file sharing
  await knex.schema.createTable('storage_file_shares', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('file_id').references('id').inTable('storage_files').onDelete('CASCADE')
    table.uuid('shared_by').references('id').inTable('users').onDelete('CASCADE')
    table.uuid('shared_with').references('id').inTable('users').onDelete('CASCADE')
    
    // Share permissions
    table.boolean('can_read').notNullable().defaultTo(true)
    table.boolean('can_write').notNullable().defaultTo(false)
    table.boolean('can_delete').notNullable().defaultTo(false)
    table.boolean('can_share').notNullable().defaultTo(false)
    
    // Share settings
    table.timestamp('expires_at', { useTz: true })
    table.boolean('requires_password').notNullable().defaultTo(false)
    table.string('password_hash', 255)
    table.integer('max_downloads')
    table.integer('download_count').notNullable().defaultTo(0)
    
    // Tracking
    table.boolean('is_active').notNullable().defaultTo(true)
    table.timestamps(true, true, false)
    table.timestamp('last_accessed_at', { useTz: true })
    
    // Constraints
    table.unique(['file_id', 'shared_with'])
    
    // Indexes
    table.index(['shared_with', 'is_active'])
    table.index(['shared_by', 'is_active'])
    table.index('expires_at')
  })

  // Create storage_file_versions table for version control
  await knex.schema.createTable('storage_file_versions', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('file_id').references('id').inTable('storage_files').onDelete('CASCADE')
    table.integer('version_number').notNullable()
    table.string('version_file_id', 255).notNullable() // Provider-specific ID for this version
    
    // Version metadata
    table.string('filename', 255).notNullable()
    table.bigInteger('size').notNullable()
    table.string('checksum', 64).notNullable()
    table.string('mime_type', 100).notNullable()
    table.string('provider_path', 500).notNullable()
    
    // Version tracking
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    table.string('change_description', 500)
    table.boolean('is_current').notNullable().defaultTo(false)
    
    // Constraints
    table.unique(['file_id', 'version_number'])
    
    // Indexes
    table.index(['file_id', 'is_current'])
    table.index(['file_id', 'version_number'])
    table.index('created_at')
  })

  // Create storage_quotas table for user/organization quotas
  await knex.schema.createTable('storage_quotas', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE')
    table.string('entity_type', 50).notNullable().defaultTo('user') // 'user', 'organization', 'project'
    table.string('entity_id', 255).notNullable()
    
    // Quota limits
    table.bigInteger('max_storage_bytes').notNullable() // Total storage limit
    table.integer('max_files').notNullable() // Maximum number of files
    table.bigInteger('max_file_size_bytes').notNullable() // Maximum single file size
    
    // Current usage
    table.bigInteger('used_storage_bytes').notNullable().defaultTo(0)
    table.integer('used_files').notNullable().defaultTo(0)
    
    // Settings
    table.boolean('is_active').notNullable().defaultTo(true)
    table.timestamps(true, true, false)
    table.timestamp('last_calculated_at', { useTz: true })
    
    // Constraints
    table.unique(['entity_type', 'entity_id'])
    
    // Indexes
    table.index(['user_id', 'is_active'])
    table.index(['entity_type', 'entity_id'])
  })

  console.log('✅ Storage tables created successfully')
}

export async function down(knex: any): Promise<void> {
  // Drop tables in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('storage_quotas')
  await knex.schema.dropTableIfExists('storage_file_versions')
  await knex.schema.dropTableIfExists('storage_file_shares')
  await knex.schema.dropTableIfExists('storage_operations')
  await knex.schema.dropTableIfExists('storage_files')
  
  console.log('✅ Storage tables dropped successfully')
}