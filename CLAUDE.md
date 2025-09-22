# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
- `bun run dev` - Start development server with hot reload on port 3000
- `bun test` - Run tests (currently only detection module tests exist)
- `bun run check` - Run Biome formatter and linter with auto-fix
- `bun run lint` - Fix linting issues
- `bun run format` - Format code

### Database
- `bun run db:generate` - Generate Drizzle migrations from schema changes
- `bun run db:migrate` - Apply pending migrations to database
- `docker-compose up -d postgres redis` - Start database services only
- `docker-compose down -v && docker-compose up -d postgres redis && bun run db:migrate` - Full database reset

### Docker
- `docker-compose up -d` - Start all services (PostgreSQL, Redis, backend)
- `docker-compose logs -f backend` - View backend logs
- `docker-compose down` - Stop all services

### Production
- `bun run build` - Build for production (outputs to dist/)
- `bun run start` - Run production build

## Architecture Overview

### Tech Stack
- **Runtime**: Bun 1.2.16 with TypeScript 5.9
- **Framework**: Hono with OpenAPI/Swagger integration via hono-openapi
- **Database**: PostgreSQL 17 with pgvector extension + Drizzle ORM
- **Cache**: Redis 8
- **Validation**: Zod schemas with drizzle-zod integration
- **AI**: OpenAI API for ingredient detection
- **Code Quality**: Biome for formatting/linting

### Module Structure
The application follows a domain-driven modular architecture at `/src/modules/`:
- **auth**: JWT authentication, session management, Google OAuth
- **ingredients**: Vietnamese ingredient database (2000+ items)
- **recipes**: Recipe CRUD with Vietnamese cuisine focus
- **pantry**: User pantry tracking and recommendations
- **users**: User profiles, favorites, password management
- **detection**: AI-powered ingredient detection from images using OpenAI Vision

### Key Architectural Patterns
1. **Route Registration**: Each module exports a `routes.ts` that's mounted in `app.ts`
2. **Service Pattern**: Business logic separated into service files (e.g., `ingredients/service.ts`)
3. **Schema Organization**: 
   - Database schemas in `/src/shared/database/schema/`
   - API schemas in `/src/shared/schemas/api/` using Zod with OpenAPI extensions
4. **Error Handling**: Custom `AppError` class with consistent error responses via `response.ts` utility
5. **Middleware**: Auth middleware (`requireAuth`) and admin middleware (`requireAdmin`) for protected routes

### Database Configuration
- Connection managed via Drizzle in `/src/shared/database/connection.ts`
- Migrations stored in `/src/shared/database/migrations/`
- Schema exports from `/src/shared/database/schema/index.ts`
- Relations defined in `/src/shared/database/schema/relations.ts`

### API Documentation
- OpenAPI spec available at `/openapi.json`
- Scalar UI documentation at `/docs`
- All routes use Zod schemas with OpenAPI extensions for automatic documentation

### Environment Variables
Required variables (see `/src/shared/config/env.ts`):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `REDIS_URL` - Redis connection string (optional)
- `OPENAI_API_KEY` - For ingredient detection feature (optional)
- `GEMINI_API_KEY` - For ingredient detection with Gemini (optional)
- `PORT` - Server port (default: 3000)

### Testing
Tests use Bun's built-in test runner. Currently only detection module has tests at `/tests/detection.test.ts`. Run individual tests with `bun test [filename]`.

### Vietnamese Culinary Focus
The application specializes in Vietnamese cuisine with:
- 2000+ Vietnamese ingredients in the database
- Vietnamese recipe management
- Constants and types in `/src/shared/constants/vietnamese-culinary.ts`