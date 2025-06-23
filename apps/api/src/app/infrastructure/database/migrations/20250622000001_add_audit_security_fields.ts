import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.alterTable('audit_logs', (table) => {
    // Hash Chain Fields
    table.string('data_hash').nullable(); // SHA-256 hash ของข้อมูล audit
    table.string('previous_hash').nullable(); // Hash ของ record ก่อนหน้า
    table.string('chain_hash').nullable(); // Hash ที่รวม data + previous_hash
    
    // Digital Signature Fields
    table.text('digital_signature').nullable(); // RSA signature ของ data_hash
    table.string('signing_key_id').nullable(); // ID ของ key ที่ใช้เซ็น
    
    // Integrity Verification
    table.boolean('integrity_verified').defaultTo(false); // สถานะการตรวจสอบ
    table.timestamp('last_verified_at').nullable(); // ครั้งสุดท้ายที่ตรวจสอบ
    table.integer('sequence_number').nullable(); // เลขลำดับใน chain
    
    // Add index for chain verification
    table.index('sequence_number');
    table.index('previous_hash');
    table.index('chain_hash');
    table.index(['created_at', 'sequence_number']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.alterTable('audit_logs', (table) => {
    table.dropColumn('data_hash');
    table.dropColumn('previous_hash');
    table.dropColumn('chain_hash');
    table.dropColumn('digital_signature');
    table.dropColumn('signing_key_id');
    table.dropColumn('integrity_verified');
    table.dropColumn('last_verified_at');
    table.dropColumn('sequence_number');
  });
}