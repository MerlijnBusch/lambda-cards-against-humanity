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
    // 1. Fetch all items in the session
    const res = await dynamo.send(
      new QueryCommand({
        TableName: "GameSessions",
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": { S: sessionKey },
        },
      })
    );

    const players = res.Items.filter((item) => item.Type?.S === "Player");

    if (players.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No players in session" }),
      };
    }

    // ✅ 2. Just update state to "in_progress"
    await dynamo.send(
      new UpdateItemCommand({
        TableName: "GameSessions",
        Key: {
          PK: { S: sessionKey },
          SK: { S: "METADATA" },
        },
        UpdateExpression: "SET #state = :state",
        ExpressionAttributeNames: {
          "#state": "state",
        },
        ExpressionAttributeValues: {
          ":state": { S: "in_progress" },
        },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Game session started",
        playerCount: players.length,
      }),
    };
  } catch (err) {
    console.error("Error starting game:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not start game" }),
    };
  }
};
