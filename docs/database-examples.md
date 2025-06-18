# Database API Examples

This guide provides practical examples of using the Knex PostgreSQL plugin in your API routes.

## Table of Contents

- [Basic CRUD Operations](#basic-crud-operations)
- [Advanced Queries](#advanced-queries)
- [Transaction Examples](#transaction-examples)
- [Authentication Integration](#authentication-integration)
- [Error Handling](#error-handling)
- [Performance Tips](#performance-tips)

## Basic CRUD Operations

### User Management Routes

```typescript
// apps/api/src/app/routes/users.ts
import { FastifyInstance } from 'fastify';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export default async function userRoutes(fastify: FastifyInstance) {
  // GET /users - List all users
  fastify.get('/users', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              created_at: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  }, async () => {
    return await fastify.knex('users')
      .select('id', 'name', 'email', 'created_at')
      .orderBy('created_at', 'desc');
  });

  // GET /users/:id - Get user by ID
  fastify.get<{ Params: { id: string } }>('/users/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id']
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    
    const user = await fastify.knex('users')
      .select('id', 'name', 'email', 'created_at')
      .where('id', id)
      .first();

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return user;
  });

  // POST /users - Create new user
  fastify.post<{ Body: { name: string; email: string } }>('/users', {
    schema: {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' }
        },
        required: ['name', 'email']
      }
    }
  }, async (request, reply) => {
    const { name, email } = request.body;

    try {
      const [user] = await fastify.knex('users')
        .insert({
          name,
          email,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning(['id', 'name', 'email', 'created_at']);

      return reply.code(201).send(user);
    } catch (error: any) {
      if (error.code === '23505') { // PostgreSQL unique violation
        return reply.code(409).send({ error: 'Email already exists' });
      }
      throw error;
    }
  });

  // PUT /users/:id - Update user
  fastify.put<{ 
    Params: { id: string }; 
    Body: { name?: string; email?: string } 
  }>('/users/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const updateData = request.body;

    const [user] = await fastify.knex('users')
      .where('id', id)
      .update({
        ...updateData,
        updated_at: new Date()
      })
      .returning(['id', 'name', 'email', 'updated_at']);

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return user;
  });

  // DELETE /users/:id - Delete user
  fastify.delete<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const { id } = request.params;

    const deletedCount = await fastify.knex('users')
      .where('id', id)
      .del();

    if (deletedCount === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return reply.code(204).send();
  });
}
```

## Advanced Queries

### Complex Filtering and Pagination

```typescript
// GET /users with advanced filtering
fastify.get<{
  Querystring: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }
}>('/users', async (request) => {
  const {
    page = 1,
    limit = 20,
    search,
    sort = 'created_at',
    order = 'desc'
  } = request.query;

  const offset = (page - 1) * limit;

  let query = fastify.knex('users')
    .select('id', 'name', 'email', 'created_at');

  // Apply search filter
  if (search) {
    query = query.where(function() {
      this.where('name', 'ilike', `%${search}%`)
          .orWhere('email', 'ilike', `%${search}%`);
    });
  }

  // Apply sorting and pagination
  const users = await query
    .orderBy(sort, order)
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [{ count }] = await fastify.knex('users')
    .count('* as count')
    .modify((builder) => {
      if (search) {
        builder.where(function() {
          this.where('name', 'ilike', `%${search}%`)
              .orWhere('email', 'ilike', `%${search}%`);
        });
      }
    });

  const total = parseInt(count as string);
  const totalPages = Math.ceil(total / limit);

  return {
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
});
```

### Joins and Relations

```typescript
// GET /users/:id/posts - Get user with their posts
fastify.get<{ Params: { id: string } }>('/users/:id/posts', async (request) => {
  const { id } = request.params;

  const userWithPosts = await fastify.knex('users')
    .select(
      'users.id',
      'users.name',
      'users.email',
      fastify.knex.raw('json_agg(posts.*) as posts')
    )
    .leftJoin('posts', 'users.id', 'posts.user_id')
    .where('users.id', id)
    .groupBy('users.id', 'users.name', 'users.email')
    .first();

  if (!userWithPosts) {
    throw fastify.httpErrors.notFound('User not found');
  }

  return userWithPosts;
});

// GET /posts with user info
fastify.get('/posts', async () => {
  return await fastify.knex('posts')
    .select(
      'posts.*',
      'users.name as author_name',
      'users.email as author_email'
    )
    .join('users', 'posts.user_id', 'users.id')
    .orderBy('posts.created_at', 'desc');
});
```

## Transaction Examples

### Financial Operations

```typescript
// POST /transfer - Transfer money between accounts
fastify.post<{
  Body: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
  }
}>('/transfer', {
  schema: {
    body: {
      type: 'object',
      properties: {
        fromAccountId: { type: 'string', format: 'uuid' },
        toAccountId: { type: 'string', format: 'uuid' },
        amount: { type: 'number', minimum: 0.01 }
      },
      required: ['fromAccountId', 'toAccountId', 'amount']
    }
  }
}, async (request, reply) => {
  const { fromAccountId, toAccountId, amount } = request.body;

  try {
    const result = await fastify.db.transaction(async (trx) => {
      // Check sender's balance
      const fromAccount = await trx('accounts')
        .select('balance')
        .where('id', fromAccountId)
        .first();

      if (!fromAccount || fromAccount.balance < amount) {
        throw fastify.httpErrors.badRequest('Insufficient balance');
      }

      // Deduct from sender
      await trx('accounts')
        .where('id', fromAccountId)
        .decrement('balance', amount);

      // Add to receiver
      await trx('accounts')
        .where('id', toAccountId)
        .increment('balance', amount);

      // Create transaction record
      const [transaction] = await trx('transactions')
        .insert({
          from_account_id: fromAccountId,
          to_account_id: toAccountId,
          amount,
          type: 'transfer',
          created_at: new Date()
        })
        .returning('*');

      return transaction;
    });

    return reply.code(201).send(result);
  } catch (error) {
    if (error.statusCode) {
      throw error; // Re-throw HTTP errors
    }
    throw fastify.httpErrors.internalServerError('Transfer failed');
  }
});
```

### Order Processing

```typescript
// POST /orders - Create order with items
fastify.post<{
  Body: {
    items: Array<{ productId: string; quantity: number; price: number }>;
    customerId: string;
  }
}>('/orders', async (request, reply) => {
  const { items, customerId } = request.body;
  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const order = await fastify.db.transaction(async (trx) => {
    // Create the order
    const [newOrder] = await trx('orders')
      .insert({
        customer_id: customerId,
        total_amount: totalAmount,
        status: 'pending',
        created_at: new Date()
      })
      .returning('*');

    // Check inventory and reduce stock
    for (const item of items) {
      const product = await trx('products')
        .select('stock_quantity')
        .where('id', item.productId)
        .first();

      if (!product || product.stock_quantity < item.quantity) {
        throw fastify.httpErrors.badRequest(`Insufficient stock for product ${item.productId}`);
      }

      // Reduce stock
      await trx('products')
        .where('id', item.productId)
        .decrement('stock_quantity', item.quantity);
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: newOrder.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity
    }));

    await trx('order_items').insert(orderItems);

    return newOrder;
  });

  return reply.code(201).send(order);
});
```

## Authentication Integration

### Protected Routes with JWT

```typescript
// Protected user profile routes
export default async function protectedRoutes(fastify: FastifyInstance) {
  // Add authentication hook to all routes in this context
  fastify.addHook('preHandler', fastify.authenticate);

  // GET /profile - Get current user profile
  fastify.get('/profile', async (request) => {
    const userId = request.user.id;

    const profile = await fastify.knex('users')
      .select('id', 'name', 'email', 'created_at')
      .where('id', userId)
      .first();

    if (!profile) {
      throw fastify.httpErrors.notFound('Profile not found');
    }

    return profile;
  });

  // PUT /profile - Update current user profile
  fastify.put<{ Body: { name?: string; email?: string } }>('/profile', async (request) => {
    const userId = request.user.id;
    const updates = request.body;

    const [updatedProfile] = await fastify.knex('users')
      .where('id', userId)
      .update({
        ...updates,
        updated_at: new Date()
      })
      .returning(['id', 'name', 'email', 'updated_at']);

    return updatedProfile;
  });
}
```

## Error Handling

### Database Error Handling

```typescript
// Centralized error handler for database operations
function handleDatabaseError(error: any, reply: any) {
  // PostgreSQL specific errors
  switch (error.code) {
    case '23505': // Unique violation
      return reply.code(409).send({
        error: 'Duplicate entry',
        message: 'A record with this value already exists'
      });
    
    case '23503': // Foreign key violation
      return reply.code(400).send({
        error: 'Reference error',
        message: 'Referenced record does not exist'
      });
    
    case '23514': // Check constraint violation
      return reply.code(400).send({
        error: 'Validation error',
        message: 'Data violates database constraints'
      });
    
    case '22001': // String data right truncation
      return reply.code(400).send({
        error: 'Data too long',
        message: 'Input data exceeds maximum length'
      });
    
    default:
      // Log unexpected errors
      fastify.log.error('Database error:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      });
  }
}

// Usage in routes
fastify.post('/users', async (request, reply) => {
  try {
    const result = await fastify.knex('users').insert(request.body);
    return result;
  } catch (error) {
    return handleDatabaseError(error, reply);
  }
});
```

## Performance Tips

### Query Optimization

```typescript
// Efficient counting with filtering
async function getUsersWithPagination(fastify: FastifyInstance, filters: any) {
  // Use a single query for both data and count
  const result = await fastify.knex.raw(`
    SELECT 
      users.*,
      COUNT(*) OVER() as total_count
    FROM users
    WHERE (:search IS NULL OR name ILIKE :search OR email ILIKE :search)
    ORDER BY created_at DESC
    LIMIT :limit OFFSET :offset
  `, {
    search: filters.search ? `%${filters.search}%` : null,
    limit: filters.limit,
    offset: filters.offset
  });

  const users = result.rows;
  const totalCount = users.length > 0 ? parseInt(users[0].total_count) : 0;

  return {
    data: users.map(({ total_count, ...user }) => user),
    total: totalCount
  };
}

// Batch operations
async function createMultipleUsers(users: any[]) {
  // Use batch insert instead of multiple individual inserts
  return await fastify.knex('users')
    .insert(users)
    .returning('*');
}

// Connection pooling optimization
async function healthyConnectionCheck() {
  // Use simple query for health checks
  await fastify.knex.raw('SELECT 1');
}
```

### Indexing Examples

```sql
-- Create indexes for better query performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at DESC);
CREATE INDEX CONCURRENTLY idx_posts_user_id ON posts(user_id);
CREATE INDEX CONCURRENTLY idx_posts_created_at ON posts(created_at DESC);

-- Composite indexes for complex queries
CREATE INDEX CONCURRENTLY idx_users_name_email ON users(name, email);
CREATE INDEX CONCURRENTLY idx_orders_customer_status ON orders(customer_id, status);
```

This documentation provides comprehensive examples for using the Knex PostgreSQL plugin effectively in your Fastify API.
