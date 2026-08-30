.PHONY: all dev build start clean install db-create db-reset db-seed test help

# =============================================================================
# Personal Finance Tracker — Makefile
# =============================================================================

PROJECT_ROOT := $(shell pwd)
CLIENT_DIR   := $(PROJECT_ROOT)/FinanceTracker/client
SERVER_DIR   := $(PROJECT_ROOT)/FinanceTracker/server
WORKSPACE    := $(PROJECT_ROOT)/FinanceTracker

# =============================================================================
# Help
# =============================================================================
help: ## Show this help message
	@echo ""
	@echo "Personal Finance Tracker"
	@echo "========================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  %-22s %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Setup
# =============================================================================
install: ## Install all dependencies (server, client, root)
	@echo "Installing dependencies..."
	cd "$(CLIENT_DIR)" && npm install
	cd "$(SERVER_DIR)" && npm install
	cd "$(PROJECT_ROOT)" && npm install
	@echo "Dependencies installed."

# =============================================================================
# Development
# =============================================================================
dev: ## Run both frontend and backend in development mode
	@echo "Starting development servers..."
	cd "$(WORKSPACE)" && npm run dev

dev-server: ## Run only the backend server in dev mode
	@echo "Starting backend server..."
	cd "$(SERVER_DIR)" && npm run dev

dev-client: ## Run only the frontend dev server
	@echo "Starting frontend dev server..."
	cd "$(CLIENT_DIR)" && npm run dev

# =============================================================================
# Build
# =============================================================================
build: ## Build both client and server for production
	@echo "Building client..."
	cd "$(CLIENT_DIR)" && npm run build
	@echo "Building server..."
	cd "$(SERVER_DIR)" && npm run build
	@echo "Build complete!"

# =============================================================================
# Production
# =============================================================================
start: ## Start the production server (serves both API and frontend)
	@echo "Starting production server..."
	cd "$(SERVER_DIR)" && NODE_ENV=production node dist/app.js

# =============================================================================
# Database
# =============================================================================
db-create: ## Create the database and apply schema
	@echo "Setting up database..."
	cd "$(SERVER_DIR)" && npm run db:create
	@echo "Database setup complete."

db-reset: ## Drop and recreate the entire database schema
	@echo "Resetting schema..."
	cd "$(SERVER_DIR)" && npm run db:reset
	@echo "Schema reset complete."

db-seed: ## Seed default categories for a user (pass USER_ID=1)
	@echo "Seeding database..."
	cd "$(SERVER_DIR)" && npx tsx -e "import { seedDefaultCategories } from './src/database/seed'; await seedDefaultCategories(parseInt(process.env.USER_ID || '1')); console.log('Seeded.');"
	@echo "Seeding complete."

# =============================================================================
# Testing
# =============================================================================
test: ## Run all tests
	@echo "Running tests..."
	cd "$(SERVER_DIR)" && npm test

test-watch: ## Run tests in watch mode
	cd "$(SERVER_DIR)" && npm run test:watch

# =============================================================================
# Utilities
# =============================================================================
clean: ## Remove node_modules and build artifacts
	@echo "Cleaning..."
	rm -rf "$(CLIENT_DIR)/node_modules"
	rm -rf "$(SERVER_DIR)/node_modules"
	rm -rf "$(WORKSPACE)/node_modules"
	rm -rf "$(PROJECT_ROOT)/node_modules"
	rm -rf "$(CLIENT_DIR)/dist"
	rm -rf "$(SERVER_DIR)/dist"
	@echo "Clean complete."

typecheck: ## Run TypeScript type checking on server and client
	@echo "Typechecking server..."
	cd "$(SERVER_DIR)" && npx tsc --noEmit
	@echo "Typechecking client..."
	cd "$(CLIENT_DIR)" && npx tsc --noEmit
	@echo "All type checks passed."

status: ## Show project status (deps, db, ports)
	@echo "=== Project Status ==="
	@echo ""
	@echo "--- Dependencies ---"
	@test -d "$(SERVER_DIR)/node_modules" && echo "  Server: installed" || echo "  Server: MISSING"
	@test -d "$(CLIENT_DIR)/node_modules" -o -d "$(WORKSPACE)/node_modules" && echo "  Client: installed" || echo "  Client: MISSING"
	@echo ""
	@echo "--- Build Artifacts ---"
	@test -d "$(CLIENT_DIR)/dist" && echo "  Client: built" || echo "  Client: not built"
	@test -d "$(SERVER_DIR)/dist" && echo "  Server: built" || echo "  Server: not built"
	@echo ""
	@echo "--- Database ---"
	@cd "$(SERVER_DIR)" && npx tsx src/database/check.ts 2>&1 || echo "  Could not connect"
	@echo ""
	@echo "--- Ports ---"
	@netstat -ano 2>/dev/null | grep -E ':3001|:5173' | head -5 || echo "  No servers running"

# =============================================================================
# Quick Commands
# =============================================================================
up: install dev ## Install dependencies and start dev servers
fresh: clean install ## Clean install everything
setup: install db-create ## Full project setup (install + database)
	@echo "Setup complete! Run 'make dev' to start developing."

# =============================================================================
# Single-Server Production Deploy
# =============================================================================
deploy-setup: install build ## Full production build (install + build client + server)
	@echo "Build complete! Run 'make start' to start the production server."
	@echo ""
	@echo "The server will serve both the API and React frontend from one URL."
	@echo "Example: http://localhost:3000"

# =============================================================================
# Start with production .env
# =============================================================================
start-prod: ## Start production server (requires .env in server/)
	@echo "Starting production server (single-server mode)..."
	@test -f "$(SERVER_DIR)/.env" || (echo "ERROR: $(SERVER_DIR)/.env not found. Copy .env.production.example to .env and configure it." && exit 1)
	cd "$(SERVER_DIR)" && NODE_ENV=production node dist/app.js
