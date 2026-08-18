# Lending POC — root orchestration
#
# Two commands cover the whole stack:
#   make start-backend   Ollama + OCR + Translation + Field-mapping + the
#                         gateway that fronts all three on one public port.
#   make start-frontend  npm install, create frontend/.env if missing, run
#                         the Vite dev server.
#
# Each backend module keeps its own venv and its own requirements.txt,
# completely unmodified; this Makefile only wires up how they're launched.

.PHONY: help start-backend start-frontend

.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "Lending POC Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "Typical usage: run 'make start-backend' in one terminal, then"
	@echo "'make start-frontend' in another."

start-backend: ## Start Ollama + OCR + Translation + Field-mapping behind a single gateway (http://localhost:8000)
	@bash scripts/start-backend.sh

start-frontend: ## npm install, create frontend/.env if missing, then run the frontend dev server
	@cd frontend && \
	npm install && \
	if [ ! -f .env ]; then \
		printf 'VITE_API_BASE_URL=http://localhost:8000\nVITE_TRANSLATION_API_BASE_URL=http://localhost:8000\n' > .env; \
		echo "Created frontend/.env"; \
	fi && \
	npm run dev
