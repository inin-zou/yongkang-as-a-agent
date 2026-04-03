.PHONY: dev dev-backend dev-frontend build build-backend build-frontend

dev:
	@echo "Starting backend and frontend..."
	@make dev-backend & make dev-frontend

dev-backend:
	cd backend && go run cmd/server/main.go

dev-frontend:
	cd frontend && npm run dev

build-backend:
	cd backend && go build -o bin/server cmd/server/main.go

build-frontend:
	cd frontend && npm run build

build: build-backend build-frontend
