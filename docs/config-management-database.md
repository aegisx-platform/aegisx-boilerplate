# Configuration Management Database Schema

## 📋 Overview

This document describes the database schema for the Dynamic Configuration Management System. The system uses **4 core tables** with **bigserial primary keys** to handle configuration storage, metadata, history tracking, and template management.

## 🏗️ Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────┐
│  system_configurations  │
│ ─────────────────────── │
│ id (PK) bigserial       │──┐
│ category varchar(50)    │  │
│ config_key varchar(100) │  │
│ config_value text       │  │
│ value_type enum         │  │
│ is_encrypted boolean    │  │
│ is_active boolean       │  │
│ environment enum        │  │
│ updated_by uuid (FK)    │  │
│ created_at timestamp    │  │
│ updated_at timestamp    │  │
└─────────────────────────┘  │
                             │
                             │ 1:N
                             │
┌─────────────────────────┐  │
│ configuration_history   │  │
│ ─────────────────────── │  │
│ id (PK) bigserial       │  │
│ config_id bigint (FK)   │──┘
│ old_value text          │
│ new_value text          │
│ changed_by uuid (FK)    │
│ change_reason text      │
│ ip_address inet         │
│ user_agent text         │
│ created_at timestamp    │
└─────────────────────────┘

┌─────────────────────────┐
│ configuration_metadata  │
│ ─────────────────────── │
│ id (PK) bigserial       │
│ category varchar(50)    │
│ config_key varchar(100) │
│ display_name varchar    │
│ description text        │
│ input_type enum         │
│ validation_rules jsonb  │
│ default_value text      │
│ is_required boolean     │
│ sort_order integer      │
│ group_name varchar(100) │
│ help_text text          │
│ created_at timestamp    │
└─────────────────────────┘

┌─────────────────────────┐
│ configuration_templates │
│ ─────────────────────── │
│ id (PK) bigserial       │
│ provider_name varchar   │
│ category varchar(50)    │
│ template_data jsonb     │
│ description text        │
│ is_active boolean       │
│ created_at timestamp    │
│ updated_at timestamp    │
└─────────────────────────┘
```

## 📊 Table Definitions

### 1. system_configurations

**Purpose**: Primary table storing all configuration values

```sql
CREATE TABLE system_configurations (
    id                  BIGSERIAL PRIMARY KEY,
    category            VARCHAR(50) NOT NULL,
    config_key          VARCHAR(100) NOT NULL,
    config_value        TEXT,
    value_type          VARCHAR(20) DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json')),
    is_encrypted        BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    environment         VARCHAR(20) DEFAULT 'development' CHECK (environment IN ('development', 'production', 'staging', 'test')),
    updated_by          UUID REFERENCES users(id),
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_config_key_per_category_env UNIQUE (category, config_key, environment)
);

-- Indexes
CREATE INDEX idx_system_configurations_category ON system_configurations(category);
CREATE INDEX idx_system_configurations_env ON system_configurations(environment);
CREATE INDEX idx_system_configurations_active ON system_configurations(is_active);
CREATE INDEX idx_system_configurations_category_env ON system_configurations(category, environment);
CREATE INDEX idx_system_configurations_updated_at ON system_configurations(updated_at);
```

**Key Features**:
- **Unique Constraint**: Prevents duplicate keys within same category+environment
- **Flexible Value Types**: Support for string, number, boolean, and JSON values
- **Environment Separation**: Isolate configurations by environment
- **Soft Delete**: Use `is_active` instead of deleting records
- **Audit Ready**: `updated_by` tracks who made changes

**Sample Data**:
```sql
INSERT INTO system_configurations (category, config_key, config_value, value_type, environment, updated_by) VALUES
('smtp', 'host', 'smtp.gmail.com', 'string', 'production', '550e8400-e29b-41d4-a716-446655440000'),
('smtp', 'port', '587', 'number', 'production', '550e8400-e29b-41d4-a716-446655440000'),
('smtp', 'secure', 'false', 'boolean', 'production', '550e8400-e29b-41d4-a716-446655440000'),
('smtp', 'auth_user', 'your-email@gmail.com', 'string', 'production', '550e8400-e29b-41d4-a716-446655440000'),
('smtp', 'auth_pass', 'encrypted:AES256:...', 'string', 'production', '550e8400-e29b-41d4-a716-446655440000');
```

---

### 2. configuration_metadata

**Purpose**: UI metadata for form generation and validation

```sql
CREATE TABLE configuration_metadata (
    id                  BIGSERIAL PRIMARY KEY,
    category            VARCHAR(50) NOT NULL,
    config_key          VARCHAR(100) NOT NULL,
    display_name        VARCHAR(200) NOT NULL,
    description         TEXT,
    input_type          VARCHAR(20) DEFAULT 'text' CHECK (input_type IN ('text', 'password', 'number', 'select', 'textarea', 'checkbox', 'radio')),
    validation_rules    JSONB,
    default_value       TEXT,
    is_required         BOOLEAN DEFAULT FALSE,
    sort_order          INTEGER DEFAULT 0,
    group_name          VARCHAR(100),
    help_text           TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_metadata_key_per_category UNIQUE (category, config_key)
);

