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
    const {sessionId, judgeId, winnerId} = JSON.parse(event.body || "{}");

    if (!sessionId || !judgeId || !winnerId) {
        return {
            statusCode: 400,
            body: JSON.stringify({error: "Missing sessionId, judgeId, or winnerId"}),
        };
    }

    const sessionKey = `SESSION#${sessionId}`;

    try {
        // 1. Fetch session metadata
        const sessionRes = await dynamo.send(
            new GetItemCommand({
                TableName: "GameSessions",
                Key: {PK: {S: sessionKey}, SK: {S: "METADATA"}},
            })
        );

        const roundNumber = sessionRes.Item?.round?.N;
        const currentJudgeId = sessionRes.Item?.currentJudgeId?.S;

        if (judgeId !== currentJudgeId) {
            return {
                statusCode: 403,
                body: JSON.stringify({error: "Only the current judge can pick a winner"}),
            };
        }

        if (!roundNumber) {
            return {
                statusCode: 400,
                body: JSON.stringify({error: "No active round"}),
            };
        }

        // 2. Set winnerId in ROUND#<n>
        await dynamo.send(
            new UpdateItemCommand({
                TableName: "GameSessions",
                Key: {
                    PK: {S: sessionKey},
                    SK: {S: `ROUND#${roundNumber}`},
                },
                UpdateExpression: "SET winnerId = :winner",
                ExpressionAttributeValues: {
                    ":winner": {S: winnerId},
                },
            })
        );

        // 3. Increment winner's score
        await dynamo.send(
            new UpdateItemCommand({
                TableName: "GameSessions",
                Key: {
                    PK: {S: sessionKey},
                    SK: {S: `PLAYER#${winnerId}`},
                },
                UpdateExpression: "SET score = if_not_exists(score, :zero) + :inc",
                ExpressionAttributeValues: {
                    ":inc": {N: "1"},
                    ":zero": {N: "0"},
                },
            })
        );

        // 4. Optionally update session state
        await dynamo.send(
            new UpdateItemCommand({
                TableName: "GameSessions",
                Key: {PK: {S: sessionKey}, SK: {S: "METADATA"}},
                UpdateExpression: "SET #state = :nextState",
                ExpressionAttributeNames: {"#state": "state"},
                ExpressionAttributeValues: {":nextState": {S: "waiting_next_round"}},
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Winner picked",
                winnerId,
            }),
        };
    } catch (err) {
        console.error("Error picking winner:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({error: "Could not pick winner"}),
        };
    }
};
