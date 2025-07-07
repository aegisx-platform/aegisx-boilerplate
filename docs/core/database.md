# Knex PostgreSQL Plugin Documentation

## Overview

The Knex plugin provides PostgreSQL database integration for the Fastify API using [Knex.js](https://knexjs.org/). It includes connection management, health checking, transaction utilities, and development-friendly configuration.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Database Schema Management](#database-schema-management)
- [Docker Setup](#docker-setup)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Features

✅ **PostgreSQL Integration**: Full PostgreSQL support with connection pooling  
✅ **Environment Configuration**: Flexible config via environment variables  
✅ **Health Monitoring**: Built-in database health checks  
✅ **Transaction Support**: Safe transaction management with auto-rollback  
✅ **Development Mode**: Skip database connection for testing without DB  
✅ **TypeScript Support**: Full type safety and IntelliSense  
✅ **Docker Ready**: Includes Docker Compose setup  
✅ **Migration System**: Schema management with Knex migrations  

## Installation

The plugin is already installed and configured. Dependencies include:

```json
{
  "knex": "^3.1.0",
  "pg": "^8.11.3",
  "@types/pg": "^8.11.0"
}
```

## Configuration

### Environment Variables

Configure the database connection in your `.env` file:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aegisx_db
DB_USER=postgres
DB_PASSWORD=postgres123
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# Alternative: Use connection string
# DB_CONNECTION_STRING=postgresql://user:password@host:5432/database
```

### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `aegisx_db` | Database name |
| `DB_USER` | `postgres` | Database username |
| `DB_PASSWORD` | - | Database password |
| `DB_SSL` | `false` | Enable SSL connection |
| `DB_POOL_MIN` | `2` | Minimum pool connections |
| `DB_POOL_MAX` | `10` | Maximum pool connections |
| `DB_CONNECTION_STRING` | - | Full connection string (optional) |

## Usage

### Basic Database Operations

```typescript
// In your route handler
export default async function (fastify: FastifyInstance) {
  // Direct Knex access
  const users = await fastify.knex('users').select('*');
  
  // With query builder
  const user = await fastify.knex('users')
    .where('email', 'user@example.com')
    .first();
    
  // Insert data
  const [newUser] = await fastify.knex('users')
    .insert({
      name: 'John Doe',
      email: 'john@example.com'
    })
    .returning('*');
}
```

### Health Check Usage

```typescript
// In a route
fastify.get('/health', async (request, reply) => {
  const dbHealthy = await fastify.db.healthCheck();
  
  return {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    database: dbHealthy,
    timestamp: new Date().toISOString()
  };
});
```

### Transaction Management

```typescript
// Safe transaction with auto-rollback on error
const result = await fastify.db.transaction(async (trx) => {
  // All operations use the same transaction
  const user = await trx('users').insert({
    name: 'Jane Doe',
    email: 'jane@example.com'
  }).returning('*');
  
  await trx('user_profiles').insert({
    user_id: user[0].id,
    bio: 'Software Developer'
  });
  
  // If any operation fails, entire transaction is rolled back
  return user[0];
});
```

## API Reference

### FastifyInstance Extensions

The plugin adds the following to the Fastify instance:

#### `fastify.knex`
- **Type**: `Knex.Knex`
- **Description**: Direct access to the Knex instance
- **Usage**: `fastify.knex('table_name').select('*')`

#### `fastify.db.healthCheck()`
- **Type**: `() => Promise<boolean>`
- **Description**: Checks database connectivity
- **Returns**: `true` if database is accessible, `false` otherwise
- **Usage**: `const isHealthy = await fastify.db.healthCheck()`

#### `fastify.db.transaction(callback)`
- **Type**: `<T>(callback: (trx: Knex.Transaction) => Promise<T>) => Promise<T>`
- **Description**: Executes operations within a database transaction
- **Parameters**: 
  - `callback`: Function that receives transaction object
- **Returns**: Result of the callback function
- **Usage**: `await fastify.db.transaction(async (trx) => { ... })`

### TypeScript Declarations

The plugin extends the Fastify types:

```typescript
declare module 'fastify' {
  interface FastifyInstance {
    knex: Knex.Knex;
    db: {
      healthCheck: () => Promise<boolean>;
      transaction: <T>(callback: (trx: Knex.Knex.Transaction) => Promise<T>) => Promise<T>;
    };
  }
}
```

## Database Schema Management

### Knex Configuration

The plugin uses `knexfile.ts` for CLI operations:

```typescript
// Located at: apps/api/knexfile.ts
export default {
  development: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      database: 'aegisx_db',
      user: 'postgres',
      password: 'postgres123'
    },
    migrations: {
      directory: './database/migrations'
    },
    seeds: {
      directory: './database/seeds'
    }
  }
}
```

### Migration Commands

```bash
# Create a new migration
npx knex migrate:make create_users_table

