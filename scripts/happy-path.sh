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

# Draw cards for each player
echo "→ Drawing cards for each player..."
for i in 1 2 3 4; do
  PLAYER_ID="user-$i"
  echo "  → Drawing for $PLAYER_ID"
  curl -s -X POST http://localhost:3000/draw-cards \
    -H "Content-Type: application/json" \
    -d "{\"sessionId\":\"$SESSION_ID\", \"playerId\":\"$PLAYER_ID\"}" > /dev/null
done

# Init judge
echo "→ Initializing judge rotation..."
curl -s -X POST http://localhost:3000/init-judge \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}" | jq .

# Start round
echo "→ Starting round..."
ROUND_INFO=$(curl -s -X POST http://localhost:3000/start-round \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\"}")
echo "$ROUND_INFO" | jq .

PICK=$(echo "$ROUND_INFO" | jq -r '.blackCard.pick')
JUDGE=$(curl -s -X GET http://localhost:3000/session/"$SESSION_ID" | jq -r '.currentJudgeId')

# Simulate card submissions
echo "→ Simulating card submissions..."
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
    -d "{\"sessionId\":\"$SESSION_ID\", \"playerId\":\"$PLAYER_ID\", \"cardIds\": $HAND}" | jq .
done

# Pick winner (random non-judge)
echo "→ Picking round winner..."
ALL_PLAYERS=(user-1 user-2 user-3 user-4)
for p in "${ALL_PLAYERS[@]}"; do
  if [[ "$p" != "$JUDGE" ]]; then
    WINNER_ID=$p
    break
  fi
done

curl -s -X POST http://localhost:3000/pick-winner \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\", \"judgeId\":\"$JUDGE\", \"winnerId\":\"$WINNER_ID\"}" | jq .
