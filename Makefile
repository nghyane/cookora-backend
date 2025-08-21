# 🌐 Cookora Backend Makefile

.PHONY: dev build start test db-up db-down db-reset help

# Default target
default: help

# Development
dev: ## Start development server
	bun run dev

dev-docker: ## Start with Docker (database + backend)
	docker-compose up -d

# Database
db-up: ## Start database services only
	docker-compose up -d postgres redis

db-down: ## Stop all services
	docker-compose down

db-reset: ## Reset database (WARNING: destroys data)
	docker-compose down -v
	docker-compose up -d postgres redis
	sleep 5
	bun run db:migrate

# Migrations
db-generate: ## Generate database migrations
	bun run db:generate

db-migrate: ## Apply database migrations
	bun run db:migrate

# Build and production
build: ## Build for production
	bun run build

start: ## Start production server
	bun run start

# Testing and quality
test: ## Run tests
	bun test

check: ## Format, lint and type check
	bun run check

# Utilities
clean: ## Clean build artifacts
	rm -rf dist node_modules

logs: ## View Docker logs
	docker-compose logs -f

help: ## Show this help message
	@echo "Cookora Backend Development Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'