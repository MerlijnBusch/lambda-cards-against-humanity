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

function getRandomItems(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

exports.handler = async (event) => {
    const {sessionId, playerId} = JSON.parse(event.body || "{}");

    const sessionKey = `SESSION#${sessionId}`;
    const playerKey = {
        PK: {S: sessionKey},
        SK: {S: `PLAYER#${playerId}`},
    };

    try {
        // 1. Fetch session metadata
        const sessionRes = await dynamo.send(
            new GetItemCommand({
                TableName: "GameSessions",
                Key: {
                    PK: {S: sessionKey},
                    SK: {S: "METADATA"},
                },
            })
        );

        const deckIds = sessionRes.Item?.deckIds?.SS || [];
        const drawnSet = new Set(sessionRes.Item?.drawnWhiteCardIds?.SS || []);

        // 2. Fetch player
        const playerRes = await dynamo.send(
            new GetItemCommand({
                TableName: "GameSessions",
                Key: playerKey,
            })
        );

        const currentHand = playerRes.Item?.hand?.L?.map(item => item.S) || [];

        if (currentHand.length >= 7) {
            return {
                statusCode: 200,
                body: JSON.stringify({message: "Player already has a full hand", hand: currentHand}),
            };
        }

        // 3. Load all white cards from decks
        let allCards = [];

        for (const deckId of deckIds) {
            const result = await dynamo.send(
                new QueryCommand({
                    TableName: "CardDecks",
                    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
                    ExpressionAttributeValues: {
                        ":pk": {S: `DECK#${deckId}`},
                        ":sk": {S: "WHITE#"},
                    },
                })
            );

            allCards.push(
                ...result.Items.map(item => ({
                    id: item.SK.S,
                    text: item.text.S,
                }))
            );
        }

        // 4. Filter already drawn
        const available = allCards.filter(c => !drawnSet.has(c.id));

        if (available.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({error: "No more white cards available in this session."}),
            };
        }

        const needed = 7 - currentHand.length;
        const drawn = getRandomItems(available, needed);

        const newHand = [...currentHand, ...drawn.map(c => c.id)];

        // 5. Update player hand
        await dynamo.send(
            new UpdateItemCommand({
                TableName: "GameSessions",
                Key: playerKey,
                UpdateExpression: "SET hand = :hand",
                ExpressionAttributeValues: {
                    ":hand": {L: newHand.map(id => ({S: id}))},
                },
            })
        );

        // 6. Update session drawnWhiteCardIds
        if (drawn.length > 0) {
            await dynamo.send(
                new UpdateItemCommand({
                    TableName: "GameSessions",
                    Key: {
                        PK: {S: sessionKey},
                        SK: {S: "METADATA"},
                    },
                    UpdateExpression: "ADD drawnWhiteCardIds :newDrawn",
                    ExpressionAttributeValues: {
                        ":newDrawn": {SS: drawn.map(c => c.id)},
                    },
                })
            );
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: `Drew ${drawn.length} card(s)`,
                newCards: drawn,
                hand: newHand,
            }),
        };
    } catch (err) {
        console.error("Error drawing cards:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({error: "Could not draw cards"}),
        };
    }
};
