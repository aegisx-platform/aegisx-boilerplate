import * as Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Notifications table - เก็บข้อมูลการแจ้งเตือนหลัก
  await knex.schema.createTable('notifications', (table) => {
    table.string('id', 50).primary();
    table.string('type', 50).notNullable().index(); // appointment-reminder, lab-results, etc.
    table.string('channel', 20).notNullable().index(); // email, sms, push, slack, webhook, in-app
    table.string('status', 20).notNullable().default('queued').index(); // queued, processing, sent, delivered, failed, cancelled
    table.string('priority', 20).notNullable().default('normal').index(); // critical, urgent, high, normal, low
    
    // Recipient information
    table.string('recipient_id', 50).nullable();
    table.string('recipient_email', 255).nullable();
    table.string('recipient_phone', 20).nullable();
    table.string('recipient_device_token', 255).nullable();
    table.string('recipient_slack_user_id', 50).nullable();
    table.string('recipient_slack_channel', 100).nullable();
    table.string('recipient_webhook_url', 500).nullable();
    
    // Content
    table.string('subject', 255).nullable();
    table.text('content_text').nullable();
    table.text('content_html').nullable();
    table.string('template_name', 100).nullable();
    table.json('template_data').nullable();
    
    // Metadata
    table.json('metadata').nullable(); // รวม healthcare metadata
    table.json('tags').nullable();
    
    // Tracking
    table.integer('attempts').defaultTo(0);
    table.integer('max_attempts').defaultTo(3);
    table.timestamp('scheduled_at').nullable();
    table.timestamp('sent_at').nullable();
    table.timestamp('delivered_at').nullable();
    table.timestamp('failed_at').nullable();
    
    // Audit fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.string('created_by', 50).nullable();
    
    // Indexes for performance
    table.index(['status', 'priority', 'created_at']); // สำหรับคิว
    table.index(['recipient_email', 'created_at']); // ค้นหาตาม email
    table.index(['type', 'created_at']); // ค้นหาตามประเภท
    table.index(['scheduled_at'], 'idx_notifications_scheduled'); // สำหรับ scheduled notifications
  });

  // Notification errors table - เก็บข้อมูล error
  await knex.schema.createTable('notification_errors', (table) => {
    table.increments('id').primary();
    table.string('notification_id', 50).notNullable();
    table.string('channel', 20).notNullable();
    table.text('error_message').notNullable();
    table.string('error_code', 50).nullable();
    table.boolean('retryable').defaultTo(true);
    table.timestamp('occurred_at').defaultTo(knex.fn.now());
    
    table.foreign('notification_id').references('id').inTable('notifications').onDelete('CASCADE');
    table.index(['notification_id', 'occurred_at']);
  });

  // Notification templates table - เก็บ template
  await knex.schema.createTable('notification_templates', (table) => {
    table.string('id', 50).primary();
    table.string('name', 100).notNullable().unique();
    table.string('type', 50).notNullable(); // appointment-reminder, lab-results, etc.
    table.json('channels').notNullable(); // array ของ channels ที่รองรับ
    table.string('subject', 255).notNullable();
    table.text('content_text').notNullable();
    table.text('content_html').nullable();
    table.json('variables').nullable(); // รายการตัวแปรที่ใช้ใน template
    table.string('version', 10).defaultTo('1.0');
    table.boolean('active').defaultTo(true);
    
    // Audit fields
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.string('created_by', 50).nullable();
    
    table.index(['type', 'active']);
    table.index(['name', 'active']);
  });

  // Notification batches table - เก็บข้อมูล batch
  await knex.schema.createTable('notification_batches', (table) => {
    table.string('id', 50).primary();
    table.string('name', 255).nullable();
    table.string('status', 20).notNullable().default('pending'); // pending, processing, completed, failed
    table.integer('total_count').defaultTo(0);
    table.integer('success_count').defaultTo(0);
    table.integer('failure_count').defaultTo(0);
    table.json('errors').nullable();
    
    // Timing
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.string('created_by', 50).nullable();
    
    table.index(['status', 'created_at']);
  });

  // Notification batch items table - เชื่อม batch กับ notifications
  await knex.schema.createTable('notification_batch_items', (table) => {
    table.increments('id').primary();
    table.string('batch_id', 50).notNullable();
    table.string('notification_id', 50).notNullable();
    table.timestamp('added_at').defaultTo(knex.fn.now());
    
    table.foreign('batch_id').references('id').inTable('notification_batches').onDelete('CASCADE');
    table.foreign('notification_id').references('id').inTable('notifications').onDelete('CASCADE');
    table.unique(['batch_id', 'notification_id']);
  });

  // Notification preferences table - ตั้งค่าการแจ้งเตือนของ user
  await knex.schema.createTable('notification_preferences', (table) => {
    table.increments('id').primary();
    table.string('user_id', 50).notNullable();
    table.json('channels').notNullable(); // array ของ channels ที่ต้องการ
    table.string('quiet_hours_start', 5).nullable(); // HH:mm
    table.string('quiet_hours_end', 5).nullable(); // HH:mm
    table.string('timezone', 50).defaultTo('Asia/Bangkok');
    table.boolean('immediate').defaultTo(true);
    table.boolean('digest').defaultTo(false);
    table.string('digest_interval', 20).defaultTo('daily'); // hourly, daily, weekly
    
    // Notification type preferences
    table.json('type_preferences').nullable(); // เลือกประเภทที่ต้องการรับ
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id']);
    table.index(['user_id']);
  });

  // Notification statistics table - เก็บสถิติ
  await knex.schema.createTable('notification_statistics', (table) => {
    table.increments('id').primary();
    table.string('metric_name', 100).notNullable();
    table.string('channel', 20).nullable();
    table.string('type', 50).nullable();
    table.string('priority', 20).nullable();
    table.integer('count').defaultTo(0);
    table.decimal('average_delivery_time', 10, 2).nullable(); // milliseconds
    table.decimal('error_rate', 5, 2).nullable(); // percentage
    table.date('date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['metric_name', 'date']);
    table.index(['channel', 'date']);
    table.index(['type', 'date']);
    table.unique(['metric_name', 'channel', 'type', 'priority', 'date']);
  });

  // Healthcare notifications table - เก็บข้อมูลเฉพาะทางการแพทย์
  await knex.schema.createTable('healthcare_notifications', (table) => {
    table.increments('id').primary();
    table.string('notification_id', 50).notNullable();
    table.string('patient_id', 50).nullable();
    table.string('provider_id', 50).nullable();
    table.string('appointment_id', 50).nullable();
    table.string('facility_id', 50).nullable();
    table.string('department', 100).nullable();
    table.string('urgency', 20).nullable(); // low, medium, high, critical
    table.boolean('hipaa_compliant').defaultTo(true);
    table.boolean('encryption_enabled').defaultTo(false);
    table.string('encryption_algorithm', 50).nullable();
    table.string('encryption_key_id', 100).nullable();
    
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.foreign('notification_id').references('id').inTable('notifications').onDelete('CASCADE');
    table.index(['patient_id', 'created_at']);
    table.index(['provider_id', 'created_at']);
    table.index(['appointment_id']);
    table.index(['urgency', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('healthcare_notifications');
  await knex.schema.dropTableIfExists('notification_statistics');
  await knex.schema.dropTableIfExists('notification_preferences');
  await knex.schema.dropTableIfExists('notification_batch_items');
  await knex.schema.dropTableIfExists('notification_batches');
  await knex.schema.dropTableIfExists('notification_templates');
  await knex.schema.dropTableIfExists('notification_errors');
  await knex.schema.dropTableIfExists('notifications');
}