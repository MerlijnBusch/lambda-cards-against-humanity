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


delete-table:
	aws dynamodb delete-table \
  		--table-name GameSessions \
  		--endpoint-url http://localhost:8000 \
  		--region eu-central-1

reset-dynamodb: stop-dynamodb run-dynamodb create-table

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

log-table:
	aws dynamodb scan \
	  --table-name GameSessions \
	  --endpoint-url http://localhost:8000 \
	  --region eu-central-1 \
	  --output json | jq .

test-api:
	@echo "1. Creating game session..."
	@SESSION_ID=$$(curl -s -X POST http://localhost:3000/create | jq -r '.sessionId'); \
	echo "→ Created session: $$SESSION_ID"; \
	\
	echo "2. Joining session as user-456 (Bob)..."; \
	curl -s -X POST http://localhost:3000/join \
		-H "Content-Type: application/json" \
		-d '{"sessionId":"'"$$SESSION_ID"'","playerId":"user-456","playerName":"Bob"}' | jq .

test-start:
	@SESSION_ID=$$(curl -s -X POST http://localhost:3000/create | jq -r '.sessionId'); \
	echo "Created session: $$SESSION_ID"; \
	\
	for i in 1 2 3 4; do \
	  PLAYER_ID="user-$$i"; \
	  PLAYER_NAME="Player$$i"; \
	  echo "→ Joining $$PLAYER_NAME..."; \
	  curl -s -X POST http://localhost:3000/join \
	    -H "Content-Type: application/json" \
	    -d '{"sessionId":"'"$$SESSION_ID"'","playerId":"'"$$PLAYER_ID"'","playerName":"'"$$PLAYER_NAME"'"}' > /dev/null; \
	done; \
	\
	echo "→ Starting game session..."; \
	curl -s -X POST http://localhost:3000/start \
	  -H "Content-Type: application/json" \
	  -d '{"sessionId":"'"$$SESSION_ID"'"}' | jq .; \
	\
	echo "→ Initializing judge rotation..."; \
	curl -s -X POST http://localhost:3000/init-judge \
	  -H "Content-Type: application/json" \
	  -d '{"sessionId":"'"$$SESSION_ID"'"}' | jq .; \
	\
	echo "→ Rotating judge..."; \
	curl -s -X POST http://localhost:3000/rotate-judge \
	  -H "Content-Type: application/json" \
	  -d '{"sessionId":"'"$$SESSION_ID"'"}' | jq .; \
	\
	echo "→ Rotating judge again..."; \
	curl -s -X POST http://localhost:3000/rotate-judge \
	  -H "Content-Type: application/json" \
	  -d '{"sessionId":"'"$$SESSION_ID"'"}' | jq .

