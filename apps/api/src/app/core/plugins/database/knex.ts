import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import Knex from 'knex';

/**
 * This plugin adds Knex.js database connection for PostgreSQL
 *
 * @see https://knexjs.org/
 */

// Extend FastifyInstance interface to include knex
declare module 'fastify' {
  interface FastifyInstance {
    knex: Knex.Knex;
    db: {
      healthCheck: () => Promise<boolean>;
      transaction: <T>(callback: (trx: Knex.Knex.Transaction) => Promise<T>) => Promise<T>;
    };
  }
}

export default fp(async function (fastify: FastifyInstance) {
  // Make sure env plugin is loaded first
  await fastify.after();

  const {
    DB_CONNECTION_STRING,
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DB_SSL,
    DB_POOL_MIN,
    DB_POOL_MAX,
    NODE_ENV
  } = fastify.config;

  // Configure Knex connection
  let knexConfig: Knex.Knex.Config;

  if (DB_CONNECTION_STRING) {
    // Use connection string if provided
    knexConfig = {
      client: 'pg',
      connection: DB_CONNECTION_STRING,
      pool: {
        min: parseInt(DB_POOL_MIN, 10),
        max: parseInt(DB_POOL_MAX, 10)
      },
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
  } else {
    // Use individual connection parameters
    knexConfig = {
      client: 'pg',
      connection: {
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
      },
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
  }

  // Add debug logging in development
  if (NODE_ENV === 'development') {
    knexConfig.debug = true;
    knexConfig.log = {
      warn(message: string) {
        fastify.log.warn(message);
      },
      error(message: string) {
        fastify.log.error(message);
      },
      deprecate(message: string) {
        fastify.log.warn(message);
      },
      debug(message: string) {
        fastify.log.debug(message);
      }
    };
  }

  // Create Knex instance
  const knex = Knex(knexConfig);

  fastify.log.info('✅ Knex plugin registered');

  // Test database connection
  try {
    // Skip connection test in development if no database is running
    if (NODE_ENV === 'development') {
      fastify.log.info({
        DB_CONNECTION_STRING,
        DB_HOST,
        DB_PORT,
        DB_NAME,
        DB_USER,
        DB_SSL,
        DB_POOL_MIN,
        DB_POOL_MAX
      });
    }
    fastify.log.info('🔌 Testing database connection...');
    await knex.raw('SELECT 1');
    fastify.log.info('✅ Database connection established successfully');
  } catch (error) {
    fastify.log.error('Failed to connect to database:');
    console.error(error);
    if (NODE_ENV !== 'test') {
      // Don't throw error in development to allow testing without database
      if (NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  // Register knex instance
  fastify.decorate('knex', knex);

  // Add utility methods
  fastify.decorate('db', {
    // Health check method
    healthCheck: async (): Promise<boolean> => {
      try {
        await knex.raw('SELECT 1');
        return true;
      } catch (error) {
        fastify.log.error('Database health check failed:', error);
        return false;
      }
    },

    // Transaction helper
    transaction: async <T>(
      callback: (trx: Knex.Knex.Transaction) => Promise<T>
    ): Promise<T> => {
      return knex.transaction(callback);
    }
  });

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    fastify.log.info('Closing database connection...');
    await knex.destroy();
  });
}, {
  name: 'knex-plugin'
});
