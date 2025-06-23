const Knex = require('knex');
const config = require('./knexfile.ts').default;

async function testIntegritySystem() {
  const knex = Knex(config);
  
  try {
    console.log('🔍 Testing audit integrity system...\n');
    
    // Check current environment settings
    console.log('📋 Environment configuration:');
    console.log(`  AUDIT_ENABLED: ${process.env.AUDIT_ENABLED}`);
    console.log(`  AUDIT_INTEGRITY_ENABLED: ${process.env.AUDIT_INTEGRITY_ENABLED}`);
    console.log(`  AUDIT_ADAPTER: ${process.env.AUDIT_ADAPTER}`);
    
    // Test if we can insert a test record with integrity fields
    const testRecord = {
      action: 'TEST',
      resource_type: 'integrity_test',
      resource_id: 'test-123',
      status: 'success',
      data_hash: 'test-hash-123',
      chain_hash: 'test-chain-hash-123',
      sequence_number: 999999,
      integrity_verified: true,
      created_at: new Date()
    };
    
    console.log('\n🧪 Inserting test integrity record...');
    const [insertedId] = await knex('audit_logs')
      .insert(testRecord)
      .returning('id');
    
    console.log(`✅ Test record inserted with ID: ${insertedId.id}`);
    
    // Check if the test record has integrity data
    const testRecordCheck = await knex('audit_logs')
      .select('*')
      .where('id', insertedId.id)
      .first();
    
    console.log('\n🔍 Test record integrity fields:');
    console.log(`  data_hash: ${testRecordCheck.data_hash}`);
    console.log(`  chain_hash: ${testRecordCheck.chain_hash}`);
    console.log(`  sequence_number: ${testRecordCheck.sequence_number}`);
    console.log(`  integrity_verified: ${testRecordCheck.integrity_verified}`);
    
    // Clean up test record
    await knex('audit_logs').where('id', insertedId.id).del();
    console.log('🧹 Test record cleaned up');
    
    // Check existing records for integrity patterns
    const integrityStats = await knex('audit_logs')
      .select(
        knex.raw('COUNT(*) as total'),
        knex.raw('COUNT(data_hash) as with_hash'),
        knex.raw('COUNT(sequence_number) as with_sequence'),
        knex.raw('COUNT(digital_signature) as with_signature'),
        knex.raw('MAX(sequence_number) as max_sequence')
      )
      .first();
    
    console.log('\n📊 Existing records integrity analysis:');
    console.log(`  Total records: ${integrityStats.total}`);
    console.log(`  Records with data_hash: ${integrityStats.with_hash}`);
    console.log(`  Records with sequence_number: ${integrityStats.with_sequence}`);
    console.log(`  Records with digital_signature: ${integrityStats.with_signature}`);
    console.log(`  Max sequence number: ${integrityStats.max_sequence || 'none'}`);
    
    // Show why integrity is not working
    const hasIntegrityColumns = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      AND column_name IN ('data_hash', 'chain_hash', 'sequence_number', 'digital_signature')
    `);
    
    console.log('\n🏗️ Integrity columns available:');
    hasIntegrityColumns.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name}`);
    });
    
    console.log('\n💡 Analysis:');
    if (integrityStats.with_hash === '0') {
      console.log('  ❌ No records have integrity data (data_hash is null)');
      console.log('  📝 This suggests the integrity system is not enabled or not working');
      console.log('  🔧 Check AUDIT_INTEGRITY_ENABLED setting in .env file');
    } else {
      console.log('  ✅ Some records have integrity data');
    }
    
  } catch (error) {
    console.error('❌ Error testing integrity system:', error.message);
  } finally {
    await knex.destroy();
  }
}

testIntegritySystem().then(() => {
  console.log('\n✅ Integrity test complete');
}).catch(console.error);