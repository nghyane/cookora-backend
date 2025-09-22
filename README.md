# 🌐 Cookora Backend

> REST API server for Cookora AI Cooking Assistant Platform - Vietnamese Culinary API with AI-powered ingredient detection

[![Production Status](https://img.shields.io/badge/Status-Production%20Ready-success)](https://cookora-backend.vercel.app)
[![API Documentation](https://img.shields.io/badge/API-Documentation-blue)](https://cookora-backend.vercel.app/docs)
[![Health Check](https://img.shields.io/badge/Health-Check-green)](https://cookora-backend.vercel.app/health)

## 📋 Current Project Status

**✅ Completed Features:**
- ✅ **User Authentication** - Email/password & Google OAuth integration
- ✅ **Ingredients Management** - Vietnamese culinary ingredients database (2000+ items)
- ✅ **Recipe Management** - CRUD operations với Vietnamese cuisine
- ✅ **Pantry System** - User pantry tracking và ingredient inventory
- ✅ **Search & Filtering** - Full-text search với PostgreSQL và pgvector
- ✅ **Admin Panel** - Admin controls cho content management
- ✅ **API Documentation** - OpenAPI 3.0 với Scalar UI
- ✅ **Production Ready** - Docker containerization và deployment

## 🚀 Production Demo

**Live Demo:** [https://cookora-backend.vercel.app](https://cookora-backend.vercel.app)

**API Documentation:** [https://cookora-backend.vercel.app/docs](https://cookora-backend.vercel.app/docs)

**Health Check:** [https://cookora-backend.vercel.app/health](https://cookora-backend.vercel.app/health)

## 🛠️ Tech Stack

- **Runtime**: Bun 1.2.16
- **Framework**: Hono với OpenAPI integration
- **Database**: PostgreSQL 17 with pgvector extension
- **Cache**: Redis 8
- **ORM**: Drizzle ORM 0.44.4
- **Validation**: Zod schemas với type safety
- **Documentation**: OpenAPI 3.0 + Scalar UI
- **Deployment**: Docker + Production hosting

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

## 📖 API Documentation

**Live Documentation:** [https://cookora-backend.vercel.app/docs](https://cookora-backend.vercel.app/docs)

**Main Modules:** Authentication, Ingredients (2000+ Vietnamese items), Recipes, Pantry Management, User Profiles

## 🌍 Production Deployment

```bash
# Build & start production
bun run build && bun run start

# Or với Docker
docker-compose up -d
```

**Production URL:** [https://cookora-backend.vercel.app](https://cookora-backend.vercel.app)

## 🔧 Environment Variables

**Required:** `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY` (32+ chars)
**Optional:** `REDIS_URL`, `GOOGLE_CLIENT_ID/SECRET` (OAuth), `PORT` (default: 3000)

## 🏗️ Architecture

**Domain-Driven Modules:** `auth`, `ingredients`, `recipes`, `pantry`, `users`
**Vietnamese Culinary Focus:** 2000+ ingredients, Vietnamese cuisine specialization
**AI-Ready:** pgvector embeddings, full-text search, type-safe APIs

## 💾 Database Schema

**PostgreSQL 17** với pgvector extension cho AI-powered search
**Tables:** users, ingredients, recipes, pantry, cache
**Features:** Full-text search, vector embeddings, type-safe ORM

## 🛠️ Development

**Tools:** Biome (formatting/lint), TypeScript 5.9, Zod validation, Drizzle ORM
**Workflow:** `make dev` for development, `make check` for code quality

## 🔌 Default Ports

**Backend:** 3000 | **PostgreSQL:** 5433 | **Redis:** 6380