# 🌐 Cookora Backend

> REST API server for Cookora AI Cooking Assistant Platform

## Tech Stack
- **Runtime**: Bun
- **Framework**: Hono
- **Database**: PostgreSQL with pgvector
- **Cache**: Redis
- **ORM**: Drizzle ORM
- **Validation**: Zod

## Quick Start

### Development with Docker (Recommended)
```bash
# Start all services (database + backend)
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Local Development
```bash
# Install dependencies
bun install

# Start database only
docker-compose up -d postgres redis

# Start backend
bun run dev
```

## Database Setup

### Initial Setup
```bash
# Generate migration files
bun run db:generate

# Apply migrations
bun run db:migrate
```

### Reset Database
```bash
# Stop and remove database
docker-compose down -v

# Start fresh
docker-compose up -d postgres redis
bun run db:migrate
```

## Available Scripts

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun test             # Run tests
bun run db:generate  # Generate database migrations
bun run db:migrate   # Apply database migrations
bun run check        # Format and lint code
```

## API Endpoints

### Health Check
- `GET /health` - API health status

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Ingredients
- `GET /ingredients` - List ingredients
- `POST /ingredients` - Add ingredient

### Recipes
- `GET /recipes` - List recipes
- `POST /recipes` - Add recipe

### Pantry
- `GET /pantry` - User pantry
- `POST /pantry` - Add to pantry

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Server port (default: 3000)

## Docker Services

- **postgres**: PostgreSQL 17 with pgvector extension
- **redis**: Redis 8 for caching
- **backend**: Bun runtime with Hono API

## Database Schema

The database includes tables for:
- **users** - User authentication and profiles
- **ingredients** - Ingredient master data
- **recipes** - Recipe information and steps
- **pantry** - User pantry management
- **cache** - Application caching

## Development Notes

- Uses Biome for code formatting and linting
- TypeScript with strict mode enabled
- Path aliases configured for clean imports
- Drizzle ORM for type-safe database operations

## API Documentation

When running, visit:
- **Swagger/OpenAPI**: http://localhost:3000/docs

## Ports

- **Backend**: 3000
- **PostgreSQL**: 5432
- **Redis**: 6379