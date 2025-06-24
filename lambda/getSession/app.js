const {
    DynamoDBClient,
    GetItemCommand,
} = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({
    region: "eu-central-1",
    endpoint: "http://dynamodb-local:8000",
});

exports.handler = async (event) => {
    const sessionId = event.pathParameters?.sessionId;
    if (!sessionId) {
        return {
            statusCode: 400,
            body: JSON.stringify({error: "Missing sessionId"}),
        };
    }

    const sessionKey = {
        PK: {S: `SESSION#${sessionId}`},
        SK: {S: "METADATA"},
    };

    try {
        const res = await dynamo.send(
            new GetItemCommand({
                TableName: "GameSessions",
                Key: sessionKey,
            })
        );

        if (!res.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({error: "Session not found"}),
            };
        }

        const output = {
            sessionId,
            currentJudgeId: res.Item.currentJudgeId?.S,
            round: parseInt(res.Item.round?.N || "0"),
            state: res.Item.state?.S,
            deckIds: res.Item.deckIds?.SS || [],
        };

        return {
            statusCode: 200,
            body: JSON.stringify(output),
        };
    } catch (err) {
        console.error("Error getting session metadata:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({error: "Could not fetch session"}),
        };
    }
};
