const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb");
const dynamo = new DynamoDBClient({
  region: "eu-central-1",
  endpoint: "http://dynamodb-local:8000", // ✅ Local DynamoDB
});

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const putCmd = new PutItemCommand({
    TableName: "Connections",
    Item: {
      connectionId: { S: connectionId },
    },
  });

  try {
    await dynamo.send(putCmd);
    return { statusCode: 200 };
  } catch (err) {
    console.error("Connect error:", err);
    return { statusCode: 500 };
  }
};
