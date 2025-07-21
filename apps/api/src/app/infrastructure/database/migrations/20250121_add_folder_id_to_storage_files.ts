/**
 * Add folder_id to storage_files table
 * 
 * This migration adds the folder_id column to storage_files table
 * to support folder organization in the storage system
 */

export async function up(knex: any): Promise<void> {
  // Check if storage_files table exists
  const hasStorageFilesTable = await knex.schema.hasTable('storage_files')
  if (!hasStorageFilesTable) {
    console.log('⚠️  storage_files table does not exist, skipping...')
    return
  }

  // Check if folder_id column already exists
  const hasFolderId = await knex.schema.hasColumn('storage_files', 'folder_id')
  if (hasFolderId) {
    console.log('✅ folder_id column already exists in storage_files')
    return
  }

  console.log('🔄 Adding folder_id column to storage_files...')
  
  // Add folder_id column
  await knex.schema.alterTable('storage_files', (table: any) => {
    table.bigInteger('folder_id').nullable().references('id').inTable('storage_folders').onDelete('SET NULL')
    table.index('folder_id')
  })

  console.log('✅ Successfully added folder_id to storage_files')
}

export async function down(knex: any): Promise<void> {
  console.log('🔄 Removing folder_id column from storage_files...')
  
  await knex.schema.alterTable('storage_files', (table: any) => {
    table.dropColumn('folder_id')
  })

  console.log('✅ Successfully removed folder_id from storage_files')
}