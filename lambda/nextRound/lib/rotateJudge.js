const {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
} = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({
  region: "eu-central-1",
  endpoint: "http://dynamodb-local:8000",
});

/**
 * Rotate to the next judge, or initialize rotation if not set.
 * @param {string} sessionId
 * @returns {Promise<{ judgeId: string }>}
 */
async function rotateJudge(sessionId) {
  const sessionKey = `SESSION#${sessionId}`;

  // 1. Fetch session metadata
  const res = await dynamo.send(new GetItemCommand({
    TableName: "GameSessions",
    Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
  }));

  const item = res.Item;
  let rotation = item?.judgeRotation?.L?.map(j => j.S) || [];
  let index = parseInt(item?.rotationIndex?.N ?? "-1");

  // 2. If rotation is not initialized, set it up
  if (rotation.length === 0 || index === -1) {
    const playersRes = await dynamo.send(new QueryCommand({
      TableName: "GameSessions",
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": { S: sessionKey },
        ":sk": { S: "PLAYER#" },
      },
    }));

    rotation = playersRes.Items.map(p => p.playerId.S).filter(Boolean).sort();
    if (rotation.length === 0) {
      throw new Error("No players found to initialize judge rotation");
    }

    index = 0;
  } else {
    // 3. Else rotate to next judge
    index = (index + 1) % rotation.length;
  }

  const judgeId = rotation[index];

  // 4. Save updates
  await dynamo.send(new UpdateItemCommand({
    TableName: "GameSessions",
    Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
    UpdateExpression: "SET judgeRotation = :rotation, rotationIndex = :index, currentJudgeId = :judge",
    ExpressionAttributeValues: {
      ":rotation": { L: rotation.map(id => ({ S: id })) },
      ":index": { N: index.toString() },
      ":judge": { S: judgeId },
    },
  }));

  return { judgeId };
}

module.exports = rotateJudge;
