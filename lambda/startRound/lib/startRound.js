const {
    DynamoDBClient,
    QueryCommand,
    PutItemCommand,
    UpdateItemCommand,
    GetItemCommand,
} = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({
    region: "eu-central-1",
    endpoint: "http://dynamodb-local:8000",
});

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Starts a new round by drawing a black card and saving the round state.
 * @param {string} sessionId
 * @returns {Promise<{ message: string, blackCard: object, round: number }>}
 */
async function startRound(sessionId) {
    const sessionKey = `SESSION#${sessionId}`;

    // 1. Fetch session metadata
    const sessionRes = await dynamo.send(new GetItemCommand({
        TableName: "GameSessions",
        Key: {PK: {S: sessionKey}, SK: {S: "METADATA"}},
    }));

    const session = sessionRes.Item;
    const roundNumber = parseInt(session.round?.N ?? "1");
    const deckIds = session.deckIds?.SS ?? [];

    if (deckIds.length === 0) {
        throw new Error("No decks associated with session");
    }

    // 2. Pull black cards from decks
    let blackCards = [];

    for (const deckId of deckIds) {
        const res = await dynamo.send(new QueryCommand({
            TableName: "CardDecks",
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
                ":pk": {S: `DECK#${deckId}`},
                ":sk": {S: "BLACK#"},
            },
        }));

        const cards = res.Items.map(item => ({
            id: item.SK.S,
            text: item.text.S,
            pick: parseInt(item.pick.N),
        }));

        blackCards.push(...cards);
    }

    if (blackCards.length === 0) {
        throw new Error("No black cards available");
    }

    const chosen = getRandomItem(blackCards);

    // 3. Save round to GameSessions
    await dynamo.send(new PutItemCommand({
        TableName: "GameSessions",
        Item: {
            PK: {S: sessionKey},
            SK: {S: `ROUND#${roundNumber}`},
            Type: {S: "Round"},
            blackCard: {S: chosen.text},
            blackCardId: {S: chosen.id},
            pick: {N: chosen.pick.toString()},
            submissions: {L: []},
        },
    }));

    // 4. Update session state to "in_round"
    await dynamo.send(new UpdateItemCommand({
        TableName: "GameSessions",
        Key: {PK: {S: sessionKey}, SK: {S: "METADATA"}},
        UpdateExpression: "SET #state = :state",
        ExpressionAttributeNames: {
            "#state": "state",
        },
        ExpressionAttributeValues: {
            ":state": {S: "in_round"},
        },
    }));

    return {
        message: "Round started",
        blackCard: chosen,
        round: roundNumber,
    };
}

module.exports = startRound;
