// knexfile.js - Production configuration (compiled from knexfile.ts)
const baseConfig = {
  client: 'pg',
  migrations: {
    directory: './apps/api/database/migrations',
    extension: 'ts'
  },
  seeds: {
    directory: './apps/api/database/seeds'
  }
};

module.exports = {
  development: {
    ...baseConfig,
    connection: process.env.DB_CONNECTION_STRING || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'aegisx_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10)
    }
  },

  test: {
    ...baseConfig,
    connection: process.env.DB_CONNECTION_STRING || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      database: process.env.DB_NAME || 'aegisx_db_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres123',
      ssl: false
    },
    pool: {
      min: 1,
      max: 5
    }
  },

  production: {
    ...baseConfig,
    connection: process.env.DB_CONNECTION_STRING || {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      max: parseInt(process.env.DB_POOL_MAX || '50', 10)
    }
  }
};
