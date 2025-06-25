const {
    DynamoDBClient,
    GetItemCommand,
  } = require("@aws-sdk/client-dynamodb");

  const dynamo = new DynamoDBClient({
    region: "eu-central-1",
    endpoint: "http://dynamodb-local:8000",
  });

  /**
   * Fetch session metadata for a given sessionId.
   * @param {string} sessionId
   * @returns {Promise<{ sessionId: string, currentJudgeId: string | null, round: number, state: string, deckIds: string[] }>}
   */
  async function getSession(sessionId) {
    if (!sessionId) {
      throw new Error("Missing sessionId");
    }

    const key = {
      PK: { S: `SESSION#${sessionId}` },
      SK: { S: "METADATA" },
    };

    const res = await dynamo.send(new GetItemCommand({
      TableName: "GameSessions",
      Key: key,
    }));

    if (!res.Item) {
      throw new Error("Session not found");
    }

    return {
      sessionId,
      currentJudgeId: res.Item.currentJudgeId?.S || null,
      round: parseInt(res.Item.round?.N || "0"),
      state: res.Item.state?.S || "unknown",
      deckIds: res.Item.deckIds?.SS || [],
    };
  }

  module.exports = getSession;
