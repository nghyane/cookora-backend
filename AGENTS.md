# AGENTS.md - Coding Agent Guidelines

## Commands
- `bun run dev` - Start development server
- `bun test [filename]` - Run specific test file
- `bun run check` - Auto-fix formatting/linting with Biome
- `bun run db:migrate` - Apply database migrations
- `docker-compose up -d postgres redis` - Start databases

## Code Style
- **Runtime**: Always use `bun` instead of `node/npm/pnpm`
- **Formatting**: 2 spaces, single quotes, no semicolons, max 100 chars/line
- **Imports**: Use path aliases (`@/`) for shared modules
- **Types**: TypeScript with Zod schemas for validation
- **Naming**: camelCase for functions/variables, PascalCase for types/classes
- **Modules**: Each module exports `routes.ts`, business logic in `service.ts`
- **Schemas**: Database schemas in `/src/shared/database/schema/`, API schemas in `/src/shared/schemas/api/`
- **Error Handling**: Use custom `AppError` classes from `/src/shared/utils/errors.ts`
- **Environment**: Bun auto-loads `.env`, don't use dotenv
- **Testing**: Use Bun's built-in test runner, not Jest/Vitest
- **Database**: PostgreSQL with Drizzle ORM, migrations in `/src/shared/database/migrations/`