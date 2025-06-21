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
      transaction: <T>(
        callback: (trx: Knex.Knex.Transaction) => Promise<T>
      ) => Promise<T>;
    };
  }
}

export default fp(
  async function (fastify: FastifyInstance) {
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
      NODE_ENV,
    } = fastify.config;

    // Validate required environment variables
    const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER'];
    if (NODE_ENV === 'production') {
      requiredEnvVars.push('DB_PASSWORD');
    }

    for (const envVar of requiredEnvVars) {
      if (!(fastify.config as any)[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }

    // Set defaults for pool configuration
    const poolMin = parseInt(DB_POOL_MIN || '2', 10);
    const poolMax = parseInt(
      DB_POOL_MAX || (NODE_ENV === 'production' ? '50' : '10'),
      10
    );

    // Configure Knex connection
    let knexConfig: Knex.Knex.Config;

    if (DB_CONNECTION_STRING) {
      // Use connection string if provided
      knexConfig = {
        client: 'pg',
        connection: DB_CONNECTION_STRING,
        debug: NODE_ENV === 'development',
        pool: {
          min: poolMin,
          max: poolMax,
        },
        migrations: {
          directory: './apps/api/src/app/infrastructure/database/migrations',
          extension: 'ts',
          loadExtensions: ['.ts'],
        },
        seeds: {
          directory: './apps/api/src/app/infrastructure/database/seeds',
          loadExtensions: ['.ts'],
        },
      };
    } else {
      // Use individual connection parameters
      knexConfig = {
        client: 'pg',
        debug: NODE_ENV === 'development',
        connection: {
          host: DB_HOST,
          port: parseInt(DB_PORT, 10),
          database: DB_NAME,
          user: DB_USER,
          password: DB_PASSWORD,
          ssl: DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        },
        pool: {
          min: poolMin,
          max: poolMax,
        },
        migrations: {
          directory: './apps/api/src/app/infrastructure/database/migrations',
          extension: 'ts',
          loadExtensions: ['.ts'],
        },
        seeds: {
          directory: './apps/api/src/app/infrastructure/database/seeds',
          loadExtensions: ['.ts'],
        },
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
        },
      };
    }

    // Create Knex instance
    const knex = Knex(knexConfig);
    /*
        knex.on('query', (query) => {
          console.log('SQL:', query.sql);
          console.log('Bindings:', query.bindings);
        });

        knex.on('query-response', (response, query) => {
          console.log('Response:', response);
        });

        knex.on('query-error', (error, query) => {
          console.error('Error:', error);
        });
    */

    fastify.log.info('✅ Knex plugin registered');

    // Test database connection
    try {
      fastify.log.info('🔌 Testing database connection...');
      await knex.raw('SELECT 1');
      fastify.log.info('✅ Database connection established successfully');
    } catch (error: any) {
      if (NODE_ENV === 'production') {
        throw new Error(`Database connection failed: ${error.message}`);
      } else if (NODE_ENV !== 'test') {
        fastify.log.error(
          '❌ Database connection failed, but continuing in development mode'
        );
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
      },
    });

    // Graceful shutdown
    fastify.addHook('onClose', async () => {
      fastify.log.info('Closing database connection...');
      await knex.destroy();
    });
  },
  {
    name: 'knex-plugin',
  }
);
