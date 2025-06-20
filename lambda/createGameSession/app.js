// createGameSession/app.js
const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamo = new DynamoDBClient({
  region: "eu-central-1",
  endpoint: "http://dynamodb-local:8000",
});

exports.handler = async (event) => {
  const sessionId = uuidv4();

  const gameSession = {
    sessionId,
    players: [],
    deck: {
      black: ["Why can't I sleep at night?"],
      white: ["A fart so powerful it ends the world."]
    },
    state: "waiting"
  };

  const params = {
    TableName: "GameSessions",
    Item: {
      PK: { S: `SESSION#${sessionId}` },
      Data: { S: JSON.stringify(gameSession) }
    }
  };

  try {
    await dynamo.send(new PutItemCommand(params));
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
