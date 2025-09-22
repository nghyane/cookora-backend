# Module Architecture Details

## Core Modules Overview

### 1. Auth Module (`/src/modules/auth/`)
- **Purpose**: Handle authentication and authorization
- **Features**:
  - JWT token generation and validation
  - Email/password authentication
  - Google OAuth integration
  - Session management with Redis
  - Password reset functionality
- **Key Files**:
  - `routes.ts`: Login, register, logout, token refresh endpoints
  - `service.ts`: Authentication business logic
  - `providers/`: Email and Google auth providers
  - `middleware.ts`: `requireAuth` and `requireAdmin` middlewares

### 2. Ingredients Module (`/src/modules/ingredients/`)
- **Purpose**: Manage Vietnamese culinary ingredients database
- **Features**:
  - 2000+ Vietnamese ingredients
  - CRUD operations with admin controls
  - Full-text search with PostgreSQL
  - Ingredient suggestions and autocomplete
  - Nutritional information tracking
- **Service Methods**:
  - `getAll()`: Paginated list with search
  - `getById()`: Single ingredient details
  - `getSuggestions()`: Autocomplete suggestions
  - `create()`, `update()`, `delete()`: Admin operations

### 3. Recipes Module (`/src/modules/recipes/`)
- **Purpose**: Recipe management system
- **Features**:
  - Vietnamese recipe CRUD
  - Ingredient associations
  - Cooking instructions and tips
  - Difficulty levels and cooking time
  - User ratings and favorites
- **Database Relations**:
  - Many-to-many with ingredients
  - One-to-many with user favorites
  - Recipe categories and tags

### 4. Pantry Module (`/src/modules/pantry/`)
- **Purpose**: User pantry and inventory tracking
- **Features**:
  - Track user's available ingredients
  - Expiration date management
  - Quantity tracking
  - Recipe recommendations based on pantry
  - Shopping list generation
- **Integration**:
  - Links with ingredients module
  - Suggests recipes based on available items

### 5. Users Module (`/src/modules/users/`)
- **Purpose**: User profile and account management
- **Features**:
  - User profile CRUD
  - Avatar management
  - Dietary preferences
  - Favorite recipes tracking
  - Account settings
- **Security**:
  - Password hashing with bcrypt
  - Email verification
  - Account deletion

### 6. Detection Module (`/src/modules/detection/`)
- **Purpose**: AI-powered ingredient detection from images
- **Features**:
  - Image analysis using OpenAI Vision or Google Gemini
  - Vietnamese ingredient recognition
  - Confidence scoring
  - Batch detection support
- **Service**: `detection.service.ts`
- **Providers**: OpenAI and Gemini implementations

### 7. Community Module (`/src/modules/community/`)
- **Purpose**: Social features and user interactions
- **Features**:
  - Recipe sharing
  - User comments and reviews
  - Recipe collections
  - Following system
  - Activity feed

## Shared Components

### Database Schema (`/src/shared/database/schema/`)
- `users.ts`: User accounts and profiles
- `ingredients.ts`: Ingredient definitions
- `recipes.ts`: Recipe data
- `community.ts`: Social interactions
- `cache.ts`: Redis cache models
- `relations.ts`: Drizzle ORM relations
- `types.ts`: Shared TypeScript types

### Middleware (`/src/shared/middleware/`)
- `auth.middleware.ts`: JWT validation and user context
- `admin.middleware.ts`: Admin role verification
- `error.middleware.ts`: Global error handling
- `rate-limit.middleware.ts`: API rate limiting

### Utils (`/src/shared/utils/`)
- `errors.ts`: Custom error classes (AppError hierarchy)
- `response.ts`: Standardized API responses
- `validators.ts`: Common validation helpers
- `cache.ts`: Redis caching utilities
- `pagination.ts`: Pagination helpers

### Constants (`/src/shared/constants/`)
- `vietnamese-culinary.ts`: Vietnamese cuisine data
- `categories.ts`: Recipe and ingredient categories
- `units.ts`: Measurement units
- `dietary.ts`: Dietary restriction types

## Request Flow
1. **Route Handler** (routes.ts)
   - OpenAPI documentation
   - Input validation with Zod
   - Middleware application
   
2. **Middleware Stack**
   - Authentication check
   - Authorization verify
   - Rate limiting
   
3. **Service Layer** (service.ts)
   - Business logic
   - Database operations
   - Cache management
   
4. **Database Layer**
   - Drizzle ORM queries
   - Transaction handling
   - Relation loading
   
5. **Response**
   - Standard format via response utils
   - Error transformation
   - Status codes

## Module Communication
- Modules communicate through service imports
- Shared database schema ensures consistency
- Redis for cross-module caching
- Event-driven updates via service calls

## Adding New Modules
1. Create folder in `/src/modules/[name]/`
2. Implement standard files:
   - `routes.ts`: API endpoints
   - `service.ts`: Business logic
   - `types.ts`: TypeScript definitions
3. Register routes in `/src/app.ts`
4. Add database schema if needed
5. Update OpenAPI tags
6. Write tests in `/tests/`