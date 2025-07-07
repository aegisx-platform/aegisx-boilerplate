# Database Quick Start Guide

## 🚀 Getting Started with PostgreSQL + Knex

### Step 1: Start Database Services

```bash
# Copy environment configuration
cp .env.example .env

# Start PostgreSQL with Docker
docker-compose up -d postgres

# Optional: Start with pgAdmin for database management
docker-compose up -d
```

### Step 2: Verify Connection

```bash
# Check if containers are running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Test API server (will auto-connect to database)
nx serve api
```

### Step 3: Create Your First Migration

```bash
# Navigate to API directory
cd apps/api

# Create a users table migration
npx knex migrate:make create_users_table

# Edit the migration file in database/migrations/
# Run the migration
npx knex migrate:latest
```

### Step 4: Use in Your Routes

```typescript
// apps/api/src/app/routes/users.ts
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  // GET /users
  fastify.get('/users', async () => {
    return await fastify.knex('users').select('*');
  });

  // POST /users
  fastify.post('/users', async (request) => {
    const userData = request.body;
    const [user] = await fastify.knex('users')
      .insert(userData)
      .returning('*');
    return user;
  });
}
```

## 🔗 Useful Links

- [📖 Full Database Documentation](./database.md)
- [🐳 Docker Setup Guide](../docker/README.md)
- [🔧 Environment Configuration](../.env.example)
- [🌐 pgAdmin Interface](http://localhost:8080) (when running)

## 🆘 Need Help?

- **Database won't start?** Check [Docker troubleshooting](../docker/README.md#troubleshooting)
- **Connection errors?** See [Database troubleshooting](./database.md#troubleshooting)
- **Migration issues?** Check [Schema management guide](./database.md#database-schema-management)
