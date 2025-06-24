.PHONY: run-dynamodb create-table stop-dynamodb reset-dynamodb

DYNAMODB_NAME=dynamodb-local
DYNAMODB_PORT=8000
AWS_REGION=us-east-1
DOCKER_NETWORK=sam-local-net
TEMPLATE=template.yaml

run-dynamodb:
	docker network inspect $(DOCKER_NETWORK) >/dev/null 2>&1 || docker network create $(DOCKER_NETWORK)
	docker run -d --rm --name $(DYNAMODB_NAME) --network $(DOCKER_NETWORK) -p $(DYNAMODB_PORT):8000 amazon/dynamodb-local


stop-dynamodb:
	-@docker stop $(DYNAMODB_NAME) 2>/dev/null || echo "$(DYNAMODB_NAME) is not running"

reset-dynamodb: stop-dynamodb run-dynamodb create-table

create-table:
	./scripts/create-tables.sh

delete-table:
	./scripts/delete-tables.sh

log-table-sessions:
	./scripts/log-sessions.sh

log-card-decks:
	./scripts/log-card-decks.sh

list-tables:
	aws dynamodb list-tables \
	  --endpoint-url http://localhost:8000 \
	  --region eu-central-1

seed-card-decks:
	./scripts/seed-card-decks.sh

sam-build:
	sam build --template $(TEMPLATE)

sam-invoke:
	sam local invoke \
		--docker-network $(DOCKER_NETWORK) \
		--event events/event.json \
		--region $(AWS_REGION)

sam-api:
	sam local start-api \
		--docker-network $(DOCKER_NETWORK) \
		--region $(AWS_REGION)

happy-path:
	./scripts/happy-path.sh

install-lambdas:
	@echo "→ Installing dependencies in all lambda functions..."
	@for dir in lambda/*; do \
	  if [ -f $$dir/package.json ]; then \
	    echo "📦 Installing in $$dir..."; \
	    cd $$dir && npm install && cd - > /dev/null; \
	  else \
	    echo "⚠️  Skipping $$dir (no package.json)"; \
	  fi \
	done
	@echo "✔ All done."




