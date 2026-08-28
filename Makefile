.PHONY: all dev build start clean install db-create db-reset db-seed test help

# =============================================================================
# Personal Finance Tracker — Makefile
# =============================================================================

PROJECT_ROOT := $(shell pwd)
CLIENT_DIR   := $(PROJECT_ROOT)/FinanceTracker/client
SERVER_DIR   := $(PROJECT_ROOT)/FinanceTracker/server
SCHEMA_FILE  := $(PROJECT_ROOT)/DatabaseDesign/database.sql

# Colors for output
GREEN  := \033[0;32m
YELLOW := \033[0;33m
RED    := \033[0;31m
NC     := \033[0m

# =============================================================================
# Help
# =============================================================================
help: ## Show this help message
	@echo ""
	@echo "$(GREEN)Personal Finance Tracker$(NC)"
	@echo "========================"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Setup
# =============================================================================
install: ## Install all dependencies (root, server, client)
	@echo "$(GREEN)Installing dependencies...$(NC)"
	cd $(CLIENT_DIR) && npm install
	cd $(SERVER_DIR) && npm install
	cd $(PROJECT_ROOT) && npm install

# =============================================================================
# Development
# =============================================================================
dev: ## Run both frontend and backend in development mode
	@echo "$(GREEN)Starting development servers...$(NC)"
	cd $(PROJECT_ROOT) && npm run dev

dev-server: ## Run only the backend server in dev mode
	@echo "$(GREEN)Starting backend server...$(NC)"
	cd $(SERVER_DIR) && npm run dev

dev-client: ## Run only the frontend dev server
	@echo "$(GREEN)Starting frontend dev server...$(NC)"
	cd $(CLIENT_DIR) && npm run dev

# =============================================================================
# Build
# =============================================================================
build: ## Build both client and server for production
	@echo "$(GREEN)Building client...$(NC)"
	cd $(CLIENT_DIR) && npm run build
	@echo "$(GREEN)Building server...$(NC)"
	cd $(SERVER_DIR) && npm run build
	@echo "$(GREEN)Build complete!$(NC)"

# =============================================================================
# Production
# =============================================================================
start: ## Start the production server (serves both API and frontend)
	@echo "$(GREEN)Starting production server...$(NC)"
	cd $(SERVER_DIR) && NODE_ENV=production node dist/app.js

# =============================================================================
# Database
# =============================================================================
db-create: ## Create the database schema from SQL file
	@echo "$(GREEN)Creating database schema...$(NC)"
	psql -U postgres -f $(SCHEMA_FILE)

db-reset: ## Drop and recreate the entire database schema
	@echo "$(YELLOW)Dropping schema...$(NC)"
	psql -U postgres -c "DROP SCHEMA IF EXISTS finance_tracker CASCADE;"
	@echo "$(GREEN)Recreating schema...$(NC)"
	psql -U postgres -f $(SCHEMA_FILE)
	@echo "$(GREEN)Schema reset complete!$(NC)"

db-seed: ## Run the seed script to populate default categories
	@echo "$(GREEN)Seeding database...$(NC)"
	cd $(SERVER_DIR) && npm run db:seed

# =============================================================================
# Testing
# =============================================================================
test: ## Run all tests
	@echo "$(GREEN)Running tests...$(NC)"
	cd $(SERVER_DIR) && npm test

test-watch: ## Run tests in watch mode
	cd $(SERVER_DIR) && npm run test:watch

# =============================================================================
# Utilities
# =============================================================================
clean: ## Remove node_modules and build artifacts
	@echo "$(YELLOW)Cleaning...$(NC)"
	rm -rf $(CLIENT_DIR)/node_modules $(SERVER_DIR)/node_modules $(PROJECT_ROOT)/node_modules
	rm -rf $(CLIENT_DIR)/dist $(SERVER_DIR)/dist
	@echo "$(GREEN)Clean complete!$(NC)"

typecheck: ## Run TypeScript type checking on server
	cd $(SERVER_DIR) && npx tsc --noEmit

# =============================================================================
# Quick Commands
# =============================================================================
up: install dev ## Install dependencies and start dev servers

fresh: clean install ## Clean install everything

setup: install db-create ## Full project setup (install + database)
	@echo "$(GREEN)Setup complete! Run 'make dev' to start developing.$(NC)"
