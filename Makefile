# Makefile for building and running Docker containers
include .env
# Default environment variables (can be overridden)
DATABASE_URL ?= ${DATABASE_URL}
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?= ${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
CLERK_SECRET_KEY ?= ${CLERK_SECRET_KEY}

# Docker image and container names
IMAGE_NAME := dbase
CONTAINER_NAME := dbase

# Default target
.PHONY: help
help: ## Show this help
	@echo "Available commands:"
	@echo "  make build        - Build the Docker image"
	@echo "  make run          - Run the container"
	@echo "  make dev          - Run the container in development mode"
	@echo "  make stop         - Stop the running container"
	@echo "  make logs         - Show container logs"
	@echo "  make clean        - Remove the container and image"
	@echo "  make rebuild      - Rebuild the Docker image"
	@echo "  make restart      - Restart the container"
	@echo "  make ps           - Show running containers"
	@echo "  make status       - Show container status"

# Build the Docker image
.PHONY: build
build: ## Build the Docker image
	@echo "Building Docker image..."
	docker build \
		--build-arg DATABASE_URL=$(DATABASE_URL) \
		--build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$(NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) \
		-t $(IMAGE_NAME) .


# Run the container
.PHONY: run
run: ## Run the container
	@echo "Running container..."
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p 3000:3000 \
		-e DATABASE_URL=$(DATABASE_URL) \
		-e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$(NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) \
		-e CLERK_SECRET_KEY=$(CLERK_SECRET_KEY) \
		$(IMAGE_NAME)

# Run in development mode (with auto-reload)
.PHONY: dev
dev: ## Run the container in development mode
	@echo "Running container in development mode..."
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p 3000:3000 \
		-e DATABASE_URL=$(DATABASE_URL) \
		-e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$(NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) \
		-e NODE_ENV=development \
		$(IMAGE_NAME)

# Stop the container
.PHONY: stop
stop: ## Stop the running container
	@echo "Stopping container..."
	docker stop $(CONTAINER_NAME) || true

# Show container logs
.PHONY: logs
logs: ## Show container logs
	docker logs -f $(CONTAINER_NAME)

# Remove container and image
.PHONY: clean
clean: ## Remove the container and image
	@echo "Cleaning up..."
	docker stop $(CONTAINER_NAME) || true
	docker rm $(CONTAINER_NAME) || true
	docker rmi $(IMAGE_NAME) || true

# Rebuild the Docker image
.PHONY: rebuild
rebuild: clean build ## Rebuild the Docker image

# Restart the container
.PHONY: restart
restart: ## Restart the container
	make stop
	make run

# Show running containers
.PHONY: ps
ps: ## Show running containers
	docker ps | grep $(CONTAINER_NAME) || echo "Container $(CONTAINER_NAME) is not running"

# Show container status
.PHONY: status
status: ## Show container status
	docker inspect $(CONTAINER_NAME) --format='{{.State.Status}}' 2>/dev/null || echo "Container not found"