#!/bin/bash
set -e

echo "→ Seeding CardDecks table..."

# Create deck metadata
aws dynamodb put-item \
  --table-name CardDecks \
  --item '{
    "PK": { "S": "DECK#animals-party" },
    "SK": { "S": "METADATA" },
    "Type": { "S": "Deck" },
    "deckId": { "S": "animals-party" },
    "name": { "S": "Animal Party" },
    "tags": { "L": [ { "S": "animals" }, { "S": "party" } ] },
    "description": { "S": "A wild and wacky animal-themed deck" }
  }' \
  --endpoint-url http://localhost:8000 \
  --region eu-central-1

echo "→ Seeding CardDecks black cards..."
for i in $(seq 1 7); do
  PICK=$(( (RANDOM % 2) + 1 ))
  aws dynamodb put-item \
    --table-name CardDecks \
    --item '{
      "PK": { "S": "DECK#animals-party" },
      "SK": { "S": "BLACK#'"$i"'" },
      "Type": { "S": "BlackCard" },
      "text": { "S": "Black card prompt '"$i"': What would an animal never do?" },
      "pick": { "N": "'"$PICK"'" }
    }' \
    --endpoint-url http://localhost:8000 \
    --region eu-central-1
done

echo "→ Seeding CardDecks white cards..."
for i in $(seq 1 50); do
  aws dynamodb put-item \
    --table-name CardDecks \
    --item '{
      "PK": { "S": "DECK#animals-party" },
      "SK": { "S": "WHITE#'"$i"'" },
      "Type": { "S": "WhiteCard" },
      "text": { "S": "White card answer '"$i"': A mysterious animal act" }
    }' \
    --endpoint-url http://localhost:8000 \
    --region eu-central-1
done

echo "✔ CardDecks seeded with 7 black cards and 50 white cards."