-- Indexes
CREATE INDEX idx_configuration_metadata_category ON configuration_metadata(category);
CREATE INDEX idx_configuration_metadata_group ON configuration_metadata(group_name);
CREATE INDEX idx_configuration_metadata_sort ON configuration_metadata(category, sort_order);
```

**Validation Rules JSON Structure**:
```json
{
  "minLength": 1,
  "maxLength": 100,
  "pattern": "^[a-zA-Z0-9.-]+$",
  "required": true,
  "options": ["smtp.gmail.com", "smtp.sendgrid.net", "smtp.mailtrap.io"],
  "min": 1,
  "max": 65535,
  "custom": {
    "emailValidation": true,
    "domainValidation": true
  }
}
```

**Sample Data**:
```sql
INSERT INTO configuration_metadata (category, config_key, display_name, description, input_type, validation_rules, is_required, sort_order, group_name, help_text) VALUES
('smtp', 'host', 'SMTP Host', 'SMTP server hostname or IP address', 'text', 
 '{"required": true, "pattern": "^[a-zA-Z0-9.-]+$", "minLength": 1, "maxLength": 255}', 
 true, 1, 'Connection Settings', 'Enter your SMTP server hostname (e.g., smtp.gmail.com)'),

('smtp', 'port', 'SMTP Port', 'SMTP server port number', 'number', 
 '{"required": true, "min": 1, "max": 65535}', 
 true, 2, 'Connection Settings', 'Common ports: 25 (plain), 587 (STARTTLS), 465 (SSL)'),

('smtp', 'secure', 'Use SSL/TLS', 'Enable secure connection', 'select', 
 '{"required": true, "options": ["true", "false"]}', 
 true, 3, 'Security Settings', 'Enable for ports 465 (SSL) or 587 (STARTTLS)'),

('smtp', 'auth_user', 'Username', 'SMTP authentication username', 'text', 
 '{"required": true, "minLength": 3}', 
 true, 4, 'Authentication', 'Usually your email address for Gmail/SendGrid'),

('smtp', 'auth_pass', 'Password', 'SMTP authentication password', 'password', 
 '{"required": true, "minLength": 8}', 
 true, 5, 'Authentication', 'Use App Password for Gmail, API Key for SendGrid');
