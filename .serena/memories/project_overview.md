# Cookora Backend Project Overview

## Project Purpose
Cookora Backend is a REST API server for the Cookora AI Cooking Assistant Platform, specializing in Vietnamese culinary with AI-powered ingredient detection. The backend provides comprehensive APIs for recipe management, ingredient tracking, pantry management, and user authentication.

## Tech Stack
- **Runtime**: Bun 1.2.16 with TypeScript 5.9
- **Framework**: Hono with OpenAPI/Swagger integration via hono-openapi
- **Database**: PostgreSQL 17 with pgvector extension for vector similarity search
- **ORM**: Drizzle ORM 0.44.5
- **Cache**: Redis 8 for session management and caching
- **Validation**: Zod schemas with drizzle-zod integration for type-safe database models
- **AI Integration**: OpenAI API and Google Gemini for ingredient detection from images
- **Documentation**: OpenAPI 3.0 with Scalar UI at /docs
- **Authentication**: JWT-based auth with email/password and Google OAuth support
- **Code Quality**: Biome for formatting and linting
- **Containerization**: Docker with docker-compose for development and production

## Project Structure
```
backend/
├── src/
│   ├── index.ts          # Entry point
│   ├── app.ts            # Main Hono application setup
│   ├── modules/          # Feature modules (domain-driven design)
│   │   ├── auth/         # Authentication & authorization
│   │   ├── ingredients/  # Vietnamese ingredients database (2000+ items)
│   │   ├── recipes/      # Recipe CRUD operations
│   │   ├── pantry/       # User pantry tracking
│   │   ├── users/        # User management
│   │   ├── community/    # Community features
│   │   └── detection/    # AI-powered ingredient detection
│   └── shared/           # Shared utilities and configurations
│       ├── config/       # Environment configuration
│       ├── constants/    # App constants including Vietnamese culinary data
│       ├── database/     # Database connection and schema
│       ├── middleware/   # Auth and admin middlewares
│       ├── schemas/      # API schemas (Zod + OpenAPI)
│       └── utils/        # Utility functions and error handling
├── tests/                # Test files (Bun test runner)
├── docker-compose.yml    # Docker configuration
└── drizzle.config.ts     # Drizzle ORM configuration
```

## Key Features
- **User Authentication**: JWT-based with email/password and Google OAuth
- **Vietnamese Ingredients Database**: 2000+ curated Vietnamese culinary ingredients
- **Recipe Management**: Full CRUD with Vietnamese cuisine focus
- **Pantry System**: User inventory tracking with smart recommendations
- **AI Detection**: Ingredient detection from images using OpenAI Vision or Google Gemini
- **Search & Filtering**: PostgreSQL full-text search with pgvector for similarity
- **Admin Panel**: Content management controls
- **API Documentation**: Auto-generated OpenAPI 3.0 docs with Scalar UI

## Production Information
- Live Demo: https://cookora-backend.vercel.app
- API Documentation: https://cookora-backend.vercel.app/docs
- Health Check: https://cookora-backend.vercel.app/health
- Production Ready with Docker containerization