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
	  --attribute-definitions AttributeName=PK,AttributeType=S \
	  --key-schema AttributeName=PK,KeyType=HASH \
	  --billing-mode PAY_PER_REQUEST \
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