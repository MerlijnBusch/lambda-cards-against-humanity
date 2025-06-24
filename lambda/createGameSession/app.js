const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamo = new DynamoDBClient({
  region: "eu-central-1",
  endpoint: "http://dynamodb-local:8000",
});

exports.handler = async (event) => {
  const sessionId = uuidv4();

  // These would normally come from Cognito or request body
  const userId = "user-xyz";
  const playerName = "Alice";
  const deckIds = ["animals-party"];

  const now = new Date().toISOString();

  const metadataItem = {
    PK: { S: `SESSION#${sessionId}` },
    SK: { S: "METADATA" },
    Type: { S: "GameSession" },
    sessionId: { S: sessionId },
    createdAt: { S: now },
    state: { S: "waiting" },
    round: { N: "1" },
    currentJudgeId: { S: userId },
    deckIds: { SS: deckIds }
  };

  const playerItem = {
    PK: { S: `SESSION#${sessionId}` },
    SK: { S: `PLAYER#${userId}` },
    Type: { S: "Player" },
    playerId: { S: userId },
    name: { S: playerName },
    score: { N: "0" },
    isJudge: { BOOL: true }
  };

  const deckRefItems = deckIds.map((deckId) => ({
    PK: { S: `SESSION#${sessionId}` },
    SK: { S: `DECK#${deckId}` },
    Type: { S: "DeckRef" }
  }));

  try {
    const commands = [
      new PutItemCommand({ TableName: "GameSessions", Item: metadataItem }),
      new PutItemCommand({ TableName: "GameSessions", Item: playerItem }),
      ...deckRefItems.map(
        (item) => new PutItemCommand({ TableName: "GameSessions", Item: item })
      )
    ];

    for (const cmd of commands) {
      await dynamo.send(cmd);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId })
    };
  } catch (err) {
    console.error("Error saving session:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not create session" })
    };
  }
};