# Run pending migrations
npx knex migrate:latest

# Rollback last migration
npx knex migrate:rollback

# Check migration status
npx knex migrate:status
```

### Seed Commands

```bash
# Create a seed file
npx knex seed:make 001_users

# Run all seeds
npx knex seed:run
```

### Example Migration

```typescript
// database/migrations/20231201000000_create_users_table.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('email').unique().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('users');
}
```

## Docker Setup

### Starting the Database

```bash
# Start PostgreSQL with Docker Compose
docker-compose up -d postgres

# Start all services (including pgAdmin)
docker-compose up -d

# View logs
docker-compose logs -f postgres
```

### Database Services

| Service | Port | Database | Credentials |
|---------|------|----------|-------------|
| **Main Database** | 5432 | `aegisx_db` | postgres/postgres123 |
| **Test Database** | 5433 | `aegisx_db_test` | postgres/postgres123 |
| **pgAdmin** | 8080 | - | admin@aegisx.com/admin123 |

### Connection Strings

```bash
# Development
postgresql://postgres:postgres123@localhost:5432/aegisx_db

# Test
postgresql://postgres:postgres123@localhost:5433/aegisx_db_test

# pgAdmin Web Interface
http://localhost:8080
```

## Best Practices

### 1. Always Use Transactions for Multi-Step Operations

```typescript
// ✅ Good: Using transaction
await fastify.db.transaction(async (trx) => {
  await trx('accounts').where('id', fromId).decrement('balance', amount);
  await trx('accounts').where('id', toId).increment('balance', amount);
  await trx('transactions').insert({ from: fromId, to: toId, amount });
});

// ❌ Bad: Separate operations
await fastify.knex('accounts').where('id', fromId).decrement('balance', amount);
await fastify.knex('accounts').where('id', toId).increment('balance', amount);
await fastify.knex('transactions').insert({ from: fromId, to: toId, amount });
```

### 2. Use Connection Pooling Appropriately

```typescript
// Pool configuration in environment
DB_POOL_MIN=2     // For development
DB_POOL_MAX=10    // For development

DB_POOL_MIN=5     // For production
DB_POOL_MAX=50    // For production
```

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await fastify.knex('users').insert(userData);
  return { success: true, data: result };
} catch (error) {
  if (error.code === '23505') { // PostgreSQL unique violation
    return reply.code(409).send({ error: 'Email already exists' });
  }
  throw error; // Re-throw unexpected errors
}
```

### 4. Use Health Checks in Production

```typescript
// Integrate with under-pressure plugin
healthCheck: async function () {
  const dbHealthy = await fastify.db.healthCheck();
  return { 
    status: dbHealthy ? 'ok' : 'error',
    database: dbHealthy 
  };
}
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**: Start PostgreSQL with `docker-compose up -d postgres`

#### 2. Plugin Dependency Error
```
The dependency 'env-plugin' of plugin 'knex-plugin' is not registered
```
**Solution**: Ensure env plugin has a name and is loaded before knex plugin

#### 3. Migration Files Not Found
```
Error: Migration directory not found
```
**Solution**: Create directory `apps/api/database/migrations/`

#### 4. Permission Denied
```
Error: permission denied for relation users
```
**Solution**: Check database user permissions and connection credentials

### Debug Mode

Enable debug logging in development:

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

### Testing Without Database

The plugin automatically skips database connection in development mode, allowing you to run tests without a database:

```typescript
// Set in test environment
NODE_ENV=test
```

## Integration Examples

### With Swagger Documentation

```typescript
// In your route with schema
fastify.get('/users/:id', {
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      }
    }
  }
}, async (request) => {
  const { id } = request.params;
  const user = await fastify.knex('users').where('id', id).first();
  
  if (!user) {
    throw fastify.httpErrors.notFound('User not found');
  }
  
  return user;
});
```

### With JWT Authentication

```typescript
fastify.get('/profile', {
  preHandler: [fastify.authenticate]
}, async (request) => {
  const userId = request.user.id;
  
  const profile = await fastify.knex('users')
    .select('id', 'name', 'email', 'created_at')
    .where('id', userId)
    .first();
    
  return profile;
});
```

### Performance Monitoring

```typescript
// Add query timing
fastify.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

fastify.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  fastify.log.info(`Request completed in ${duration}ms`);
});
```

---

For more advanced usage and configuration options, refer to the [Knex.js official documentation](https://knexjs.org/).
