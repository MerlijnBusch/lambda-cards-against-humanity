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