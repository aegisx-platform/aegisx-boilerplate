# Coding Standards & Best Practices

## File Naming Conventions

### TypeScript Files
- **Controllers**: `*-controller.ts` (e.g., `user-controller.ts`)
- **Services**: `*-service.ts` (e.g., `notification-service.ts`)
- **Repositories**: `*-repository.ts` (e.g., `user-repository.ts`)
- **Schemas**: `*-schemas.ts` (e.g., `auth-schemas.ts`)
- **Types**: `*-types.ts` or `*-domain.types.ts`
- **Routes**: `*-routes.ts` (e.g., `user-routes.ts`)

### Folders
- **Kebab Case**: `user-management`, `patient-management`, `api-key-controller`
- **Domain Names**: Use descriptive, business-focused names
- **Plural for Collections**: `controllers`, `services`, `repositories`

### Classes & Interfaces
- **PascalCase**: `AuthController`, `UserService`, `NotificationData`
- **Interfaces**: Use descriptive names without `I` prefix
- **Enums**: PascalCase with descriptive names

## Architecture Patterns

### 4-Layer Architecture
Follow the established layer hierarchy:

1. **Core Layer**: Infrastructure, plugins, shared utilities
2. **Domains Layer**: Core business logic (auth, user-management)
3. **Features Layer**: Advanced features (reports, workflows)
4. **Infrastructure Layer**: External integrations

### Domain Structure
Every domain must follow this pattern:
```
domain-name/
├── controllers/     # HTTP request handlers
├── services/        # Business logic
├── repositories/    # Data access layer
├── schemas/         # TypeBox validation
├── types/          # TypeScript interfaces
├── routes/         # Route definitions
└── index.ts        # Module exports
```

## Code Organization

### Import Order
```typescript
// 1. Node.js built-in modules
import * as path from 'path';
import * as fs from 'fs';

// 2. Third-party dependencies
import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

// 3. Internal imports - absolute paths
import { UserService } from '../services/user-service';
import { UserRepository } from '../repositories/user-repository';

// 4. Types and interfaces
import { UserData, CreateUserRequest } from '../types/user-types';
```

### Export Patterns
```typescript
// index.ts - Barrel exports
export { UserController } from './controllers/user-controller';
export { UserService } from './services/user-service';
export { UserRepository } from './repositories/user-repository';
export * from './types/user-types';
```

## Integration Patterns

### ALWAYS Use Existing Services
Before creating new functionality, check and integrate with existing systems:

```typescript
// ✅ DO: Use existing Event Bus
await fastify.eventBus.publish('user.created', userData);

// ✅ DO: Use existing Audit System
await fastify.auditLog.log({
  action: 'user.create',
  resource: 'users',
  resourceId: userId
});

// ✅ DO: Use existing Structured Logging
fastify.log.info('User registration completed', {
  correlationId: request.id,
  userId: user.id,
  operation: 'user.register'
});

// ❌ DON'T: Create new infrastructure
console.log('User created'); // Wrong!
```

### Service Integration Examples
```typescript
// Notification service
await fastify.notification.send('email', recipient, template, data);

// Metrics collection
await fastify.metrics.recordEvent('user_registration', metadata);

// Retry with circuit breaker
await fastify.circuitBreaker.execute('external-api', async () => {
  return await fastify.retry.execute(operationFunction);
});

// Storage with image processing
const uploadResult = await fastify.storage.upload({
  file: buffer,
  filename: 'profile.jpg',
  mimeType: 'image/jpeg'
});
```

## Validation & Error Handling

### TypeBox Schemas
```typescript
// Define schemas for validation
export const CreateUserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8 }),
  fullName: Type.String({ minLength: 2 }),
  role: Type.Optional(Type.String())
});

export const UserResponseSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  fullName: Type.String(),
  role: Type.String(),
  createdAt: Type.String()
});
```

