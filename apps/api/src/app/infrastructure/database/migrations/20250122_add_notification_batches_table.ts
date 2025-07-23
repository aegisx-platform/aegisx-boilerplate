import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create notification_batches table for tracking batch operations
  await knex.schema.createTable('notification_batches', (table) => {
    table.string('id').primary().comment('Unique batch identifier');
    table.string('status').notNullable().defaultTo('created').comment('Batch status: created, queued, processing, completed, failed, cancelled');
    table.text('metadata').comment('JSON metadata including processing options, type, etc.');
    table.integer('total_count').defaultTo(0).comment('Total number of notifications in batch');
    table.integer('success_count').defaultTo(0).comment('Number of successfully processed notifications');
    table.integer('failed_count').defaultTo(0).comment('Number of failed notifications');
    table.integer('cancelled_count').defaultTo(0).comment('Number of cancelled notifications');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('When the batch was created');
    table.timestamp('started_at').nullable().comment('When batch processing started');
    table.timestamp('completed_at').nullable().comment('When batch processing completed');
    table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('Last update timestamp');

    // Indexes for efficient querying
    table.index('status', 'idx_notification_batches_status');
    table.index('created_at', 'idx_notification_batches_created_at');
    table.index(['status', 'created_at'], 'idx_notification_batches_status_created');
  });

  // Create batch_notifications junction table to track which notifications belong to which batch
  await knex.schema.createTable('batch_notifications', (table) => {
    table.string('batch_id').notNullable().comment('Reference to notification_batches.id');
    table.string('notification_id').notNullable().comment('Reference to notifications.id');
    table.string('processing_status').defaultTo('pending').comment('Status of this notification within the batch');
    table.timestamp('processed_at').nullable().comment('When this notification was processed');
    table.text('error_message').nullable().comment('Error message if processing failed');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Composite primary key
    table.primary(['batch_id', 'notification_id']);

    // Foreign key constraints
    table.foreign('batch_id').references('id').inTable('notification_batches').onDelete('CASCADE');
    table.foreign('notification_id').references('id').inTable('notifications').onDelete('CASCADE');

    // Indexes
    table.index('batch_id', 'idx_batch_notifications_batch_id');
    table.index('notification_id', 'idx_batch_notifications_notification_id');
    table.index('processing_status', 'idx_batch_notifications_status');
  });

  console.log('✅ Created notification_batches and batch_notifications tables');
}

export async function down(knex: Knex): Promise<void> {
  // Drop in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('batch_notifications');
  await knex.schema.dropTableIfExists('notification_batches');

  console.log('❌ Dropped notification_batches and batch_notifications tables');
}