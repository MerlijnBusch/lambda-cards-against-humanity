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
    const {sessionId, playerId, cardIds} = JSON.parse(event.body || "{}");

    if (!sessionId || !playerId || !Array.isArray(cardIds)) {
        return {
            statusCode: 400,
            body: JSON.stringify({error: "Missing sessionId, playerId or cardIds[]"}),
        };
    }

    const sessionKey = `SESSION#${sessionId}`;
    const playerKey = {
        PK: {S: sessionKey},
        SK: {S: `PLAYER#${playerId}`},
    };

    try {
        // 1. Load session metadata
        const sessionRes = await dynamo.send(
            new GetItemCommand({
                TableName: "GameSessions",
                Key: {
                    PK: {S: sessionKey},
                    SK: {S: "METADATA"},
                },
            })
        );

        const currentJudge = sessionRes.Item?.currentJudgeId?.S;
        const roundNumber = sessionRes.Item?.round?.N;

        if (!roundNumber) {
            throw new Error("No round in progress");
        }

        if (playerId === currentJudge) {
            return {
                statusCode: 400,
                body: JSON.stringify({error: "Judge cannot submit cards"}),
            };
        }

        // 2. Load player hand
        const playerRes = await dynamo.send(
            new GetItemCommand({
                TableName: "GameSessions",
                Key: playerKey,
            })
        );

        const hand = playerRes.Item?.hand?.L?.map(card => card.S) || [];

        // 3. Load round info
        const roundKey = {
            PK: {S: sessionKey},
            SK: {S: `ROUND#${roundNumber}`},
        };

        const roundRes = await dynamo.send(
            new GetItemCommand({
                TableName: "GameSessions",
                Key: roundKey,
            })
        );

        const pickCount = parseInt(roundRes.Item?.pick?.N || "1");

        if (cardIds.length !== pickCount) {
            return {
                statusCode: 400,
                body: JSON.stringify({error: `Must submit exactly ${pickCount} card(s)`}),
            };
        }

        for (const cardId of cardIds) {
            if (!hand.includes(cardId)) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({error: `Card ${cardId} is not in player's hand`}),
                };
            }
        }

        // 4. Append to submissions list
        await dynamo.send(
            new UpdateItemCommand({
                TableName: "GameSessions",
                Key: roundKey,
                UpdateExpression:
                    "SET submissions = list_append(if_not_exists(submissions, :empty), :entry)",
                ExpressionAttributeValues: {
                    ":empty": {L: []},
                    ":entry": {
                        L: [
                            {
                                M: {
                                    playerId: {S: playerId},
                                    cards: {L: cardIds.map(id => ({S: id}))},
                                },
                            },
                        ],
                    },
                },
            })
        );

        // 5. Remove submitted cards from hand
        const updatedHand = hand.filter(card => !cardIds.includes(card));

        await dynamo.send(
            new UpdateItemCommand({
                TableName: "GameSessions",
                Key: playerKey,
                UpdateExpression: "SET hand = :newHand",
                ExpressionAttributeValues: {
                    ":newHand": {L: updatedHand.map(id => ({S: id}))},
                },
            })
        );

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Cards submitted",
                submitted: cardIds,
            }),
        };
    } catch (err) {
        console.error("Error submitting cards:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({error: "Could not submit cards"}),
        };
    }
};
