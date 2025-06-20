import type { Knex } from 'knex';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const {
  DB_CONNECTION_STRING,
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'aegisx_db',
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres123',
  DB_SSL = 'false',
  DB_POOL_MIN = '2',
  DB_POOL_MAX = '10',
  NODE_ENV = 'development'
} = process.env;

const baseConfig: Knex.Config = {
  client: 'pg',
  migrations: {
    directory: './apps/api/src/app/infrastructure/database/migrations',
    extension: 'ts',
    loadExtensions: ['.ts']
  },
  seeds: {
    directory: './apps/api/src/app/infrastructure/database/seeds',
    loadExtensions: ['.ts']
  }
};

const connections: { [key: string]: Knex.Config } = {
  development: {
    ...baseConfig,
    connection: DB_CONNECTION_STRING || {
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: parseInt(DB_POOL_MIN, 10),
      max: parseInt(DB_POOL_MAX, 10)
    }
  },

  test: {
    ...baseConfig,
    connection: DB_CONNECTION_STRING || {
      host: DB_HOST,
      port: parseInt(DB_PORT === '5432' ? '5433' : DB_PORT, 10),
      database: `${DB_NAME}_test`,
      user: DB_USER,
      password: DB_PASSWORD,
      ssl: false
    },
    pool: {
      min: 1,
      max: 5
    }
  },

  production: {
    ...baseConfig,
    connection: DB_CONNECTION_STRING || {
      host: DB_HOST,
      port: parseInt(DB_PORT, 10),
      database: DB_NAME,
      user: DB_USER,
      password: DB_PASSWORD,
      ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: parseInt(DB_POOL_MIN || '5', 10),
      max: parseInt(DB_POOL_MAX || '50', 10)
    }
  }
};

export default connections[NODE_ENV] || connections.development;
