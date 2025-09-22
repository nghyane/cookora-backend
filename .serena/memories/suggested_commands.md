# Suggested Commands for Cookora Backend

## Development Commands

### Quick Start
```bash
# Start all services (database + backend) with Docker
docker-compose up -d

# Start only database services
docker-compose up -d postgres redis

# Start development server with hot reload
bun run dev
```

### Database Operations
```bash
# Generate Drizzle migrations from schema changes
bun run db:generate

# Apply pending migrations to database
bun run db:migrate

# Full database reset (destructive)
docker-compose down -v && docker-compose up -d postgres redis && bun run db:migrate
```

### Code Quality & Testing
```bash
# Run tests with Bun test runner
bun test

# Run specific test file
bun test [filename]

# Format and lint code (auto-fix)
bun run check

# Format code only
bun run format

# Lint code only
bun run lint
```

### Production Build
```bash
# Build for production (outputs to dist/)
bun run build

# Run production build
bun run start
```

### Docker Operations
```bash
# Start all services
docker-compose up -d

# View backend logs
docker-compose logs -f backend

# Stop all services
docker-compose down

# Remove all containers and volumes (destructive)
docker-compose down -v
```

### System Utilities (Darwin/macOS)
```bash
# Git operations
git status
git add .
git commit -m "message"
git push

# File navigation
ls -la            # List all files with details
cd <directory>    # Change directory
pwd               # Print working directory

# File search
find . -name "*.ts"              # Find TypeScript files
grep -r "pattern" .              # Search for pattern in files

# Process management
ps aux | grep bun                # Find Bun processes
lsof -i :3000                    # Check what's running on port 3000
kill -9 <PID>                    # Force kill process
```

### Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or use your preferred editor
```

## Port Information
- Backend API: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- API Documentation: http://localhost:3000/docs

## Important Notes
- Always run `bun run check` before committing code
- Use Docker for consistent development environment
- Database migrations must be generated before applying
- The system is Darwin (macOS), so commands may differ from Linux