### Error Handling
```typescript
// Controller error handling
async function createUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userData = request.body as CreateUserRequest;
    const user = await userService.createUser(userData);
    
    // Publish event
    await fastify.eventBus.publish('user.created', user);
    
    return reply.status(201).send(user);
  } catch (error) {
    if (error.code === 'DUPLICATE_EMAIL') {
      return reply.status(409).send({
        error: 'Email already exists',
        code: 'DUPLICATE_EMAIL'
      });
    }
    
    // Let Fastify handle unexpected errors
    throw error;
  }
}
```

## Database Patterns

### Repository Pattern
```typescript
// User repository
export class UserRepository {
  constructor(private db: Knex) {}

  async create(userData: CreateUserData): Promise<UserData> {
    const [user] = await this.db('users')
      .insert(userData)
      .returning('*');
    
    return user;
  }

  async findById(id: string): Promise<UserData | null> {
    return await this.db('users')
      .where({ id })
      .first();
  }

  async findByEmail(email: string): Promise<UserData | null> {
    return await this.db('users')
      .where({ email })
      .first();
  }
}
```

### Service Layer
```typescript
// User service
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private eventBus: EventBus
  ) {}

  async createUser(userData: CreateUserRequest): Promise<UserData> {
    // Check for existing user
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('DUPLICATE_EMAIL');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword
    });

    // Publish event
    await this.eventBus.publish('user.created', user);

    return user;
  }
}
```

## Testing Standards

### Unit Tests
```typescript
// user-service.test.ts
describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn()
    } as any;

    mockEventBus = {
      publish: jest.fn()
    } as any;

    userService = new UserService(mockRepository, mockEventBus);
  });

  describe('createUser', () => {
    it('should create user and publish event', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User'
      };

      const createdUser = { id: '1', ...userData };
      mockRepository.create.mockResolvedValue(createdUser);
      mockRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.createUser(userData);

      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith('user.created', createdUser);
      expect(result).toEqual(createdUser);
    });
  });
});
```

## Documentation Standards

### JSDoc Comments
```typescript
/**
 * Creates a new user in the system
 * @param userData - User data for creation
 * @returns Promise<UserData> - Created user data
 * @throws {Error} - When email already exists
 */
async createUser(userData: CreateUserRequest): Promise<UserData> {
  // Implementation
}
```

### API Documentation
```typescript
// Route documentation
fastify.post('/users', {
  schema: {
    summary: 'Create a new user',
    description: 'Creates a new user account with the provided information',
    tags: ['Users'],
    body: CreateUserSchema,
    response: {
      201: UserResponseSchema,
      409: Type.Object({
        error: Type.String(),
        code: Type.String()
      })
    }
  }
}, createUser);
```

## Security Best Practices

### Input Validation
```typescript
// Always validate input
const schema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 100 })
});

// Sanitize data
const sanitizedData = sanitize(request.body);
```

### Authentication & Authorization
```typescript
// Use existing RBAC system
fastify.register(require('../plugins/rbac'), {
  permissions: ['users:create:own']
});

// Check permissions in handlers
if (!request.user.hasPermission('users:create:own')) {
  return reply.status(403).send({ error: 'Insufficient permissions' });
}
```

## Do's and Don'ts

### ✅ DO
- Use existing infrastructure services
- Follow 4-layer architecture
- Validate all inputs with TypeBox
- Use structured logging
- Implement proper error handling
- Write comprehensive tests
- Document public APIs
- Use TypeScript strict mode
- Follow naming conventions
- Integrate with Event Bus for cross-domain communication

### ❌ DON'T
- Create new infrastructure when existing services work
- Use `console.log` (use structured logging)
- Import directly between domains (use Event Bus)
- Use `any` type
- Skip input validation
- Ignore error handling
- Use relative imports for internal modules
- Create circular dependencies
- Skip documentation
- Commit secrets or sensitive data

## Code Review Checklist

- [ ] Follows established architecture patterns
- [ ] Uses existing infrastructure services
- [ ] Proper error handling implemented
- [ ] Input validation with TypeBox
- [ ] Comprehensive test coverage
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Follows naming conventions
- [ ] TypeScript strict mode compliant
- [ ] Event Bus integration where needed