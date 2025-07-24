import { Knex } from 'knex';

/**
 * Add predefined feature toggle templates organized by sub-categories
 * Sub-categories: ui, api, mobile, security, analytics, experimental, system
 */
export async function up(knex: Knex): Promise<void> {
  // Insert feature toggle metadata organized by sub-categories
  await knex('configuration_metadata').insert([
    // UI Features
    {
      category: 'feature_toggles',
      config_key: 'enhanced_navigation',
      display_name: 'Enhanced Navigation',
      description: 'Enable enhanced navigation with breadcrumbs and quick actions',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 11,
      group_name: 'ui_features',
      help_text: 'Improved navigation experience with additional UI elements',
    },
    {
      category: 'feature_toggles',
      config_key: 'sidebar_collapse',
      display_name: 'Collapsible Sidebar',
      description: 'Enable collapsible sidebar functionality',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 12,
      group_name: 'ui_features',
      help_text: 'Allow users to collapse/expand the sidebar',
    },
    {
      category: 'feature_toggles',
      config_key: 'drag_drop_interface',
      display_name: 'Drag & Drop Interface',
      description: 'Enable drag and drop functionality in UI components',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 13,
      group_name: 'ui_features',
      help_text: 'Interactive drag and drop for better user experience',
    },
    {
      category: 'feature_toggles',
      config_key: 'keyboard_shortcuts',
      display_name: 'Keyboard Shortcuts',
      description: 'Enable keyboard shortcuts for power users',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 14,
      group_name: 'ui_features',
      help_text: 'Keyboard shortcuts for common actions',
    },

    // API Features
    {
      category: 'feature_toggles',
      config_key: 'graphql_endpoint',
      display_name: 'GraphQL Endpoint',
      description: 'Enable GraphQL API endpoint alongside REST',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 15,
      group_name: 'api_features',
      help_text: 'GraphQL API for flexible data querying',
    },
    {
      category: 'feature_toggles',
      config_key: 'api_rate_limiting',
      display_name: 'Enhanced API Rate Limiting',
      description: 'Enable advanced rate limiting with custom rules',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 16,
      group_name: 'api_features',
      help_text: 'Advanced rate limiting with user-specific rules',
    },
    {
      category: 'feature_toggles',
      config_key: 'api_caching',
      display_name: 'API Response Caching',
      description: 'Enable intelligent API response caching',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 17,
      group_name: 'api_features',
      help_text: 'Cache API responses for better performance',
    },
    {
      category: 'feature_toggles',
      config_key: 'api_versioning',
      display_name: 'API Versioning Headers',
      description: 'Enable API versioning through headers',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 18,
      group_name: 'api_features',
      help_text: 'Support multiple API versions via headers',
    },

    // Mobile Features
    {
      category: 'feature_toggles',
      config_key: 'mobile_push_notifications',
      display_name: 'Mobile Push Notifications',
      description: 'Enable push notifications for mobile apps',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 19,
      group_name: 'mobile_features',
      help_text: 'Push notifications for iOS and Android apps',
    },
    {
      category: 'feature_toggles',
      config_key: 'mobile_offline_mode',
      display_name: 'Mobile Offline Mode',
      description: 'Enable offline functionality for mobile apps',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 20,
      group_name: 'mobile_features',
      help_text: 'Work offline with data synchronization',
    },
    {
      category: 'feature_toggles',
      config_key: 'mobile_biometric_auth',
      display_name: 'Biometric Authentication',
      description: 'Enable fingerprint/face ID authentication',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 21,
      group_name: 'mobile_features',
      help_text: 'Biometric authentication for mobile apps',
    },
    {
      category: 'feature_toggles',
      config_key: 'mobile_geolocation',
      display_name: 'Geolocation Services',
      description: 'Enable location-based features in mobile apps',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 22,
      group_name: 'mobile_features',
      help_text: 'Location-based services and features',
    },

    // Security Features
    {
      category: 'feature_toggles',
      config_key: 'session_security',
      display_name: 'Enhanced Session Security',
      description: 'Enable advanced session security measures',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 23,
      group_name: 'security_features',
      help_text: 'Enhanced session validation and timeout handling',
    },
    {
      category: 'feature_toggles',
      config_key: 'ip_whitelisting',
      display_name: 'IP Whitelisting',
      description: 'Enable IP address whitelisting for admin access',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 24,
      group_name: 'security_features',
      help_text: 'Restrict access based on IP addresses',
    },
    {
      category: 'feature_toggles',
      config_key: 'security_headers',
      display_name: 'Security Headers',
      description: 'Enable comprehensive security headers',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 25,
      group_name: 'security_features',
      help_text: 'HSTS, CSP, and other security headers',
    },
    {
      category: 'feature_toggles',
      config_key: 'audit_logging',
      display_name: 'Enhanced Audit Logging',
      description: 'Enable comprehensive audit logging',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 26,
      group_name: 'security_features',
      help_text: 'Detailed audit logs for security compliance',
    },

    // Analytics Features
    {
      category: 'feature_toggles',
      config_key: 'user_behavior_analytics',
      display_name: 'User Behavior Analytics',
      description: 'Enable detailed user behavior tracking',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 27,
      group_name: 'analytics_features',
      help_text: 'Track user interactions and behavior patterns',
    },
    {
      category: 'feature_toggles',
      config_key: 'performance_metrics',
      display_name: 'Performance Metrics',
      description: 'Enable application performance monitoring',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 28,
      group_name: 'analytics_features',
      help_text: 'Monitor application performance metrics',
    },
    {
      category: 'feature_toggles',
      config_key: 'error_tracking',
      display_name: 'Error Tracking',
      description: 'Enable comprehensive error tracking and reporting',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 29,
      group_name: 'analytics_features',
      help_text: 'Track and report application errors',
    },
    {
      category: 'feature_toggles',
      config_key: 'custom_events',
      display_name: 'Custom Event Tracking',
      description: 'Enable custom business event tracking',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 30,
      group_name: 'analytics_features',
      help_text: 'Track custom business events and metrics',
    },

    // Experimental Features
    {
      category: 'feature_toggles',
      config_key: 'ai_assistance',
      display_name: 'AI Assistance',
      description: 'Enable AI-powered assistance features',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 31,
      group_name: 'experimental_features',
      help_text: 'AI-powered help and automation features',
    },
    {
      category: 'feature_toggles',
      config_key: 'voice_commands',
      display_name: 'Voice Commands',
      description: 'Enable voice command functionality',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 32,
      group_name: 'experimental_features',
      help_text: 'Voice-activated commands and navigation',
    },
    {
      category: 'feature_toggles',
      config_key: 'predictive_ui',
      display_name: 'Predictive UI',
      description: 'Enable predictive user interface elements',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 33,
      group_name: 'experimental_features',
      help_text: 'UI that adapts based on user behavior prediction',
    },
    {
      category: 'feature_toggles',
      config_key: 'ar_features',
      display_name: 'Augmented Reality Features',
      description: 'Enable experimental AR functionality',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 34,
      group_name: 'experimental_features',
      help_text: 'Experimental augmented reality features',
    },

    // System Features
    {
      category: 'feature_toggles',
      config_key: 'auto_scaling',
      display_name: 'Auto Scaling',
      description: 'Enable automatic system scaling based on load',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 35,
      group_name: 'system_features',
      help_text: 'Automatic scaling based on system load',
    },
    {
      category: 'feature_toggles',
      config_key: 'health_monitoring',
      display_name: 'Health Monitoring',
      description: 'Enable comprehensive system health monitoring',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 36,
      group_name: 'system_features',
      help_text: 'Monitor system health and performance',
    },
    {
      category: 'feature_toggles',
      config_key: 'backup_automation',
      display_name: 'Automated Backups',
      description: 'Enable automated backup processes',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'true',
      is_required: false,
      sort_order: 37,
      group_name: 'system_features',
      help_text: 'Automated database and file backups',
    },
    {
      category: 'feature_toggles',
      config_key: 'load_balancing',
      display_name: 'Load Balancing',
      description: 'Enable intelligent load balancing',
      input_type: 'checkbox',
      validation_rules: JSON.stringify({}),
      default_value: 'false',
      is_required: false,
      sort_order: 38,
      group_name: 'system_features',
      help_text: 'Distribute load across multiple servers',
    }
  ]);

  // Insert predefined feature toggle templates organized by sub-categories
  await knex('configuration_templates').insert([
    // UI Features Template
    {
      category: 'feature_toggles',
      template_name: 'ui_enhanced',
      display_name: 'Enhanced UI Features',
      description: 'Template with modern UI enhancements and user experience improvements',
      template_config: JSON.stringify({
        new_user_dashboard: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable new dashboard interface'
        },
        dark_mode: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable dark mode theme'
        },
        enhanced_navigation: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enhanced navigation with breadcrumbs'
        },
        sidebar_collapse: {
          value: 'true',
          valueType: 'boolean',
          description: 'Collapsible sidebar functionality'
        },
        drag_drop_interface: {
          value: 'true',
          valueType: 'boolean',
          description: 'Drag and drop interface elements'
        },
        keyboard_shortcuts: {
          value: 'true',
          valueType: 'boolean',
          description: 'Keyboard shortcuts for power users'
        }
      }),
      is_active: true,
      sort_order: 6,
    },

    // API Features Template
    {
      category: 'feature_toggles',
      template_name: 'api_advanced',
      display_name: 'Advanced API Features',
      description: 'Template with advanced API capabilities and performance optimizations',
      template_config: JSON.stringify({
        api_v2: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable API version 2'
        },
        graphql_endpoint: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enable GraphQL API endpoint'
        },
        api_rate_limiting: {
          value: 'true',
          valueType: 'boolean',
          description: 'Advanced rate limiting'
        },
        api_caching: {
          value: 'true',
          valueType: 'boolean',
          description: 'API response caching'
        },
        api_versioning: {
          value: 'true',
          valueType: 'boolean',
          description: 'API versioning headers'
        }
      }),
      is_active: true,
      sort_order: 7,
    },

    // Mobile Features Template
    {
      category: 'feature_toggles',
      template_name: 'mobile_complete',
      display_name: 'Complete Mobile Features',
      description: 'Template with comprehensive mobile app capabilities',
      template_config: JSON.stringify({
        mobile_app_integration: {
          value: 'true',
          valueType: 'boolean',
          description: 'Mobile app integration'
        },
        mobile_push_notifications: {
          value: 'true',
          valueType: 'boolean',
          description: 'Push notifications for mobile'
        },
        mobile_offline_mode: {
          value: 'true',
          valueType: 'boolean',
          description: 'Offline mode functionality'
        },
        mobile_biometric_auth: {
          value: 'true',
          valueType: 'boolean',
          description: 'Biometric authentication'
        },
        mobile_geolocation: {
          value: 'true',
          valueType: 'boolean',
          description: 'Geolocation services'
        },
        dark_mode: {
          value: 'true',
          valueType: 'boolean',
          description: 'Dark mode for mobile'
        }
      }),
      is_active: true,
      sort_order: 8,
    },

    // Security Features Template
    {
      category: 'feature_toggles',
      template_name: 'security_hardened',
      display_name: 'Hardened Security Features',
      description: 'Template with comprehensive security enhancements',
      template_config: JSON.stringify({
        two_factor_auth: {
          value: 'true',
          valueType: 'boolean',
          description: 'Two-factor authentication'
        },
        session_security: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enhanced session security'
        },
        ip_whitelisting: {
          value: 'true',
          valueType: 'boolean',
          description: 'IP address whitelisting'
        },
        security_headers: {
          value: 'true',
          valueType: 'boolean',
          description: 'Comprehensive security headers'
        },
        audit_logging: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enhanced audit logging'
        }
      }),
      is_active: true,
      sort_order: 9,
    },

    // Analytics Features Template
    {
      category: 'feature_toggles',
      template_name: 'analytics_comprehensive',
      display_name: 'Comprehensive Analytics',
      description: 'Template with full analytics and monitoring capabilities',
      template_config: JSON.stringify({
        analytics_tracking: {
          value: 'true',
          valueType: 'boolean',
          description: 'Basic analytics tracking'
        },
        user_behavior_analytics: {
          value: 'true',
          valueType: 'boolean',
          description: 'User behavior tracking'
        },
        performance_metrics: {
          value: 'true',
          valueType: 'boolean',
          description: 'Performance monitoring'
        },
        error_tracking: {
          value: 'true',
          valueType: 'boolean',
          description: 'Error tracking and reporting'
        },
        custom_events: {
          value: 'true',
          valueType: 'boolean',
          description: 'Custom event tracking'
        }
      }),
      is_active: true,
      sort_order: 10,
    },

    // Experimental Features Template
    {
      category: 'feature_toggles',
      template_name: 'experimental_cutting_edge',
      display_name: 'Cutting Edge Experimental',
      description: 'Template with experimental and cutting-edge features',
      template_config: JSON.stringify({
        ai_assistance: {
          value: 'true',
          valueType: 'boolean',
          description: 'AI-powered assistance'
        },
        voice_commands: {
          value: 'true',
          valueType: 'boolean',
          description: 'Voice command functionality'
        },
        predictive_ui: {
          value: 'true',
          valueType: 'boolean',
          description: 'Predictive UI elements'
        },
        ar_features: {
          value: 'false',
          valueType: 'boolean',
          description: 'Augmented reality features (very experimental)'
        },
        beta_features: {
          value: 'true',
          valueType: 'boolean',
          description: 'General beta features'
        }
      }),
      is_active: true,
      sort_order: 11,
    },

    // System Features Template
    {
      category: 'feature_toggles',
      template_name: 'system_enterprise',
      display_name: 'Enterprise System Features',
      description: 'Template with enterprise-grade system capabilities',
      template_config: JSON.stringify({
        auto_scaling: {
          value: 'true',
          valueType: 'boolean',
          description: 'Automatic system scaling'
        },
        health_monitoring: {
          value: 'true',
          valueType: 'boolean',
          description: 'System health monitoring'
        },
        backup_automation: {
          value: 'true',
          valueType: 'boolean',
          description: 'Automated backup processes'
        },
        load_balancing: {
          value: 'true',
          valueType: 'boolean',
          description: 'Intelligent load balancing'
        },
        maintenance_mode: {
          value: 'false',
          valueType: 'boolean',
          description: 'Maintenance mode (disabled by default)'
        }
      }),
      is_active: true,
      sort_order: 12,
    },

    // Healthcare-specific Template (since this is a HIS system)
    {
      category: 'feature_toggles',
      template_name: 'healthcare_compliance',
      display_name: 'Healthcare Compliance Features',
      description: 'Template with healthcare-specific compliance and security features',
      template_config: JSON.stringify({
        two_factor_auth: {
          value: 'true',
          valueType: 'boolean',
          description: 'Required for HIPAA compliance'
        },
        audit_logging: {
          value: 'true',
          valueType: 'boolean',
          description: 'Required for healthcare audit trails'
        },
        session_security: {
          value: 'true',
          valueType: 'boolean',
          description: 'Enhanced session security for PHI protection'
        },
        security_headers: {
          value: 'true',
          valueType: 'boolean',
          description: 'Security headers for data protection'
        },
        backup_automation: {
          value: 'true',
          valueType: 'boolean',
          description: 'Automated backups for data recovery'
        },
        error_tracking: {
          value: 'true',
          valueType: 'boolean',
          description: 'Error tracking for compliance monitoring'
        }
      }),
      is_active: true,
      sort_order: 13,
    }
  ]);

  console.log('✅ Feature toggle sub-category templates added successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Remove the new sub-category templates
  const templateNames = [
    'ui_enhanced',
    'api_advanced',
    'mobile_complete',
    'security_hardened',
    'analytics_comprehensive',
    'experimental_cutting_edge',
    'system_enterprise',
    'healthcare_compliance'
  ];

  await knex('configuration_templates')
    .where('category', 'feature_toggles')
    .whereIn('template_name', templateNames)
    .del();

  // Remove the new metadata entries (those with sort_order >= 11)
  await knex('configuration_metadata')
    .where('category', 'feature_toggles')
    .where('sort_order', '>=', 11)
    .del();

  console.log('✅ Feature toggle sub-category templates removed successfully');
}