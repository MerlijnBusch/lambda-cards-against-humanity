const { DynamoDBClient, DeleteItemCommand } = require("@aws-sdk/client-dynamodb");
const dynamo = new DynamoDBClient({
  region: "eu-central-1",
  endpoint: "http://dynamodb-local:8000", // ✅ Local DynamoDB
});

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const delCmd = new DeleteItemCommand({
    TableName: "Connections",
    Key: {
      connectionId: { S: connectionId },
    },
  });

  try {
    await dynamo.send(delCmd);
    return { statusCode: 200 };
  } catch (err) {
    console.error("Disconnect error:", err);
    return { statusCode: 500 };
  }
};
