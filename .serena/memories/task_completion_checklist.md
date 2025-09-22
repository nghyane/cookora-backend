# Task Completion Checklist

When completing any coding task in the Cookora Backend project, follow this checklist:

## Before Starting
1. Understand the task requirements fully
2. Check existing code patterns in similar modules
3. Review relevant schema definitions and types
4. Identify affected modules and dependencies

## During Development
1. Follow the established module structure (routes, service, types)
2. Use TypeScript types strictly - no `any` types
3. Implement proper error handling with custom error classes
4. Add Zod validation schemas for all inputs
5. Include OpenAPI documentation in route definitions
6. Follow Vietnamese text conventions for user messages

## After Implementation

### 1. Code Quality Checks (MANDATORY)
```bash
# Run Biome formatter and linter with auto-fix
bun run check

# If specific linting needed
bun run lint

# If specific formatting needed  
bun run format
```

### 2. Testing
```bash
# Run all tests
bun test

# Run specific test if added
bun test [test-file]
```

### 3. Database Changes (if applicable)
```bash
# Generate migrations if schema changed
bun run db:generate

# Apply migrations
bun run db:migrate
```

### 4. Verify Functionality
```bash
# Start development server
bun run dev

# Test endpoints manually or via API docs
# Access http://localhost:3000/docs
```

### 5. Type Checking
- Ensure no TypeScript errors in IDE
- Verify all imports resolve correctly
- Check that path aliases work properly

### 6. Security Review
- No hardcoded secrets or credentials
- Input validation implemented
- Authentication/authorization properly applied
- SQL injection prevention via parameterized queries

### 7. Performance Considerations
- Efficient database queries (avoid N+1)
- Proper use of indexes
- Redis caching where appropriate
- Pagination for list endpoints

### 8. Documentation Updates
- Update OpenAPI specs if API changed
- Ensure route descriptions are clear
- Update README.md if major feature added (only if requested)

## Common Issues to Check
- [ ] All async operations properly awaited
- [ ] Database connections properly handled
- [ ] Error responses follow standard format
- [ ] Vietnamese messages for user-facing errors
- [ ] No console.log statements left in code
- [ ] Imports organized and unused imports removed
- [ ] Environment variables documented in .env.example

## Final Verification
Before marking task complete:
1. Code runs without errors: `bun run dev`
2. Linting passes: `bun run check`
3. Tests pass: `bun test`
4. API documentation updated at `/docs`
5. No regression in existing functionality

## Git Commit (only if requested)
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: [description]" # or fix:, refactor:, etc.

# Note: Only commit when explicitly asked by user
```