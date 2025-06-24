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
	aws dynamodb create-table \
	  --table-name GameSessions \
	  --attribute-definitions \
	    AttributeName=PK,AttributeType=S \
	    AttributeName=SK,AttributeType=S \
	  --key-schema \
	    AttributeName=PK,KeyType=HASH \
	    AttributeName=SK,KeyType=RANGE \
	  --billing-mode PAY_PER_REQUEST \
	  --endpoint-url http://localhost:8000 \
	  --region eu-central-1
	\
	aws dynamodb create-table \
	  --table-name CardDecks \
	  --attribute-definitions \
	    AttributeName=PK,AttributeType=S \
	    AttributeName=SK,AttributeType=S \
	  --key-schema \
	    AttributeName=PK,KeyType=HASH \
	    AttributeName=SK,KeyType=RANGE \
	  --billing-mode PAY_PER_REQUEST \
	  --endpoint-url http://localhost:8000 \
	  --region eu-central-1

delete-table:
	aws dynamodb delete-table \
  		--table-name GameSessions \
  		--endpoint-url http://localhost:8000 \
  		--region eu-central-1
	\
  	aws dynamodb delete-table \
  		--table-name CardDecks \
  		--endpoint-url http://localhost:8000 \
  		--region eu-central-1

list-tables:
	aws dynamodb list-tables \
	  --endpoint-url http://localhost:8000 \
	  --region eu-central-1

log-table-sessions:
	aws dynamodb scan \
	  --table-name GameSessions \
	  --endpoint-url http://localhost:8000 \
	  --region eu-central-1 \
	  --output json | jq .

log-card-decks:
	aws dynamodb scan \
	  --table-name CardDecks \
	  --endpoint-url http://localhost:8000 \
	  --region eu-central-1 \
	  --output json | jq .

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




