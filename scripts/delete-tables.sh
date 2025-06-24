#!/bin/bash
set -e

ENDPOINT="http://localhost:8000"
REGION="eu-central-1"

echo "Deleting GameSessions table..."
aws dynamodb delete-table \
  --table-name GameSessions \
  --endpoint-url $ENDPOINT \
  --region $REGION

echo "Deleting CardDecks table..."
aws dynamodb delete-table \
  --table-name CardDecks \
  --endpoint-url $ENDPOINT \
  --region $REGION
