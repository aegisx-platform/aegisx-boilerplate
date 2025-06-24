# AegisX Nx Generators

Custom Nx generators for rapid development with AegisX boilerplate.

## Available Generators

### Domain Generator
```bash
nx g @aegisx-boilerplate/generators:domain <domain-name>
```
Creates a complete domain with:
- Controller
- Service  
- Repository
- Schemas (request/response validation)
- Routes
- Types
- Unit tests

### Feature Generator
```bash
nx g @aegisx-boilerplate/generators:feature <feature-name>
```
Creates a feature module under `/features/` with full structure.

### CRUD Generator
```bash
nx g @aegisx-boilerplate/generators:crud <entity-name>
```
Generates complete CRUD operations:
- GET /entities (list with pagination)
- GET /entities/:id (get by ID)
- POST /entities (create)
- PUT /entities/:id (update)
- DELETE /entities/:id (delete)

Options:
- `--auth` - Add authentication middleware
- `--rbac` - Add RBAC permissions
- `--audit` - Add audit logging

### Route Generator
```bash
nx g @aegisx-boilerplate/generators:route <route-name>
```
Creates authenticated and RBAC-enabled route with:
- Input validation schemas
- Response schemas
- Error handling
- Documentation

### Migration Generator
```bash
nx g @aegisx-boilerplate/generators:migration <migration-name>
```
Creates Knex migration file with timestamp.

### Test Generator
```bash
nx g @aegisx-boilerplate/generators:test <test-type> <target>
```
Types: `unit`, `integration`, `e2e`

## Usage Examples

```bash
# Create a complete user management domain
nx g @aegisx-boilerplate/generators:domain user-management

# Create CRUD for products with auth and RBAC
nx g @aegisx-boilerplate/generators:crud product --auth --rbac --audit

# Create a feature for reporting
nx g @aegisx-boilerplate/generators:feature reporting

# Generate migration for new table
nx g @aegisx-boilerplate/generators:migration create_products_table

# Generate tests for existing service
nx g @aegisx-boilerplate/generators:test unit user-service
```

## Generator Structure

Each generator follows this structure:
```
tools/generators/<generator-name>/
├── index.ts          # Generator implementation
├── schema.json       # Generator options schema
├── files/           # Template files
│   ├── __name__.controller.ts.template
│   ├── __name__.service.ts.template
│   └── ...
└── README.md        # Generator-specific documentation
```

## Development

To create a new generator:

```bash
nx g @nx/plugin:generator <generator-name>
```

See individual generator READMEs for detailed implementation guides.