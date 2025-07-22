/**
 * Storage Folders Database Migration
 * 
 * Creates table for folder organization in the storage system
 */

export async function up(knex: any): Promise<void> {
  // Create storage_folders table for folder hierarchy
  await knex.schema.createTable('storage_folders', (table: any) => {
    table.bigIncrements('id').primary()
    table.string('name', 255).notNullable()
    table.string('path', 1000).notNullable() // Full path including folder name
    table.bigInteger('parent_id').nullable().references('id').inTable('storage_folders').onDelete('CASCADE')
    
    // Folder metadata
    table.text('description').nullable()
    table.text('metadata').nullable() // JSON object for custom metadata
    table.string('icon', 100).nullable() // Optional custom icon
    table.string('color', 7).nullable() // Optional color code (hex)
    
    // Permissions and classification
    table.enu('data_classification', ['public', 'internal', 'confidential', 'restricted']).notNullable().defaultTo('internal')
    table.boolean('inherit_permissions').notNullable().defaultTo(true)
    table.text('custom_permissions').nullable() // JSON object for custom permissions
    
    // Statistics (denormalized for performance)
    table.integer('file_count').notNullable().defaultTo(0)
    table.integer('subfolder_count').notNullable().defaultTo(0)
    table.bigInteger('total_size').notNullable().defaultTo(0)
    
    // Audit fields
    table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL')
    table.uuid('updated_by').references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at').defaultTo(knex.fn.now())
    table.timestamp('updated_at').defaultTo(knex.fn.now())
    table.timestamp('last_accessed_at').nullable()
    
    // Status
    table.enu('status', ['active', 'archived', 'deleted']).notNullable().defaultTo('active')
    table.timestamp('deleted_at').nullable()
    
    // Indexes for performance
    table.unique(['path', 'status']) // Ensure unique paths for active folders
    table.index(['parent_id', 'status'])
    table.index(['created_by', 'status'])
    table.index(['name'])
    table.index(['created_at'])
  })

  // Add folder_id to storage_files table for folder association
  const hasStorageFilesTable = await knex.schema.hasTable('storage_files')
  if (hasStorageFilesTable) {
    const hasFolderId = await knex.schema.hasColumn('storage_files', 'folder_id')
    if (!hasFolderId) {
      await knex.schema.alterTable('storage_files', (table: any) => {
        table.bigInteger('folder_id').nullable().references('id').inTable('storage_folders').onDelete('SET NULL')
        table.index('folder_id')
      })
    }

    // Create index for path-based file queries only if it doesn't exist
    const indexResult = await knex.raw(`
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'storage_files' 
      AND indexname = 'storage_files_provider_path_index'
    `)
    
    if (!indexResult.rows || indexResult.rows.length === 0) {
      await knex.schema.alterTable('storage_files', (table: any) => {
        table.index('provider_path')
      })
    }
  }
}

export async function down(knex: any): Promise<void> {
  // Remove folder_id from storage_files
  await knex.schema.alterTable('storage_files', (table: any) => {
    table.dropColumn('folder_id')
  })

  // Drop storage_folders table
  await knex.schema.dropTableIfExists('storage_folders')
}