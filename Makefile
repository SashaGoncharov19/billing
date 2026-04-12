.PHONY: dev db-up db-down db-reset migrate seed lint test

dev:
	docker-compose up -d && bun dev

db-up:
	docker-compose up -d postgres redis

db-down:
	docker-compose down

db-reset:
	docker-compose down -v && docker-compose up -d postgres redis

migrate:
	cd packages/db && bun db:push

seed:
	cd packages/db && bun db:seed

lint:
	bun lint

test:
	bun test
