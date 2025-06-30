/**
 * Storage Seed Data
 * 
 * Creates sample data for storage tables including default quotas and file examples
 */

export async function seed(knex: any): Promise<void> {
  // Clear existing data
  await knex('storage_file_versions').del()
  await knex('storage_file_shares').del()
  await knex('storage_operations').del()
  await knex('storage_files').del()
  await knex('storage_quotas').del()

  // Get existing users for foreign key references
  const adminUser = await knex('users').where('email', 'admin@aegisx.com').first()
  const managerUser = await knex('users').where('email', 'manager@aegisx.com').first()
  const testUser = await knex('users').where('email', 'test@aegisx.com').first()

  if (!adminUser || !managerUser || !testUser) {
    console.log('⚠️  Storage seed requires users to be seeded first')
    console.log('Available users:', await knex('users').select('email'))
    return
  }

  // Create default storage quotas
  const quotas = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      user_id: adminUser.id,
      entity_type: 'user',
      entity_id: adminUser.id,
      max_storage_bytes: 10 * 1024 * 1024 * 1024, // 10GB for admin
      max_files: 50000,
      max_file_size_bytes: 500 * 1024 * 1024, // 500MB max file size
      used_storage_bytes: 0,
      used_files: 0,
      is_active: true,
      last_calculated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      user_id: managerUser.id,
      entity_type: 'user',
      entity_id: managerUser.id,
      max_storage_bytes: 5 * 1024 * 1024 * 1024, // 5GB for manager
      max_files: 20000,
      max_file_size_bytes: 200 * 1024 * 1024, // 200MB max file size
      used_storage_bytes: 0,
      used_files: 0,
      is_active: true,
      last_calculated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      user_id: testUser.id,
      entity_type: 'user',
      entity_id: testUser.id,
      max_storage_bytes: 2 * 1024 * 1024 * 1024, // 2GB for test user
      max_files: 10000,
      max_file_size_bytes: 100 * 1024 * 1024, // 100MB max file size
      used_storage_bytes: 0,
      used_files: 0,
      is_active: true,
      last_calculated_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]

  await knex('storage_quotas').insert(quotas)

  // Create sample storage files
  const sampleFiles = [
    {
      id: '660e8400-e29b-41d4-a716-446655440000',
      file_id: 'file_sample_1_patient_record.pdf',
      filename: 'patient_record_001.pdf',
      original_name: 'Patient Medical Record - John Doe.pdf',
      mime_type: 'application/pdf',
      size: 2048576, // 2MB
      checksum: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890',
      checksum_algorithm: 'sha256',
      encoding: 'binary',
      provider: 'local',
      provider_path: '/storage/files/2024/12/patient_record_001.pdf',
      provider_metadata: JSON.stringify({
        directory: '/storage/files/2024/12',
        permissions: '644'
      }),
      data_classification: 'confidential',
      encrypted: true,
      encryption_key_id: 'key_patient_records_2024',
      tags: JSON.stringify(['medical', 'patient-record', 'pdf', 'confidential']),
      custom_metadata: JSON.stringify({
        patientId: 'P001',
        departmentId: 'cardiology',
        documentType: 'medical-record',
        isDigitallySigned: true
      }),
      created_by: managerUser.id,
      updated_by: managerUser.id,
      created_at: new Date('2024-12-01T10:00:00Z'),
      updated_at: new Date('2024-12-01T10:00:00Z'),
      last_accessed_at: new Date('2024-12-29T14:30:00Z'),
      access_count: 5,
      status: 'active'
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440001',
      file_id: 'file_sample_2_lab_results.jpg',
      filename: 'lab_results_xray_001.jpg',
      original_name: 'X-Ray Results - Patient 002.jpg',
      mime_type: 'image/jpeg',
      size: 5242880, // 5MB
      checksum: 'def456ghi789jkl012mno345pqr678stu901vwx234yz567890abc123',
      checksum_algorithm: 'sha256',
      encoding: 'binary',
      provider: 'minio',
      provider_path: 'medical-images/2024/12/xray_001.jpg',
      provider_metadata: JSON.stringify({
        bucket: 'medical-images',
        region: 'us-east-1',
        storageClass: 'STANDARD'
      }),
      data_classification: 'confidential',
      encrypted: true,
      encryption_key_id: 'key_medical_images_2024',
      tags: JSON.stringify(['medical', 'x-ray', 'imaging', 'radiology']),
      custom_metadata: JSON.stringify({
        patientId: 'P002',
        departmentId: 'radiology',
        imagingType: 'x-ray',
        bodyPart: 'chest',
        technician: 'tech001'
      }),
      created_by: managerUser.id,
      updated_by: managerUser.id,
      created_at: new Date('2024-12-15T14:20:00Z'),
      updated_at: new Date('2024-12-15T14:20:00Z'),
      last_accessed_at: new Date('2024-12-29T09:15:00Z'),
      access_count: 3,
      status: 'active'
    },
    {
      id: '660e8400-e29b-41d4-a716-446655440002',
      file_id: 'file_sample_3_admin_report.xlsx',
      filename: 'monthly_report_december_2024.xlsx',
      original_name: 'December 2024 Hospital Statistics Report.xlsx',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1048576, // 1MB
      checksum: 'ghi789jkl012mno345pqr678stu901vwx234yz567890abc123def456',
      checksum_algorithm: 'sha256',
      encoding: 'binary',
      provider: 'local',
      provider_path: '/storage/admin/2024/12/monthly_report_december.xlsx',
      provider_metadata: JSON.stringify({
        directory: '/storage/admin/2024/12',
        permissions: '640'
      }),
      data_classification: 'internal',
      encrypted: false,
      tags: JSON.stringify(['admin', 'report', 'statistics', 'monthly']),
      custom_metadata: JSON.stringify({
        reportType: 'monthly-statistics',
        departmentId: 'administration',
        reportPeriod: '2024-12',
        generatedBy: 'system'
      }),
      created_by: adminUser.id,
      updated_by: adminUser.id,
      created_at: new Date('2024-12-28T16:45:00Z'),
      updated_at: new Date('2024-12-28T16:45:00Z'),
      last_accessed_at: new Date('2024-12-29T08:00:00Z'),
      access_count: 2,
      status: 'active'
    }
  ]

  await knex('storage_files').insert(sampleFiles)

  // Create sample storage operations (audit logs)
  const sampleOperations = [
    {
      id: '770e8400-e29b-41d4-a716-446655440000',
      file_id: sampleFiles[0].id,
      operation: 'upload',
      status: 'success',
      provider: 'local',
      bytes_transferred: 2048576,
      duration_ms: 1250,
      client_ip: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      user_id: managerUser.id,
      session_id: 'sess_doctor_001',
      correlation_id: 'corr_upload_001',
      purpose: 'Upload patient medical record',
      metadata: JSON.stringify({
        fileType: 'patient-record',
        department: 'cardiology',
        priority: 'high'
      }),
      created_at: new Date('2024-12-01T10:00:00Z')
    },
    {
      id: '770e8400-e29b-41d4-a716-446655440001',
      file_id: sampleFiles[0].id,
      operation: 'download',
      status: 'success',
      provider: 'local',
      bytes_transferred: 2048576,
      duration_ms: 850,
      client_ip: '192.168.1.101',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      user_id: testUser.id,
      session_id: 'sess_nurse_001',
      correlation_id: 'corr_download_001',
      purpose: 'Access patient record for treatment planning',
      metadata: JSON.stringify({
        accessReason: 'treatment-planning',
        department: 'nursing'
      }),
      created_at: new Date('2024-12-29T14:30:00Z')
    },
    {
      id: '770e8400-e29b-41d4-a716-446655440002',
      file_id: sampleFiles[1].id,
      operation: 'upload',
      status: 'success',
      provider: 'minio',
      bytes_transferred: 5242880,
      duration_ms: 3200,
      client_ip: '192.168.1.102',
      user_agent: 'Medical Imaging Client v2.1.0',
      user_id: managerUser.id,
      session_id: 'sess_doctor_002',
      correlation_id: 'corr_upload_002',
      purpose: 'Upload X-ray imaging results',
      metadata: JSON.stringify({
        imagingType: 'x-ray',
        equipment: 'GE Discovery XR656',
        technician: 'tech001'
      }),
      created_at: new Date('2024-12-15T14:20:00Z')
    }
  ]

  await knex('storage_operations').insert(sampleOperations)

  // Create sample file shares
  const sampleShares = [
    {
      id: '880e8400-e29b-41d4-a716-446655440000',
      file_id: sampleFiles[0].id, // Patient record
      shared_by: managerUser.id,
      shared_with: testUser.id,
      can_read: true,
      can_write: false,
      can_delete: false,
      can_share: false,
      expires_at: new Date('2024-12-31T23:59:59Z'),
      requires_password: false,
      max_downloads: 10,
      download_count: 1,
      is_active: true,
      created_at: new Date('2024-12-01T10:05:00Z'),
      updated_at: new Date('2024-12-01T10:05:00Z'),
      last_accessed_at: new Date('2024-12-29T14:30:00Z')
    },
    {
      id: '880e8400-e29b-41d4-a716-446655440001',
      file_id: sampleFiles[2].id, // Admin report
      shared_by: adminUser.id,
      shared_with: managerUser.id,
      can_read: true,
      can_write: false,
      can_delete: false,
      can_share: true,
      expires_at: new Date('2025-01-31T23:59:59Z'),
      requires_password: false,
      max_downloads: null, // Unlimited
      download_count: 0,
      is_active: true,
      created_at: new Date('2024-12-28T16:50:00Z'),
      updated_at: new Date('2024-12-28T16:50:00Z'),
      last_accessed_at: null
    }
  ]

  await knex('storage_file_shares').insert(sampleShares)

  // Update quotas with usage from sample files
  await knex('storage_quotas')
    .where('user_id', managerUser.id)
    .update({
      used_storage_bytes: 7340032, // Patient record + X-ray image
      used_files: 2,
      last_calculated_at: new Date()
    })

  await knex('storage_quotas')
    .where('user_id', adminUser.id)
    .update({
      used_storage_bytes: 1048576, // Admin report
      used_files: 1,
      last_calculated_at: new Date()
    })

  console.log('✅ Storage seed data created successfully')
  console.log('   - Created storage quotas for 3 users')
  console.log('   - Created 3 sample files (patient record, X-ray, admin report)')
  console.log('   - Created 3 operation logs')
  console.log('   - Created 2 file shares')
  console.log('   - Updated quota usage for users')
}