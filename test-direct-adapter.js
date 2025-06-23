// Test script สำหรับทดสอบ Direct Adapter กับ Integrity System
const knex = require('knex')(require('./knexfile').default);

async function testDirectAdapter() {
  console.log('=== TESTING DIRECT ADAPTER WITH INTEGRITY ===\n');

  try {
    // 1. ตรวจสอบสถานะปัจจุบัน
    console.log('1. Checking current audit logs status...');
    const totalLogs = await knex('audit_logs').count('* as count');
    const logsWithIntegrity = await knex('audit_logs')
      .whereNotNull('data_hash')
      .count('* as count');

    console.log(`   Total audit logs: ${totalLogs[0].count}`);
    console.log(`   Logs with integrity data: ${logsWithIntegrity[0].count}`);

    // 2. ตรวจสอบ configuration
    console.log('\n2. Current configuration:');
    console.log(`   AUDIT_ENABLED: ${process.env.AUDIT_ENABLED || 'not set'}`);
    console.log(`   AUDIT_INTEGRITY_ENABLED: ${process.env.AUDIT_INTEGRITY_ENABLED || 'not set'}`);
    console.log(`   AUDIT_ADAPTER: ${process.env.AUDIT_ADAPTER || 'not set'}`);

    // 3. ตรวจสอบ sample records
    console.log('\n3. Sample audit logs:');
    const sampleLogs = await knex('audit_logs')
      .select([
        'id', 'action', 'resource_type', 'status', 'created_at',
        'data_hash', 'chain_hash', 'sequence_number', 'integrity_verified'
      ])
      .orderBy('created_at', 'desc')
      .limit(3);

    sampleLogs.forEach((log, idx) => {
      console.log(`\n   Record ${idx + 1}:`);
      console.log(`     ID: ${log.id}`);
      console.log(`     Action: ${log.action} on ${log.resource_type}`);
      console.log(`     Status: ${log.status}`);
      console.log(`     Created: ${log.created_at}`);
      console.log(`     Data Hash: ${log.data_hash || 'NULL'}`);
      console.log(`     Chain Hash: ${log.chain_hash || 'NULL'}`);
      console.log(`     Sequence: ${log.sequence_number || 'NULL'}`);
      console.log(`     Verified: ${log.integrity_verified}`);
    });

    // 4. แนะนำการแก้ไข
    console.log('\n4. Recommendations:');
    if (process.env.AUDIT_ADAPTER !== 'direct') {
      console.log('   ❌ Set AUDIT_ADAPTER=direct in .env file');
    } else {
      console.log('   ✅ AUDIT_ADAPTER is set to direct');
    }

    if (process.env.AUDIT_INTEGRITY_ENABLED !== 'true') {
      console.log('   ❌ Set AUDIT_INTEGRITY_ENABLED=true in .env file');
    } else {
      console.log('   ✅ AUDIT_INTEGRITY_ENABLED is set to true');
    }

    if (logsWithIntegrity[0].count === '0') {
      console.log('   ❌ No integrity data found - restart API server after fixing .env');
      console.log('   📝 Create .env file from .env.example and set correct values');
    }

    console.log('\n5. Next steps:');
    console.log('   1. Copy .env.example to .env');
    console.log('   2. Set AUDIT_ADAPTER=direct');
    console.log('   3. Set AUDIT_INTEGRITY_ENABLED=true');
    console.log('   4. Restart API server');
    console.log('   5. Make some API calls to generate new audit logs');
    console.log('   6. Run this script again to verify integrity data');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await knex.destroy();
  }
}

testDirectAdapter().catch(console.error);