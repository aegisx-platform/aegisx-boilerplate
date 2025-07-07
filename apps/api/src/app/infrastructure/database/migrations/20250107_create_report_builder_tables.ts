/**
 * Report Builder System Database Migration
 * 
 * Creates tables for comprehensive low-code report builder system including:
 * - Report templates with metadata and versioning
 * - Data source connections and configuration
 * - Report parameters with validation rules
 * - Report instances and generation history
 * - Report scheduling and automation
 * - Report exports and file management
 * - Report sharing and permissions
 * - Report analytics and usage tracking
 */

export async function up(knex: any): Promise<void> {
  // Create report_data_sources table for data connections
  await knex.schema.createTable('report_data_sources', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name', 255).notNullable()
    table.text('description').nullable()
    table.enu('type', ['database', 'api', 'file', 'static']).notNullable()
    
    // Connection configuration (encrypted)
    table.text('connection_config').notNullable() // JSON encrypted string
    table.string('connection_string', 1000).nullable() // For database connections
    table.text('headers').nullable() // JSON for API headers
    table.text('auth_config').nullable() // JSON for authentication
    
    // Data source settings
    table.boolean('is_active').notNullable().defaultTo(true)
    table.boolean('requires_auth').notNullable().defaultTo(false)
    table.integer('timeout_seconds').notNullable().defaultTo(30)
    table.integer('max_rows').notNullable().defaultTo(10000)
    
    // Security and access
    table.enu('data_classification', ['public', 'internal', 'confidential', 'restricted']).notNullable().defaultTo('internal')
    table.text('allowed_tables').nullable() // JSON array for database restrictions
    table.text('allowed_endpoints').nullable() // JSON array for API restrictions
    
    // Audit and tracking
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('last_tested_at', { useTz: true }).nullable()
    table.text('last_test_result').nullable() // JSON for test results
    
    // Indexes
    table.index(['type', 'is_active'])
    table.index(['created_by'])
    table.index(['data_classification'])
    table.index('created_at')
  })

  // Create report_templates table for report definitions
  await knex.schema.createTable('report_templates', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.string('name', 255).notNullable()
    table.text('description').nullable()
    table.string('slug', 255).notNullable().unique() // URL-friendly identifier
    
    // Template configuration
    table.enu('type', ['table', 'chart', 'dashboard', 'document', 'custom']).notNullable()
    table.enu('format', ['html', 'pdf', 'excel', 'csv', 'json', 'image']).notNullable().defaultTo('html')
    table.text('template_config').notNullable() // JSON template definition
    table.text('style_config').nullable() // JSON for styling
    table.text('layout_config').nullable() // JSON for layout settings
    
    // Data source association
    table.uuid('data_source_id').nullable().references('id').inTable('report_data_sources').onDelete('SET NULL')
    table.text('query_template').nullable() // SQL or API query template
    table.text('data_transform').nullable() // JSON for data transformation rules
    
    // Template settings
    table.boolean('is_public').notNullable().defaultTo(false)
    table.boolean('is_active').notNullable().defaultTo(true)
    table.boolean('requires_auth').notNullable().defaultTo(true)
    table.boolean('cache_enabled').notNullable().defaultTo(true)
    table.integer('cache_duration_minutes').notNullable().defaultTo(60)
    
    // Access control
    table.enu('access_level', ['private', 'shared', 'organization', 'public']).notNullable().defaultTo('private')
    table.text('allowed_roles').nullable() // JSON array of role IDs
    table.text('allowed_users').nullable() // JSON array of user IDs
    
    // Versioning
    table.integer('version').notNullable().defaultTo(1)
    table.uuid('parent_template_id').nullable().references('id').inTable('report_templates').onDelete('CASCADE')
    table.boolean('is_current_version').notNullable().defaultTo(true)
    
    // Audit and tracking
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('last_used_at', { useTz: true }).nullable()
    table.integer('usage_count').notNullable().defaultTo(0)
    
    // Performance indexes
    table.index(['slug'])
    table.index(['type', 'is_active'])
    table.index(['is_public', 'is_active'])
    table.index(['created_by', 'is_active'])
    table.index(['data_source_id'])
    table.index(['parent_template_id', 'is_current_version'])
    table.index(['access_level', 'is_active'])
    table.index('created_at')
  })

  // Create report_parameters table for template parameters
  await knex.schema.createTable('report_parameters', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('template_id').notNullable().references('id').inTable('report_templates').onDelete('CASCADE')
    
    // Parameter definition
    table.string('name', 255).notNullable() // Parameter name in template
    table.string('label', 255).notNullable() // Display label
    table.text('description').nullable()
    table.enu('type', ['string', 'number', 'boolean', 'date', 'datetime', 'array', 'select']).notNullable()
    table.enu('input_type', ['text', 'number', 'checkbox', 'date', 'datetime', 'select', 'multiselect', 'textarea']).notNullable()
    
    // Validation rules
    table.boolean('is_required').notNullable().defaultTo(false)
    table.text('default_value').nullable() // JSON value
    table.text('validation_rules').nullable() // JSON validation rules
    table.text('options').nullable() // JSON array for select options
    table.string('placeholder', 255).nullable()
    
    // Parameter behavior
    table.integer('sort_order').notNullable().defaultTo(0)
    table.boolean('is_visible').notNullable().defaultTo(true)
    table.boolean('is_filterable').notNullable().defaultTo(true)
    table.string('group_name', 255).nullable() // For parameter grouping
    
    // Constraints
    table.unique(['template_id', 'name'])
    table.index(['template_id', 'sort_order'])
    table.index(['template_id', 'is_visible'])
  })

  // Create report_instances table for generated reports
  await knex.schema.createTable('report_instances', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('template_id').notNullable().references('id').inTable('report_templates').onDelete('CASCADE')
    
    // Generation context
    table.text('parameters').notNullable() // JSON parameters used
    table.text('generated_data').nullable() // JSON result data (for caching)
    table.text('generated_html').nullable() // Generated HTML content
    table.integer('data_row_count').nullable()
    table.bigInteger('data_size_bytes').nullable()
    
    // Generation status
    table.enu('status', ['pending', 'generating', 'completed', 'failed', 'cached']).notNullable().defaultTo('pending')
    table.text('error_message').nullable()
    table.text('error_details').nullable() // JSON error information
    table.integer('generation_duration_ms').nullable()
    
    // Cache settings
    table.boolean('is_cached').notNullable().defaultTo(false)
    table.timestamp('cache_expires_at', { useTz: true }).nullable()
    table.string('cache_key', 255).nullable()
    
    // Access tracking
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')
    table.string('client_ip', 45).nullable()
    table.string('user_agent', 500).nullable()
    table.string('session_id', 255).nullable()
    table.string('correlation_id', 255).nullable()
    
    // Timestamps
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('completed_at', { useTz: true }).nullable()
    table.timestamp('last_accessed_at', { useTz: true }).nullable()
    table.integer('access_count').notNullable().defaultTo(0)
    
    // Indexes
    table.index(['template_id', 'status'])
    table.index(['template_id', 'created_at'])
    table.index(['status', 'cache_expires_at'])
    table.index(['created_by', 'created_at'])
    table.index(['cache_key'])
    table.index('created_at')
  })

  // Create report_schedules table for automated report generation
  await knex.schema.createTable('report_schedules', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('template_id').notNullable().references('id').inTable('report_templates').onDelete('CASCADE')
    table.string('name', 255).notNullable()
    table.text('description').nullable()
    
    // Schedule configuration
    table.string('cron_expression', 255).notNullable() // Cron format
    table.text('parameters').notNullable() // JSON default parameters
    table.enu('output_format', ['html', 'pdf', 'excel', 'csv', 'json']).notNullable().defaultTo('pdf')
    
    // Delivery settings
    table.text('delivery_config').nullable() // JSON delivery configuration
    table.text('recipients').nullable() // JSON array of email addresses
    table.boolean('store_result').notNullable().defaultTo(true)
    table.integer('retention_days').notNullable().defaultTo(30)
    
    // Schedule status
    table.boolean('is_active').notNullable().defaultTo(true)
    table.timestamp('next_run_at', { useTz: true }).nullable()
    table.timestamp('last_run_at', { useTz: true }).nullable()
    table.enu('last_run_status', ['success', 'failed', 'pending']).nullable()
    table.text('last_run_error').nullable()
    table.integer('consecutive_failures').notNullable().defaultTo(0)
    
    // Audit tracking
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('updated_by').nullable().references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now())
    
    // Indexes
    table.index(['template_id', 'is_active'])
    table.index(['is_active', 'next_run_at'])
    table.index(['created_by'])
    table.index('next_run_at')
  })

  // Create report_exports table for export history and file tracking
  await knex.schema.createTable('report_exports', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('instance_id').notNullable().references('id').inTable('report_instances').onDelete('CASCADE')
    table.uuid('template_id').notNullable().references('id').inTable('report_templates').onDelete('CASCADE')
    
    // Export configuration
    table.enu('format', ['pdf', 'excel', 'csv', 'json', 'png', 'jpeg']).notNullable()
    table.text('export_config').nullable() // JSON export options
    table.bigInteger('file_size_bytes').nullable()
    table.string('file_name', 255).nullable()
    
    // File storage integration
    table.string('storage_file_id', 255).nullable().references('file_id').inTable('storage_files').onDelete('SET NULL')
    table.string('download_url', 1000).nullable()
    table.timestamp('url_expires_at', { useTz: true }).nullable()
    
    // Export status
    table.enu('status', ['pending', 'processing', 'completed', 'failed']).notNullable().defaultTo('pending')
    table.text('error_message').nullable()
    table.integer('export_duration_ms').nullable()
    
    // Access tracking
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL')
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('completed_at', { useTz: true }).nullable()
    table.timestamp('last_downloaded_at', { useTz: true }).nullable()
    table.integer('download_count').notNullable().defaultTo(0)
    
    // Indexes
    table.index(['instance_id', 'format'])
    table.index(['template_id', 'created_at'])
    table.index(['created_by', 'created_at'])
    table.index(['status', 'created_at'])
    table.index('storage_file_id')
  })

  // Create report_shares table for report sharing and permissions
  await knex.schema.createTable('report_shares', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('template_id').notNullable().references('id').inTable('report_templates').onDelete('CASCADE')
    table.uuid('shared_by').notNullable().references('id').inTable('users').onDelete('CASCADE')
    
    // Share target (user or public)
    table.uuid('shared_with').nullable().references('id').inTable('users').onDelete('CASCADE')
    table.boolean('is_public').notNullable().defaultTo(false)
    table.string('public_token', 255).nullable().unique() // For public access
    
    // Share permissions
    table.boolean('can_view').notNullable().defaultTo(true)
    table.boolean('can_export').notNullable().defaultTo(false)
    table.boolean('can_schedule').notNullable().defaultTo(false)
    table.boolean('can_share').notNullable().defaultTo(false)
    table.text('allowed_formats').nullable() // JSON array of allowed export formats
    
    // Share settings
    table.text('parameter_overrides').nullable() // JSON parameter restrictions/defaults
    table.timestamp('expires_at', { useTz: true }).nullable()
    table.integer('max_uses').nullable()
    table.integer('use_count').notNullable().defaultTo(0)
    table.boolean('requires_password').notNullable().defaultTo(false)
    table.string('password_hash', 255).nullable()
    
    // Status tracking
    table.boolean('is_active').notNullable().defaultTo(true)
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now())
    table.timestamp('last_accessed_at', { useTz: true }).nullable()
    
    // Constraints
    table.unique(['template_id', 'shared_with'])
    table.index(['template_id', 'is_active'])
    table.index(['shared_with', 'is_active'])
    table.index(['shared_by'])
    table.index(['public_token'])
    table.index(['expires_at'])
  })

  // Create report_analytics table for usage tracking and performance metrics
  await knex.schema.createTable('report_analytics', (table: any) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('template_id').nullable().references('id').inTable('report_templates').onDelete('CASCADE')
    table.uuid('instance_id').nullable().references('id').inTable('report_instances').onDelete('CASCADE')
    
    // Event tracking
    table.enu('event_type', ['view', 'generate', 'export', 'share', 'schedule', 'error']).notNullable()
    table.string('event_category', 100).notNullable() // 'performance', 'usage', 'error'
    table.text('event_data').nullable() // JSON event details
    
    // Performance metrics
    table.integer('duration_ms').nullable()
    table.integer('data_rows').nullable()
    table.bigInteger('data_size_bytes').nullable()
    table.integer('cache_hit').nullable() // 1 for hit, 0 for miss
    
    // User context
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL')
    table.string('session_id', 255).nullable()
    table.string('client_ip', 45).nullable()
    table.string('user_agent', 500).nullable()
    table.string('referrer', 1000).nullable()
    
    // Error tracking
    table.string('error_code', 100).nullable()
    table.text('error_message').nullable()
    table.text('error_stack').nullable()
    
    // Timestamp and correlation
    table.string('correlation_id', 255).nullable()
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now())
    
    // Indexes
    table.index(['template_id', 'event_type', 'created_at'])
    table.index(['event_type', 'created_at'])
    table.index(['user_id', 'created_at'])
    table.index(['event_category', 'created_at'])
    table.index('correlation_id')
    table.index('created_at')
  })

  console.log('✅ Report builder tables created successfully')
}

export async function down(knex: any): Promise<void> {
  // Drop tables in reverse order due to foreign key constraints
  await knex.schema.dropTableIfExists('report_analytics')
  await knex.schema.dropTableIfExists('report_shares')
  await knex.schema.dropTableIfExists('report_exports')
  await knex.schema.dropTableIfExists('report_schedules')
  await knex.schema.dropTableIfExists('report_instances')
  await knex.schema.dropTableIfExists('report_parameters')
  await knex.schema.dropTableIfExists('report_templates')
  await knex.schema.dropTableIfExists('report_data_sources')
  
  console.log('✅ Report builder tables dropped successfully')
}