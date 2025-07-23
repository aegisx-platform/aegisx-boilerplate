import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. สร้างตาราง system_configurations (หลัก)
  await knex.schema.createTable('system_configurations', (table) => {
    table.bigIncrements('id').primary();
    table.string('category', 50).notNullable().comment('หมวดหมู่ config เช่น smtp, database, redis');
    table.string('config_key', 100).notNullable().comment('คีย์ config เช่น host, port, username');
    table.text('config_value').comment('ค่าที่ตั้ง');
    table.string('value_type', 20).defaultTo('string').comment('ประเภทข้อมูล: string, number, boolean, json');
    table.boolean('is_encrypted').defaultTo(false).comment('เข้ารหัสหรือไม่ สำหรับ password/secret');
    table.boolean('is_active').defaultTo(true).comment('เปิด/ปิดใช้งาน');
    table.string('environment', 20).defaultTo('development').comment('สภาพแวดล้อม: development, production, staging');
    table.uuid('updated_by').nullable().comment('ผู้ที่แก้ไขล่าสุด');
    table.timestamps(true, true); // created_at, updated_at
    
    // Indexes
    table.index(['category', 'environment'], 'idx_system_configurations_category_env');
    table.index(['category', 'config_key'], 'idx_system_configurations_category_key');
    table.index(['is_active'], 'idx_system_configurations_active');
    
    // Unique constraint
    table.unique(['category', 'config_key', 'environment'], 'unq_system_configurations_category_key_env');
    
    // Foreign key constraint (assuming users table exists)
    table.foreign('updated_by').references('id').inTable('users').onDelete('SET NULL');
  });

  // 2. สร้างตาราง configuration_metadata (เมตาดาต้า)
  await knex.schema.createTable('configuration_metadata', (table) => {
    table.bigIncrements('id').primary();
    table.string('category', 50).notNullable().comment('หมวดหมู่ config');
    table.string('config_key', 100).notNullable().comment('คีย์ config');
    table.string('display_name', 200).notNullable().comment('ชื่อที่แสดงใน UI');
    table.text('description').comment('คำอธิบาย');
    table.string('input_type', 20).defaultTo('text').comment('ประเภท input: text, password, number, select, textarea');
    table.jsonb('validation_rules').comment('กฎการตรวจสอบ JSON format');
    table.text('default_value').comment('ค่าเริ่มต้น');
    table.boolean('is_required').defaultTo(false).comment('บังคับกรอกหรือไม่');
    table.integer('sort_order').defaultTo(0).comment('ลำดับการแสดงผล');
    table.string('group_name', 100).comment('จัดกลุ่มใน UI');
    table.text('help_text').comment('ข้อความช่วยเหลือ');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['category'], 'idx_configuration_metadata_category');
    table.index(['category', 'group_name'], 'idx_configuration_metadata_category_group');
    table.index(['sort_order'], 'idx_configuration_metadata_sort_order');
    
    // Unique constraint
    table.unique(['category', 'config_key'], 'unq_configuration_metadata_category_key');
  });

  // 3. สร้างตาราง configuration_history (ประวัติ)
  await knex.schema.createTable('configuration_history', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('config_id').unsigned().notNullable().comment('อ้างอิงไปยัง system_configurations');
    table.text('old_value').comment('ค่าเก่า');
    table.text('new_value').comment('ค่าใหม่');
    table.uuid('changed_by').nullable().comment('ผู้ที่เปลี่ยนแปลง');
    table.text('change_reason').comment('เหตุผลในการเปลี่ยนแปลง');
    table.specificType('ip_address', 'INET').comment('IP address ที่เปลี่ยน');
    table.text('user_agent').comment('Browser/client information');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['config_id'], 'idx_configuration_history_config_id');
    table.index(['changed_by'], 'idx_configuration_history_changed_by');
    table.index(['created_at'], 'idx_configuration_history_created_at');
    
    // Foreign key constraints
    table.foreign('config_id').references('id').inTable('system_configurations').onDelete('CASCADE');
    table.foreign('changed_by').references('id').inTable('users').onDelete('SET NULL');
  });

  // 4. สร้างตาราง configuration_templates (Templates)
  await knex.schema.createTable('configuration_templates', (table) => {
    table.bigIncrements('id').primary();
    table.string('category', 50).notNullable().comment('หมวดหมู่ config');
    table.string('template_name', 100).notNullable().comment('ชื่อ template เช่น gmail, sendgrid, custom');
    table.string('display_name', 200).notNullable().comment('ชื่อที่แสดง เช่น Gmail SMTP, SendGrid API');
    table.text('description').comment('คำอธิบาย template');
    table.jsonb('template_config').notNullable().comment('การตั้งค่า template ในรูปแบบ JSON');
    table.boolean('is_active').defaultTo(true).comment('เปิด/ปิดใช้งาน template');
    table.integer('sort_order').defaultTo(0).comment('ลำดับการแสดงผล');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['category'], 'idx_configuration_templates_category');
    table.index(['category', 'is_active'], 'idx_configuration_templates_category_active');
    table.index(['sort_order'], 'idx_configuration_templates_sort_order');
    
    // Unique constraint
    table.unique(['category', 'template_name'], 'unq_configuration_templates_category_name');
  });
}

export async function down(knex: Knex): Promise<void> {
  // ลบตารางในลำดับที่ถูกต้อง (ต้องลบ foreign key dependent tables ก่อน)
  await knex.schema.dropTableIfExists('configuration_history');
  await knex.schema.dropTableIfExists('configuration_templates');
  await knex.schema.dropTableIfExists('configuration_metadata');
  await knex.schema.dropTableIfExists('system_configurations');
}