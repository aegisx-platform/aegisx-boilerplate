/**
 * Storage Seed Data
 * 
 * Creates default storage quotas for all users
 */

export async function seed(knex: any): Promise<void> {
  // Clear existing data
  await knex('storage_file_versions').del()
  await knex('storage_file_shares').del()
  await knex('storage_operations').del()
  await knex('storage_files').del()
  await knex('storage_quotas').del()

  // Get all existing users for quota creation
  const users = await knex('users').select('id', 'email')

  if (users.length === 0) {
    console.log('⚠️  Storage seed requires users to be seeded first')
    return
  }

  // Create default storage quotas for all users
  const quotas = users.map((user: any, index: number) => ({
    id: `550e8400-e29b-41d4-a716-44665544${String(index).padStart(4, '0')}`,
    user_id: user.id,
    entity_type: 'user',
    entity_id: user.id,
    // Default quota: 5GB storage, 10K files, 100MB max file size
    max_storage_bytes: 5 * 1024 * 1024 * 1024, // 5GB
    max_files: 10000,
    max_file_size_bytes: 100 * 1024 * 1024, // 100MB max file size
    used_storage_bytes: 0,
    used_files: 0,
    is_active: true,
    last_calculated_at: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  }))

  await knex('storage_quotas').insert(quotas)

  console.log('✅ Storage quotas created successfully')
  console.log(`   - Created default storage quotas for ${users.length} users`)
  console.log('   - Default quota: 5GB storage, 10K files, 100MB max file size')
}