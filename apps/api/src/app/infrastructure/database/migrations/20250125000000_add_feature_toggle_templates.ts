import { Knex } from 'knex';

/**
 * Add predefined feature toggle templates
 */
export async function up(knex: Knex): Promise<void> {
  // Insert feature toggle metadata for common patterns
  await knex('configuration_metadata').insert([
    {
      category: 'feature_toggles',
      config_key: 'new_user_dashboard',
      display_name: 'New User Dashboard',
      description: 'Enable the new user dashboard interface',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 1,
      group_name: 'ui_features',
      help_text: 'Toggle between old and new user dashboard',
    },
    {
      category: 'feature_toggles',
      config_key: 'advanced_search',
      display_name: 'Advanced Search',
      description: 'Enable advanced search functionality with filters',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 2,
      group_name: 'search_features',
      help_text: 'Advanced search with filters and sorting options',
    },
    {
      category: 'feature_toggles',
      config_key: 'real_time_notifications',
      display_name: 'Real-time Notifications',
      description: 'Enable real-time push notifications',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 3,
      group_name: 'notification_features',
      help_text: 'Real-time notifications via WebSocket',
    },
    {
      category: 'feature_toggles',
      config_key: 'dark_mode',
      display_name: 'Dark Mode',
      description: 'Enable dark mode theme option',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 4,
      group_name: 'ui_features',
      help_text: 'Allow users to switch to dark theme',
    },
    {
      category: 'feature_toggles',
      config_key: 'api_v2',
      display_name: 'API Version 2',
      description: 'Enable new API version 2 endpoints',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 5,
      group_name: 'api_features',
      help_text: 'New API version with improved performance',
    },
    {
      category: 'feature_toggles',
      config_key: 'mobile_app_integration',
      display_name: 'Mobile App Integration',
      description: 'Enable mobile app specific features',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 6,
      group_name: 'mobile_features',
      help_text: 'Features specific to mobile application',
    },
    {
      category: 'feature_toggles',
      config_key: 'beta_features',
      display_name: 'Beta Features',
      description: 'Enable experimental beta features',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 7,
      group_name: 'experimental',
      help_text: 'Experimental features for testing',
    },
    {
      category: 'feature_toggles',
      config_key: 'analytics_tracking',
      display_name: 'Analytics Tracking',
      description: 'Enable advanced analytics and tracking',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 8,
      group_name: 'analytics',
      help_text: 'Enhanced user behavior tracking',
    },
    {
      category: 'feature_toggles',
      config_key: 'maintenance_mode',
      display_name: 'Maintenance Mode',
      description: 'Enable maintenance mode banner',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 9,
      group_name: 'system',
      help_text: 'Show maintenance mode message to users',
    },
    {
      category: 'feature_toggles',
      config_key: 'two_factor_auth',
      display_name: 'Two-Factor Authentication',
      description: 'Enable two-factor authentication',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 10,
      group_name: 'security',
      help_text: 'Additional security layer with 2FA',
    }
  ]);

  // Insert predefined feature toggle templates
  await knex('configuration_templates').insert([
    {
      category: 'feature_toggles',
      template_name: 'development_features',
      display_name: 'Development Features Template',
      description: 'Common feature toggles for development environment',
      template_config: JSON.stringify({
        new_user_dashboard: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable new dashboard for development testing'
        },
        advanced_search: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable advanced search for development'
        },
        beta_features: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable beta features in development'
        },
        analytics_tracking: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable analytics in development'
        }
      }),
      is_active: true,
      sort_order: 1,
    },
    {
      category: 'feature_toggles',
      template_name: 'production_features',
      display_name: 'Production Features Template',
      description: 'Conservative feature toggles for production environment',
      template_config: JSON.stringify({
        new_user_dashboard: {
          value: 'false',
          valueType: 'boolean',
          description: 'Keep old dashboard in production until fully tested'
        },
        advanced_search: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable stable advanced search'
        },
        real_time_notifications: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable stable notifications'
        },
        beta_features: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable beta features in production'
        },
        analytics_tracking: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable analytics in production'
        },
        two_factor_auth: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable security features in production'
        }
      }),
      is_active: true,
      sort_order: 2,
    },
    {
      category: 'feature_toggles',
      template_name: 'staging_features',
      display_name: 'Staging Features Template',
      description: 'Feature toggles for staging environment testing',
      template_config: JSON.stringify({
        new_user_dashboard: {
          value: 'true',
          valueType: 'boolean',
          description: 'Test new dashboard in staging'
        },
        advanced_search: {
          value: 'true',
          valueType: 'boolean',
          description: 'Test advanced search features'
        },
        real_time_notifications: {
          value: 'true',
          valueType: 'boolean',
          description: 'Test notifications system'
        },
        dark_mode: {
          value: 'true',
          valueType: 'boolean',
          description: 'Test dark mode functionality'
        },
        api_v2: {
          value: 'true',
          valueType: 'boolean',
          description: 'Test new API version'
        },
        analytics_tracking: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable analytics in staging'
        }
      }),
      is_active: true,
      sort_order: 3,
    },
    {
      category: 'feature_toggles',
      template_name: 'emergency_disable',
      display_name: 'Emergency Disable Template',
      description: 'Quick disable template for emergency situations',
      template_config: JSON.stringify({
        new_user_dashboard: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable new features during emergency'
        },
        advanced_search: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable advanced features during emergency'
        },
        real_time_notifications: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable real-time features during emergency'
        },
        beta_features: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable all beta features during emergency'
        },
        maintenance_mode: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable maintenance mode during emergency'
        }
      }),
      is_active: true,
      sort_order: 4,
    },
    {
      category: 'feature_toggles',
      template_name: 'mobile_optimized',
      display_name: 'Mobile Optimized Template',
      description: 'Feature toggles optimized for mobile users',
      template_config: JSON.stringify({
        mobile_app_integration: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable mobile-specific features'
        },
        dark_mode: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable dark mode for mobile'
        },
        real_time_notifications: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable push notifications for mobile'
        },
        advanced_search: {
          value: 'false',
          valueType: 'boolean',
          description: 'Disable complex search on mobile'
        }
      }),
      is_active: true,
      sort_order: 5,
    }
  ]);

  console.log('✅ Feature toggle templates added successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Remove feature toggle templates
  await knex('configuration_templates')
    .where('category', 'feature_toggles')
    .del();

  // Remove feature toggle metadata
  await knex('configuration_metadata')
    .where('category', 'feature_toggles')
    .del();

  console.log('✅ Feature toggle templates removed successfully');
}