```

---

### 3. configuration_history

**Purpose**: Complete audit trail of all configuration changes

```sql
CREATE TABLE configuration_history (
    id                  BIGSERIAL PRIMARY KEY,
    config_id           BIGINT NOT NULL REFERENCES system_configurations(id) ON DELETE CASCADE,
    old_value           TEXT,
    new_value           TEXT,
    changed_by          UUID REFERENCES users(id),
    change_reason       TEXT,
    ip_address          INET,
    user_agent          TEXT,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_configuration_history_config_id ON configuration_history(config_id);
CREATE INDEX idx_configuration_history_changed_by ON configuration_history(changed_by);
CREATE INDEX idx_configuration_history_created_at ON configuration_history(created_at);
CREATE INDEX idx_configuration_history_config_created ON configuration_history(config_id, created_at DESC);
```

**Key Features**:
- **Complete Audit Trail**: Every change is recorded
- **Change Tracking**: Old and new values captured
- **User Attribution**: Who made the change
- **Context Information**: IP address and user agent
- **Reasoning**: Why the change was made
- **Cascade Delete**: History removed when configuration is deleted

**Sample Data**:
```sql
INSERT INTO configuration_history (config_id, old_value, new_value, changed_by, change_reason, ip_address, user_agent) VALUES
(1, 'smtp.sendgrid.net', 'smtp.gmail.com', '550e8400-e29b-41d4-a716-446655440000', 
 'Switch back to Gmail for better reliability', '192.168.1.100', 
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),

(2, '25', '587', '550e8400-e29b-41d4-a716-446655440000', 
 'Use STARTTLS instead of plain connection', '192.168.1.100',
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
```

---

### 4. configuration_templates

**Purpose**: Pre-built configuration templates for common providers

```sql
CREATE TABLE configuration_templates (
    id                  BIGSERIAL PRIMARY KEY,
    provider_name       VARCHAR(50) NOT NULL,
    category            VARCHAR(50) NOT NULL,
    template_data       JSONB NOT NULL,
    description         TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_provider_category UNIQUE (provider_name, category)
);

-- Indexes
CREATE INDEX idx_configuration_templates_provider ON configuration_templates(provider_name);
CREATE INDEX idx_configuration_templates_category ON configuration_templates(category);
CREATE INDEX idx_configuration_templates_active ON configuration_templates(is_active);
```

**Template Data JSON Structure**:
```json
{
  "configs": {
    "host": "smtp.gmail.com",
    "port": "587",
    "secure": "false",
    "auth_user": "{{EMAIL_USER}}",
    "auth_pass": "{{EMAIL_PASS}}"
  },
  "variables": [
    {
      "name": "EMAIL_USER",
      "description": "Gmail email address",
      "required": true,
      "example": "your-email@gmail.com",
      "validation": {
        "pattern": "^[^@]+@gmail\\.com$"
      }
    },
    {
      "name": "EMAIL_PASS",
      "description": "Gmail App Password",
      "required": true,
      "example": "abcd efgh ijkl mnop",
      "validation": {
        "minLength": 16,
        "maxLength": 16
      }
    }
  ],
  "instructions": [
    "1. Enable 2FA on your Gmail account",
    "2. Generate an App Password in Google Account settings",
    "3. Use the 16-character App Password (not your regular password)"
  ]
}
```

**Sample Data**:
```sql
-- Gmail SMTP Template
INSERT INTO configuration_templates (provider_name, category, template_data, description) VALUES
('gmail', 'smtp', '{
  "configs": {
    "host": "smtp.gmail.com",
    "port": "587",
    "secure": "false",
    "auth_user": "{{EMAIL_USER}}",
    "auth_pass": "{{EMAIL_PASS}}"
  },
  "variables": [
    {
      "name": "EMAIL_USER",
      "description": "Gmail email address",
      "required": true,
      "example": "your-email@gmail.com"
    },
    {
      "name": "EMAIL_PASS",
      "description": "Gmail App Password (16 characters)",
      "required": true,
      "example": "abcd efgh ijkl mnop"
    }
  ]
}', 'Gmail SMTP configuration template with App Password authentication'),

-- SendGrid SMTP Template
('sendgrid', 'smtp', '{
  "configs": {
    "host": "smtp.sendgrid.net",
    "port": "587",
    "secure": "false",
    "auth_user": "apikey",
    "auth_pass": "{{SENDGRID_API_KEY}}"
  },
  "variables": [
    {
      "name": "SENDGRID_API_KEY",
      "description": "SendGrid API Key",
      "required": true,
      "example": "SG...."
    }
  ]
}', 'SendGrid SMTP configuration template'),

-- Mailtrap SMTP Template (for testing)
('mailtrap', 'smtp', '{
  "configs": {
    "host": "smtp.mailtrap.io",
    "port": "587", 
    "secure": "false",
    "auth_user": "{{MAILTRAP_USER}}",
    "auth_pass": "{{MAILTRAP_PASS}}"
  },
  "variables": [
    {
      "name": "MAILTRAP_USER",
      "description": "Mailtrap username",
      "required": true
    },
    {
      "name": "MAILTRAP_PASS", 
      "description": "Mailtrap password",
      "required": true
    }
  ]
}', 'Mailtrap SMTP configuration for testing emails');
```

## 🔍 Common Queries

### Configuration Management

```sql
-- Get all SMTP configurations for production
SELECT c.*, m.display_name, m.group_name
FROM system_configurations c
LEFT JOIN configuration_metadata m ON c.category = m.category AND c.config_key = m.config_key
WHERE c.category = 'smtp' 
  AND c.environment = 'production' 
  AND c.is_active = true
ORDER BY m.sort_order, c.config_key;

-- Get configuration with full history
SELECT 
  c.*,
  array_agg(
    json_build_object(
      'old_value', h.old_value,
      'new_value', h.new_value,
      'changed_at', h.created_at,
      'changed_by', u.email,
      'reason', h.change_reason
    ) ORDER BY h.created_at DESC
  ) as history
FROM system_configurations c
LEFT JOIN configuration_history h ON c.id = h.config_id
LEFT JOIN users u ON h.changed_by = u.id
WHERE c.id = $1
GROUP BY c.id;
```

### Metadata-Driven Queries

```sql
-- Get UI form structure for category
SELECT 
  group_name,
  array_agg(
    json_build_object(
      'key', config_key,
      'displayName', display_name,
      'description', description,
      'inputType', input_type,
      'validationRules', validation_rules,
      'defaultValue', default_value,
      'isRequired', is_required,
      'helpText', help_text,
      'currentValue', c.config_value
    ) ORDER BY sort_order
  ) as fields
FROM configuration_metadata m
LEFT JOIN system_configurations c ON m.category = c.category 
  AND m.config_key = c.config_key 
  AND c.environment = $2
  AND c.is_active = true
WHERE m.category = $1
GROUP BY group_name
ORDER BY MIN(sort_order);
```

### Template Operations

```sql
-- Get template with variable definitions
SELECT 
  provider_name,
  category,
  description,
  template_data->'configs' as config_template,
  template_data->'variables' as variables,
  template_data->'instructions' as setup_instructions
FROM configuration_templates
WHERE provider_name = $1 AND category = $2 AND is_active = true;

-- Apply template (pseudo-SQL, actual implementation in application)
WITH template AS (
  SELECT template_data FROM configuration_templates 
  WHERE provider_name = $1 AND category = $2
)
INSERT INTO system_configurations (category, config_key, config_value, environment, updated_by)
SELECT 
  $2 as category,
  key as config_key,
  replace(replace(value, '{{EMAIL_USER}}', $3), '{{EMAIL_PASS}}', $4) as config_value,
  $5 as environment,
  $6 as updated_by
FROM template, jsonb_each_text(template_data->'configs');
```

### Audit & History

```sql
-- Get change history with user details
SELECT 
  h.*,
  c.category,
  c.config_key,
  u.email as changed_by_email,
  u.username as changed_by_username
FROM configuration_history h
JOIN system_configurations c ON h.config_id = c.id
LEFT JOIN users u ON h.changed_by = u.id
WHERE h.config_id = $1
ORDER BY h.created_at DESC
LIMIT $2 OFFSET $3;

-- Get recent changes across all configurations
SELECT 
  h.created_at,
  c.category,
  c.config_key,
  c.environment,
  h.old_value,
  h.new_value,
  u.email as changed_by,
  h.change_reason
FROM configuration_history h
JOIN system_configurations c ON h.config_id = c.id
LEFT JOIN users u ON h.changed_by = u.id
WHERE h.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY h.created_at DESC;
```

## 🔧 Database Functions & Triggers

### Automatic History Tracking

```sql
-- Function to log configuration changes
CREATE OR REPLACE FUNCTION log_configuration_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only log if value actually changed
    IF OLD.config_value IS DISTINCT FROM NEW.config_value THEN
      INSERT INTO configuration_history (
        config_id, 
        old_value, 
        new_value, 
        changed_by,
        created_at
      ) VALUES (
        NEW.id,
        OLD.config_value,
        NEW.config_value,
        NEW.updated_by,
        NEW.updated_at
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO configuration_history (
      config_id,
      old_value,
      new_value,
      changed_by,
      created_at
    ) VALUES (
      OLD.id,
      OLD.config_value,
      NULL,
      COALESCE(OLD.updated_by, '00000000-0000-0000-0000-000000000000'::uuid),
      NOW()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic history logging
CREATE TRIGGER system_configurations_history_trigger
  AFTER UPDATE OR DELETE ON system_configurations
  FOR EACH ROW
  EXECUTE FUNCTION log_configuration_change();
```

### Configuration Validation

```sql
-- Function to validate configuration values against metadata rules
CREATE OR REPLACE FUNCTION validate_configuration_value(
  p_category VARCHAR,
  p_config_key VARCHAR,
  p_config_value TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_metadata RECORD;
  v_rules JSONB;
BEGIN
  -- Get metadata for validation
  SELECT * INTO v_metadata
  FROM configuration_metadata
  WHERE category = p_category AND config_key = p_config_key;
  
  IF NOT FOUND THEN
    -- No metadata means no validation required
    RETURN TRUE;
  END IF;
  
  v_rules := v_metadata.validation_rules;
  
  -- Required validation
  IF (v_rules->>'required')::boolean = true AND (p_config_value IS NULL OR p_config_value = '') THEN
    RETURN FALSE;
  END IF;
  
  -- Length validation
  IF v_rules ? 'minLength' AND LENGTH(p_config_value) < (v_rules->>'minLength')::integer THEN
    RETURN FALSE;
  END IF;
  
  IF v_rules ? 'maxLength' AND LENGTH(p_config_value) > (v_rules->>'maxLength')::integer THEN
    RETURN FALSE;
  END IF;
  
  -- Numeric validation
  IF v_metadata.value_type = 'number' THEN
    IF p_config_value !~ '^-?\d+(\.\d+)?$' THEN
      RETURN FALSE;
    END IF;
    
    IF v_rules ? 'min' AND p_config_value::numeric < (v_rules->>'min')::numeric THEN
      RETURN FALSE;
    END IF;
    
    IF v_rules ? 'max' AND p_config_value::numeric > (v_rules->>'max')::numeric THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  -- Pattern validation (regex)
  IF v_rules ? 'pattern' AND p_config_value !~ (v_rules->>'pattern') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

## 📊 Performance Considerations

### Indexing Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_config_category_env_active ON system_configurations(category, environment, is_active);
CREATE INDEX idx_config_updated_at_desc ON system_configurations(updated_at DESC);

-- Partial indexes for active configurations only
CREATE INDEX idx_config_active_only ON system_configurations(category, config_key) 
WHERE is_active = true;

-- JSONB indexes for template data
CREATE INDEX idx_template_data_gin ON configuration_templates USING GIN (template_data);

-- History table partitioning (for high-volume systems)
-- Consider partitioning configuration_history by created_at for better performance
```

### Archiving Strategy

```sql
-- Archive old history records (keep last 2 years)
CREATE TABLE configuration_history_archive (LIKE configuration_history);

-- Move old records to archive
WITH archived AS (
  DELETE FROM configuration_history 
  WHERE created_at < NOW() - INTERVAL '2 years'
  RETURNING *
)
INSERT INTO configuration_history_archive SELECT * FROM archived;
```

## 🔐 Security Considerations

### Data Encryption

```sql
-- Example of encrypted value storage
-- Application handles encryption/decryption
UPDATE system_configurations 
SET 
  config_value = 'encrypted:AES256:' || encrypt_value($1),
  is_encrypted = true
WHERE id = $2;
```

### Access Control

```sql
-- Row-level security for multi-tenant scenarios
ALTER TABLE system_configurations ENABLE ROW LEVEL SECURITY;

-- Policy for user access (example)
CREATE POLICY config_user_access ON system_configurations
  FOR ALL
  TO config_users
  USING (
    -- Users can only access configs for their environment
    environment IN (
      SELECT unnest(allowed_environments) 
      FROM user_permissions 
      WHERE user_id = current_user_id()
    )
  );
```

## 🚀 Migration Scripts

### Initial Setup

```sql
-- Run all table creation scripts
\i create_system_configurations.sql
\i create_configuration_metadata.sql  
\i create_configuration_history.sql
\i create_configuration_templates.sql

-- Insert initial metadata
\i insert_smtp_metadata.sql
\i insert_smtp_templates.sql

-- Create functions and triggers
\i create_history_trigger.sql
\i create_validation_functions.sql
```

### Data Migration from Environment Variables

```sql
-- Migrate existing environment-based SMTP config
INSERT INTO system_configurations (category, config_key, config_value, environment) 
SELECT 
  'smtp' as category,
  'host' as config_key,
  COALESCE(nullif(current_setting('app.smtp_host', true), ''), 'localhost') as config_value,
  'production' as environment
WHERE NOT EXISTS (
  SELECT 1 FROM system_configurations 
  WHERE category = 'smtp' AND config_key = 'host' AND environment = 'production'
);
```

---

## 📚 Related Documentation

- [Main Documentation](./dynamic-configuration-management.md) - System overview
- [API Documentation](./config-management-api.md) - API endpoints
- [Integration Guide](./config-management-integration.md) - Integration patterns

---

**Created**: 2025-01-21  
**Last Updated**: 2025-01-21  
**Version**: 1.0.0