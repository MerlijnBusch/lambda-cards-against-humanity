const {
    DynamoDBClient,
    GetItemCommand,
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
      const res = await dynamo.send(
        new GetItemCommand({
          TableName: "GameSessions",
          Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
        })
      );

      const rotation = res.Item?.judgeRotation?.L?.map(i => i.S).filter(Boolean);
      let index = parseInt(res.Item?.rotationIndex?.N ?? "-1");

      if (!Array.isArray(rotation) || rotation.length === 0 || index < 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "Judge rotation not initialized" }) };
      }

      const nextIndex = (index + 1) % rotation.length;
      const nextJudge = rotation[nextIndex];

      await dynamo.send(
        new UpdateItemCommand({
          TableName: "GameSessions",
          Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
          UpdateExpression: "SET currentJudgeId = :judge, rotationIndex = :index",
          ExpressionAttributeValues: {
            ":judge": { S: nextJudge },
            ":index": { N: nextIndex.toString() },
          },
        })
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Judge rotated", judgeId: nextJudge }),
      };
    } catch (err) {
      console.error("Error rotating judge:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not rotate judge" }),
      };
    }
  };
  