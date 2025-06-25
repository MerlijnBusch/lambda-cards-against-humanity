const {
    DynamoDBClient,
    QueryCommand,
  } = require("@aws-sdk/client-dynamodb");

  const dynamo = new DynamoDBClient({
    region: "eu-central-1",
    endpoint: "http://dynamodb-local:8000",
  });

  /**
   * Lists all players in a session.
   * @param {string} sessionId
   * @returns {Promise<{ players: Array<{ playerId: string, name: string, score: number }> }>}
   */
  async function listPlayers(sessionId) {
    if (!sessionId) {
      throw new Error("Missing sessionId");
    }

    const sessionKey = `SESSION#${sessionId}`;

    const res = await dynamo.send(new QueryCommand({
      TableName: "GameSessions",
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": { S: sessionKey },
        ":sk": { S: "PLAYER#" },
      },
    }));

    const players = res.Items.map(item => ({
      playerId: item.playerId.S,
      name: item.name.S,
      score: parseInt(item.score.N, 10),
    }));

    return { players };
  }

  module.exports = listPlayers;
  