# LocalStack Makefile
# Usage: make up, make down, make deploy, etc.

SHELL := /bin/bash
TF_DIR := ./terraform
COMPOSE := docker compose -f docker-compose.yml
AWS_LOCAL := aws --endpoint-url=http://localhost:4566 --region eu-central-1

.PHONY: up down clean plan deploy destroy seed logs

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

clean: down
	rm -rf $(TF_DIR)/.terraform
	rm -f $(TF_DIR)/terraform.tfstate*

plan:
	cd $(TF_DIR) && terraform init && terraform plan

deploy:
	cd $(TF_DIR) && terraform apply -auto-approve

destroy:
	cd $(TF_DIR) && terraform destroy -auto-approve

seed:
	$(AWS_LOCAL) dynamodb list-tables
	@echo "→ Add your seed scripts here (like inserting test data)"

logs:
	docker logs -f localstack

install-terraform:
	@echo "🔧 Installing Terraform..."
	@sudo apt-get update -y
	@sudo apt-get install -y gnupg software-properties-common curl
	@curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
	@echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $$(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
	@sudo apt-get update -y
	@sudo apt-get install terraform -y
	@terraform -version

local-stack-up:
	curl http://localhost:4566/_localstack/health

log-tables:
	aws dynamodb list-tables \
	  --endpoint-url http://localhost:4566 \
	  --region eu-central-1

zip-lambdas:
	@echo "📦 Zipping Lambda functions into ./output/"
	mkdir -p ../output
	cd ../lambda/websocket/connect && zip -r ../../../output/connect.zip app.js node_modules || zip ../../../output/connect.zip app.js
	cd ../lambda/websocket/disconnect && zip -r ../../../output/disconnect.zip app.js node_modules || zip ../../../output/disconnect.zip app.js
	cd ../lambda/websocket/message && zip -r ../../../output/message.zip app.js node_modules || zip ../../../output/message.zip app.js
	@echo "✅ All ZIPs created in ./output/"

