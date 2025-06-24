# 🗂️ Project Structure & Scope

This project implements a minimal serverless clone of **Cards Against Humanity**, using AWS Lambda and DynamoDB. Each Lambda function is self-contained, focused, and routed individually through API Gateway (via AWS SAM).

---

## 📁 Folder Structure

```
lambda/
├── createGameSession/ # Creates a new game session (with deck references)
├── joinGameSession/ # Adds a player to the session (no hand yet)
├── startGameSession/ # Transitions session state to "in_progress"
├── initJudge/ # Initializes judge rotation and sets first judge
├── rotateJudge/ # Advances to the next judge in the rotation
├── startRound/ # Draws a black card and creates ROUND#<n>
├── drawCards/ # Fills a player's hand to 7 unique white cards
├── submitCard/ # Submits a player's cards and removes them from hand
├── pickWinner/ # Judge selects a winner and updates score
├── getSession/ # Returns session metadata (judge, state, etc.)
```

---

## 🗃️ DynamoDB Design

### GameSessions Table

- Partition Key: `PK = SESSION#<sessionId>`
- Sort Key:
  - `SK = METADATA`: session-level metadata
  - `SK = PLAYER#<playerId>`: one item per player
  - `SK = ROUND#<number>`: one item per round
  - `SK = DECK#<deckId>`: reference to which decks were selected

### CardDecks Table

- Partition Key: `PK = DECK#<deckId>`
- Sort Key:
  - `SK = METADATA`: deck metadata
  - `SK = BLACK#<cardId>`: black prompt cards
  - `SK = WHITE#<cardId>`: white response cards

---

## 🔧 Local Development

- `Makefile`: Commands to build, seed, run tests, and automate setup
- `scripts/`:
  - `seed-card-decks.sh`: Seeds 1 demo deck with cards
  - `test-start.sh`: Creates a game, joins players, simulates full round
- `template.yaml`: Defines all Lambda function handlers + HTTP API routes
- `sam local start-api`: Runs the full app locally on `http://localhost:3000`

---

## 🔁 Round Lifecycle Flow

1. Players join via `/join`
2. Cards are drawn via `/draw-cards`
3. Judge initialized via `/init-judge`
4. Round started via `/start-round` (black card drawn)
5. Players submit via `/submit-card`
6. Judge picks winner via `/pick-winner`
7. Score updates, session enters `waiting_next_round`
8. Repeat via `/rotate-judge` + `/draw-cards` + `/start-round`

---

## 🌍 Future Expansion

For long-term roadmap, see [`README.md`](../README.md#future-plans) or `ROADMAP.md`.

Planned upgrades include:
- Frontend + S3 + CloudFront hosting
- Cognito/Keycloak authentication
- WebSocket-based real-time multiplayer
- Terraform-based deployment

---

Let us know in a PR or issue if you need a hand setting this up locally.
