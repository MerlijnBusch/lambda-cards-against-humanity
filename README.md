# 🃏 AWS Cards Against Humanity (MVP)
A minimal, serverless clone of Cards Against Humanity, built with:

* 🧠 AWS Lambda (SAM)
* 🗃 DynamoDB (local)
* ⚙️ Makefile & shell scripts for automation

This MVP supports full round-based play, with rotating judges, hand management, card submission, and scoring.

## 📦 Features
* ✅ Create and manage game sessions
* ✅ Join players into a session
* ✅ Assign unique white cards (hand of 7)
* ✅ Judge rotates automatically
* ✅ Black card drawn per round
* ✅ Players submit white cards (validated)
* ✅ Judge picks a winner
* ✅ Score tracking
* 🔁 Supports repeatable round flow

## 🛠️ Future Plans

### 🔹 Game Logic & Flow
  * [ ] next-round endpoint (rotate → draw → start)
  * [ ] End game after X rounds or score limit
  * [ ] Timeout auto-pick if judge is inactive

### 🔹 Gameplay UX
  * [ ] Anonymous submissions to judge
  * [ ] Round history and summary
  * [ ] Track picks and round stats

### 🔹 Admin & Dev Tools
  * [ ] CLI or UI session monitor
  * [ ] Reset session endpoint
  * [ ] Replay log or round export

### 🔹 Multiplayer Polish
  * [ ] WebSocket-based real-time updates
  * [ ] Lobby chat & ready-check system
  * [ ] Reconnect logic for players

### 🔹 Infra & Deployment
  * [ ] Replace DynamoDB Local with LocalStack
  * [ ] Host frontend via S3 + CloudFront
  * [ ] Use Cognito or Keycloak for auth
  * [ ] Define infra via Terraform
  * [ ] Deploy via GitHub Actions CI/CD