#!/bin/bash
aws dynamodb scan \
  --table-name CardDecks \
  --endpoint-url http://localhost:8000 \
  --region eu-central-1 \
  --output json | jq .
