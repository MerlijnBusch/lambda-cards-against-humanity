const {
    DynamoDBClient,
    QueryCommand,
    UpdateItemCommand,
  } = require("@aws-sdk/client-dynamodb");

  const dynamo = new DynamoDBClient({
    region: "eu-central-1",
    endpoint: "http://dynamodb-local:8000",
  });

  exports.handler = async (event) => {
    const { sessionId } = JSON.parse(event.body || "{}");
    const sessionKey = `SESSION#${sessionId}`;

    try {
      // Get all players
      const playersRes = await dynamo.send(
        new QueryCommand({
          TableName: "GameSessions",
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": { S: sessionKey },
            ":sk": { S: "PLAYER#" },
          },
        })
      );

      const playerIds = playersRes.Items.map(p => p.playerId.S).filter(Boolean);
      playerIds.sort();

      if (playerIds.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "No players to initialize rotation" }) };
      }

      await dynamo.send(
        new UpdateItemCommand({
          TableName: "GameSessions",
          Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
          UpdateExpression: "SET judgeRotation = :rotation, rotationIndex = :index, currentJudgeId = :judge",
          ExpressionAttributeValues: {
            ":rotation": { L: playerIds.map(id => ({ S: id })) },
            ":index": { N: "0" },
            ":judge": { S: playerIds[0] },
          },
        })
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Judge rotation initialized", judgeId: playerIds[0] }),
      };
    } catch (err) {
      console.error("Error initializing judge rotation:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not initialize judge rotation" }),
      };
    }
  };
  