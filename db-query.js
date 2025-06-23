const Knex = require('knex');
const config = require('./knexfile.ts').default;

async function queryAuditLogs() {
  const knex = Knex(config);
  
  try {
    console.log('🔍 Checking audit_logs table...\n');
    
    // Check if table exists and get structure
    const hasTable = await knex.schema.hasTable('audit_logs');
    console.log(`📋 Table exists: ${hasTable}`);
    
    if (!hasTable) {
      console.log('❌ audit_logs table does not exist!');
      return;
    }
    
    // Get table info
    const columns = await knex.raw(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Table structure:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Check total records
    const totalCount = await knex('audit_logs').count('id as count');
    console.log(`\n📈 Total audit log records: ${totalCount[0].count}`);
    
    // Check recent records
    const recentLogs = await knex('audit_logs')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(5);
    
    console.log(`\n📝 Recent audit logs (last 5):`);
    if (recentLogs.length === 0) {
      console.log('  No audit logs found');
    } else {
      recentLogs.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.action} on ${log.resource_type} by user ${log.user_id || 'unknown'} at ${log.created_at}`);
        console.log(`     Status: ${log.status}, IP: ${log.ip_address || 'unknown'}`);
        if (log.error_message) {
          console.log(`     Error: ${log.error_message}`);
        }
      });
    }
    
    // Check integrity fields
    const integrityCount = await knex('audit_logs')
      .whereNotNull('data_hash')
      .count('id as count');
    
    console.log(`\n🔐 Records with integrity data: ${integrityCount[0].count}`);
    
    // Check by action types
    const actionStats = await knex('audit_logs')
      .select('action')
      .count('id as count')
      .groupBy('action')
      .orderBy('count', 'desc');
    
    console.log('\n📊 Actions breakdown:');
    actionStats.forEach(stat => {
      console.log(`  ${stat.action}: ${stat.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error querying database:', error.message);
  } finally {
    await knex.destroy();
  }
}

queryAuditLogs().then(() => {
  console.log('\n✅ Query complete');
}).catch(console.error);