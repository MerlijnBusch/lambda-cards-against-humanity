const {
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand
  } = require("@aws-sdk/client-dynamodb");

  const dynamo = new DynamoDBClient({
    region: "eu-central-1",
    endpoint: "http://dynamodb-local:8000",
  });

  exports.handler = async (event) => {
    const { sessionId, playerId, playerName } = JSON.parse(event.body || "{}");

    if (!sessionId || !playerId || !playerName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing sessionId, playerId or playerName" })
      };
    }

    try {
      // 1. Validate session exists
      const sessionKey = {
        PK: { S: `SESSION#${sessionId}` },
        SK: { S: "METADATA" }
      };

      const sessionRes = await dynamo.send(new GetItemCommand({
        TableName: "GameSessions",
        Key: sessionKey
      }));

      if (!sessionRes.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Session not found" })
        };
      }

      // 2. Add player record
      const playerItem = {
        PK: { S: `SESSION#${sessionId}` },
        SK: { S: `PLAYER#${playerId}` },
        Type: { S: "Player" },
        playerId: { S: playerId },
        name: { S: playerName },
        score: { N: "0" },
      };

      await dynamo.send(new PutItemCommand({
        TableName: "GameSessions",
        Item: playerItem
      }));

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Player joined session" })
      };

    } catch (err) {
      console.error("Error joining session:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not join session" })
      };
    }
  };
