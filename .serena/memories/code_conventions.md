# Code Conventions and Style Guide

## TypeScript Configuration
- **TypeScript**: Version 5.9 with strict type checking
- **Target**: Bun runtime with ES modules
- **Path Aliases**: 
  - `@/*` maps to `src/*`
  - `@/modules/*` for feature modules
  - `@/shared/*` for shared utilities

## Code Style (Enforced by Biome)
- **Indentation**: 2 spaces (no tabs)
- **Line Width**: Maximum 100 characters
- **Quotes**: Single quotes for strings
- **Semicolons**: As needed (ASI-friendly)
- **Formatting**: Biome handles all formatting automatically

## Architectural Patterns

### 1. Module Structure
Each module follows Domain-Driven Design:
```typescript
modules/[feature]/
  ├── routes.ts     # Hono route definitions with OpenAPI specs
  ├── service.ts    # Business logic in service classes
  ├── types.ts      # TypeScript interfaces and types
  └── utils.ts      # Module-specific utilities
```

### 2. Route Definition Pattern
```typescript
// Standard route pattern with OpenAPI integration
const featureRoutes = new Hono()

featureRoutes.get('/', {
  tags: [FEATURE_TAG],
  summary: 'Get all items',
  security: [{ bearerAuth: [] }],
}, requireAuth, async (c) => {
  // Implementation
})

export { featureRoutes }
```

### 3. Service Class Pattern
```typescript
class FeatureService {
  async getAll(params: QueryParams) {
    // Business logic
  }
  
  async getById(id: number) {
    // Implementation
  }
  
  async create(data: CreateDTO) {
    // Implementation
  }
  
  async update(id: number, data: UpdateDTO) {
    // Implementation
  }
  
  async delete(id: number) {
    // Implementation
  }
}

export const featureService = new FeatureService()
```

### 4. Error Handling
Custom error classes extending AppError:
```typescript
throw new NotFoundError('Resource not found')
throw new BadRequestError('Invalid input')
throw new UnauthorizedError('Not authenticated')
throw new ForbiddenError('Not authorized')
```

### 5. Schema Validation
Using Zod with OpenAPI extensions:
```typescript
const schema = z.object({
  name: z.string().openapi({ description: 'Item name' }),
  value: z.number().optional()
})
```

### 6. Database Schema Pattern
Drizzle ORM with PostgreSQL:
```typescript
export const tableName = pgTable('table_name', {
  id: serial('id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})
```

## Naming Conventions
- **Files**: kebab-case (e.g., `user-service.ts`)
- **Classes**: PascalCase (e.g., `UserService`)
- **Functions/Methods**: camelCase (e.g., `getUserById`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_VERSION`)
- **Interfaces/Types**: PascalCase with 'I' or 'T' prefix optional
- **Database Tables**: snake_case (e.g., `user_profiles`)
- **Route Tags**: UPPER_SNAKE_CASE (e.g., `USERS_TAG`)

## Import Order
1. External packages
2. Shared utilities and configs
3. Module-specific imports
4. Types and interfaces

## Best Practices
1. **No Comments**: Code should be self-documenting
2. **Type Safety**: Always use TypeScript types, avoid `any`
3. **Error Handling**: Use custom error classes consistently
4. **Async/Await**: Prefer over promises
5. **Early Returns**: Use guard clauses to reduce nesting
6. **Pure Functions**: Minimize side effects where possible
7. **Service Layer**: Keep business logic in service classes
8. **Validation**: Use Zod schemas for all input validation
9. **Security**: Never expose secrets, always validate input
10. **Vietnamese Text**: Use Vietnamese for user-facing error messages

## Testing Conventions
- Test files: `*.test.ts` in `/tests` directory
- Use Bun's built-in test runner
- Focus on integration tests over unit tests
- Test critical business logic and API endpoints