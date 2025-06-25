#!/bin/bash
set -e

echo "→ Creating session..."
SESSION_ID=$(curl -s -X POST http://localhost:3000/create | jq -r '.sessionId')
echo "Created session: $SESSION_ID"

# Join 4 players
for i in 1 2 3 4; do
  PLAYER_ID="user-$i"
  PLAYER_NAME="Player$i"
  echo "→ Joining $PLAYER_NAME..."
  curl -s -X POST http://localhost:3000/join \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$SESSION_ID\",\"playerId\":\"$PLAYER_ID\",\"playerName\":\"$PLAYER_NAME\"}" > /dev/null
done

# Start game
echo "→ Starting game session..."
curl -s -X POST http://localhost:3000/start \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}" | jq .

# === ROUND 1 via /next-round ===
echo "→ Starting ROUND 1 via /next-round..."
ROUND_1_INFO=$(curl -s -X POST http://localhost:3000/next-round \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
echo "$ROUND_1_INFO" | jq .

PICK=$(echo "$ROUND_1_INFO" | jq -r '.blackCard.pick')
JUDGE=$(curl -s -X GET http://localhost:3000/session/"$SESSION_ID" | jq -r '.currentJudgeId')

echo "→ Submitting cards for ROUND 1..."
for i in 1 2 3 4; do
  PLAYER_ID="user-$i"
  if [[ "$PLAYER_ID" == "$JUDGE" ]]; then
    echo "  ❌ Skipping judge ($PLAYER_ID)"
    continue
  fi

  HAND=$(aws dynamodb get-item \
    --table-name GameSessions \
    --key "{\"PK\": {\"S\": \"SESSION#$SESSION_ID\"}, \"SK\": {\"S\": \"PLAYER#$PLAYER_ID\"}}" \
    --endpoint-url http://localhost:8000 \
    --region eu-central-1 | jq -r '.Item.hand.L | map(.S) | .[0:'"$PICK"']')

  echo "  → $PLAYER_ID submitting cards: $HAND"
  curl -s -X POST http://localhost:3000/submit-card \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$SESSION_ID\", \"playerId\":\"$PLAYER_ID\", \"cardIds\": $HAND}" > /dev/null
done

echo "→ Picking winner for ROUND 1..."
for p in user-1 user-2 user-3 user-4; do
  if [[ "$p" != "$JUDGE" ]]; then
    WINNER_ID=$p
    break
  fi
done

curl -s -X POST http://localhost:3000/pick-winner \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\", \"judgeId\":\"$JUDGE\", \"winnerId\":\"$WINNER_ID\"}" | jq .

# === ROUND 2 via /next-round ===
echo "→ Starting ROUND 2 via /next-round..."
ROUND_2_INFO=$(curl -s -X POST http://localhost:3000/next-round \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
echo "$ROUND_2_INFO" | jq .

NEXT_PICK=$(echo "$ROUND_2_INFO" | jq -r '.blackCard.pick')
NEXT_JUDGE=$(curl -s -X GET http://localhost:3000/session/"$SESSION_ID" | jq -r '.currentJudgeId')

echo "→ Submitting cards for ROUND 2..."
for i in 1 2 3 4; do
  PLAYER_ID="user-$i"
  if [[ "$PLAYER_ID" == "$NEXT_JUDGE" ]]; then
    echo "  ❌ Skipping judge ($PLAYER_ID)"
    continue
  fi

  HAND=$(aws dynamodb get-item \
    --table-name GameSessions \
    --key "{\"PK\": {\"S\": \"SESSION#$SESSION_ID\"}, \"SK\": {\"S\": \"PLAYER#$PLAYER_ID\"}}" \
    --endpoint-url http://localhost:8000 \
    --region eu-central-1 | jq -r '.Item.hand.L | map(.S) | .[0:'"$NEXT_PICK"']')

  echo "  → $PLAYER_ID submitting cards: $HAND"
  curl -s -X POST http://localhost:3000/submit-card \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$SESSION_ID\", \"playerId\":\"$PLAYER_ID\", \"cardIds\": $HAND}" > /dev/null
done

echo "→ Picking winner for ROUND 2..."
for p in user-1 user-2 user-3 user-4; do
  if [[ "$p" != "$NEXT_JUDGE" ]]; then
    NEXT_WINNER=$p
    break
  fi
done

curl -s -X POST http://localhost:3000/pick-winner \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\", \"judgeId\":\"$NEXT_JUDGE\", \"winnerId\":\"$NEXT_WINNER\"}" | jq .

echo "✅ Script complete: 2 rounds played using /next-round."
