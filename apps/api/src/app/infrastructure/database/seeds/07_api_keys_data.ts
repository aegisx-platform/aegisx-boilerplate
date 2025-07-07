/**
 * API Keys Seed Data
 * 
 * Creates default API key quotas and sample API keys for testing
 */

export async function seed(knex: any): Promise<void> {
  // Clear existing API key data
  await knex('api_keys').del()

  // Get existing users for API key creation
  const users = await knex('users').select('id', 'email')

  if (users.length === 0) {
    console.log('⚠️  API Keys seed requires users to be seeded first')
    return
  }

  const adminUser = users.find((u: any) => u.email === 'admin@aegisx.com')
  const managerUser = users.find((u: any) => u.email === 'manager@aegisx.com')
  const testUser = users.find((u: any) => u.email === 'test@aegisx.com')

  // Create sample API keys for demonstration
  const sampleApiKeys = []

  if (adminUser) {
    sampleApiKeys.push({
      id: '770e8400-e29b-41d4-a716-446655440000',
      user_id: adminUser.id,
      key_hash: '$2b$12$XYZ...', // This would be a real hash in practice
      key_prefix: 'sk_test_1234...',
      name: 'Admin Management Key',
      description: 'Administrative API key for system management',
      permissions: JSON.stringify({
        resources: ['users', 'api_keys', 'audit_logs'],
        actions: ['read', 'write', 'delete'],
        scopes: ['all']
      }),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      rate_limit: 5000,
      ip_whitelist: JSON.stringify([]),
      usage_count: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    })
  }

  if (managerUser) {
    sampleApiKeys.push({
      id: '770e8400-e29b-41d4-a716-446655440001',
      user_id: managerUser.id,
      key_hash: '$2b$12$ABC...', // This would be a real hash in practice
      key_prefix: 'sk_test_5678...',
      name: 'Manager Operations Key',
      description: 'API key for department operations',
      permissions: JSON.stringify({
        resources: ['users', 'reports'],
        actions: ['read', 'write'],
        scopes: ['department']
      }),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      rate_limit: 2000,
      ip_whitelist: JSON.stringify(['192.168.1.100', '10.0.0.50']),
      usage_count: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    })
  }

  if (testUser) {
    sampleApiKeys.push({
      id: '770e8400-e29b-41d4-a716-446655440002',
      user_id: testUser.id,
      key_hash: '$2b$12$DEF...', // This would be a real hash in practice
      key_prefix: 'sk_test_9012...',
      name: 'Testing Integration Key',
      description: 'API key for automated testing',
      permissions: JSON.stringify({
        resources: ['test_data'],
        actions: ['read'],
        scopes: ['own']
      }),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      rate_limit: 1000,
      ip_whitelist: JSON.stringify([]),
      usage_count: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    })

    // Add one expired key for testing cleanup
    sampleApiKeys.push({
      id: '770e8400-e29b-41d4-a716-446655440003',
      user_id: testUser.id,
      key_hash: '$2b$12$GHI...', // This would be a real hash in practice
      key_prefix: 'sk_test_3456...',
      name: 'Expired Test Key',
      description: 'Expired API key for testing cleanup functionality',
      permissions: JSON.stringify({
        resources: ['test_data'],
        actions: ['read'],
        scopes: ['own']
      }),
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday (expired)
      rate_limit: 500,
      ip_whitelist: JSON.stringify([]),
      usage_count: 0,
      is_active: true, // Will be cleaned up by the cleanup job
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    })
  }

  if (sampleApiKeys.length > 0) {
    await knex('api_keys').insert(sampleApiKeys)
  }

  console.log('✅ API Keys seed data created successfully')
  console.log(`   - Created ${sampleApiKeys.length} sample API keys`)
  if (sampleApiKeys.some(k => new Date(k.expires_at) < new Date())) {
    console.log('   - ⚠️  Some keys are expired and will be cleaned up by the cleanup job')
  }
  console.log('   - Note: Key hashes in seed data are placeholders')
  console.log('   - Real API keys should be generated through the API endpoints')
}