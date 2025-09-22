# 🌐 Cookora Backend

> REST API server for Cookora AI Cooking Assistant Platform - Vietnamese Culinary API with AI-powered ingredient detection

## 🛠️ Tech Stack

- **Runtime**: Bun 1.2.16
- **Framework**: Hono with OpenAPI integration
- **Database**: PostgreSQL 17 with pgvector extension
- **Cache**: Redis 8 (optional)
- **ORM**: Drizzle ORM
- **Validation**: Zod schemas with type safety
- **Documentation**: OpenAPI 3.0 + Scalar UI
- **AI Integration**: OpenAI Vision / Google Gemini for ingredient detection

## 🚀 Quick Start

### Prerequisites
- Bun 1.2.16+
- Docker & Docker Compose
- PostgreSQL database (local or cloud)

### Local Development
```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# Note: Do NOT use quotes in .env when using with Docker --env-file

# Start development server
bun run dev
```

### Docker Development
```bash
# Build and run with Docker
docker build -t cookora-backend .
docker run -d \
  --name cookora-backend \
  --env-file .env \
  -p 3000:3000 \
  cookora-backend

# View logs
docker logs -f cookora-backend
```

## 📦 Available Scripts

```bash
bun run dev          # Start development server with hot reload
bun run build        # Build for production
bun run start        # Run production build
bun test             # Run tests
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Apply migrations to database
bun run check        # Run Biome formatter and linter
bun run format       # Format code
bun run lint         # Fix linting issues
```

## 🔧 Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
DATABASE_URL=postgresql://user:pass@host:port/dbname  # No quotes for Docker
JWT_SECRET=your-secret-key-min-32-chars               # Min 32 characters

# Optional
NODE_ENV=development                                  # development/production
PORT=3000                                             # Server port
REDIS_URL=redis://localhost:6379                     # Redis connection

# AI Provider (optional)
AI_PROVIDER=gemini                                   # openai or gemini
OPENAI_API_KEY=your-openai-key                      # If using OpenAI
GEMINI_API_KEY=your-gemini-key                      # If using Gemini

# OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain/api/auth/google/callback
```

**Important**: When using Docker's `--env-file`, do NOT wrap values in quotes.

## 🏗️ Project Structure

```
src/
├── modules/           # Feature modules (DDD)
│   ├── auth/         # Authentication & authorization
│   ├── ingredients/  # Ingredient management
│   ├── recipes/      # Recipe CRUD
│   ├── pantry/       # User pantry tracking
│   ├── users/        # User management
│   ├── detection/    # AI ingredient detection
│   └── community/    # Social features
├── shared/           # Shared utilities
│   ├── config/       # Environment config
│   ├── database/     # DB connection & schema
│   ├── middleware/   # Express middleware
│   ├── schemas/      # Zod validation schemas
│   └── utils/        # Helper functions
├── app.ts           # Main application setup
└── index.ts         # Entry point
```

## 🗄️ Database

### Setup
```bash
# Generate migrations from schema changes
bun run db:generate

# Apply migrations
bun run db:migrate

# Reset database (destructive)
docker-compose down -v
docker-compose up -d postgres redis
bun run db:migrate
```

### Using Supabase/Cloud PostgreSQL
The app is configured to work with Supabase pooler connections. Ensure your DATABASE_URL uses the pooler endpoint for production.

## 📖 API Documentation

When running locally, access the API documentation at:
- Scalar UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`
- Health Check: `http://localhost:3000/health`

## 🧪 Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/detection.test.ts
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t cookora-backend .

# Run container
docker run -d \
  --name cookora-backend \
  --env-file .env \
  -p 3000:3000 \
  cookora-backend

# Using docker-compose
docker-compose up -d
```

## 🔌 Default Ports

- **Backend API**: 3000
- **PostgreSQL**: 5432 (default)
- **Redis**: 6379 (default)

## 📝 License

Private repository - All rights reserved