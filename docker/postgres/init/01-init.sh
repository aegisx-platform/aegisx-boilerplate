#!/bin/bash
set -e

# Create additional databases if needed
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Create additional schemas if needed
    -- CREATE SCHEMA IF NOT EXISTS app_schema;

    -- Set timezone
    SET timezone = 'UTC';
EOSQL

echo "PostgreSQL initialization completed successfully!"
