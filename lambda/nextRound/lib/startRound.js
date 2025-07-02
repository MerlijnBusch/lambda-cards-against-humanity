const {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  QueryCommand,
  PutItemCommand,
} = require("@aws-sdk/client-dynamodb");

const dynamo = new DynamoDBClient({
  region: "eu-central-1",
  endpoint: "http://dynamodb-local:8000", // ✅ Local DynamoDB
});

  function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Starts a new round: draws a black card and updates session/round data.
   * @param {string} sessionId
   * @returns {Promise<{ message: string, blackCard: object, round: number }>}
   */
  async function startRound(sessionId) {
    const sessionKey = `SESSION#${sessionId}`;

    // 1. Get session metadata
    const sessionRes = await dynamo.send(new GetItemCommand({
      TableName: "GameSessions",
      Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
    }));

    const session = sessionRes.Item;
    if (!session) throw new Error("Session not found");

    const currentRound = parseInt(session.round?.N ?? "0");
    const newRoundNumber = currentRound + 1;
    const deckIds = session.deckIds?.SS || [];

    if (deckIds.length === 0) {
      throw new Error("No decks associated with session");
    }

    // 2. Load all black cards from decks
    let blackCards = [];

    for (const deckId of deckIds) {
      const res = await dynamo.send(new QueryCommand({
        TableName: "CardDecks",
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": { S: `DECK#${deckId}` },
          ":sk": { S: "BLACK#" },
        },
      }));

      blackCards.push(
        ...res.Items.map(item => ({
          id: item.SK.S,
          text: item.text.S,
          pick: parseInt(item.pick.N),
        }))
      );
    }

    if (blackCards.length === 0) {
      throw new Error("No black cards available in deck(s)");
    }

    const chosen = getRandomItem(blackCards);

    // 3. Save new round
    await dynamo.send(new PutItemCommand({
      TableName: "GameSessions",
      Item: {
        PK: { S: sessionKey },
        SK: { S: `ROUND#${newRoundNumber}` },
        Type: { S: "Round" },
        blackCard: { S: chosen.text },
        blackCardId: { S: chosen.id },
        pick: { N: chosen.pick.toString() },
        submissions: { L: [] },
      },
    }));

    // 4. Update session state + round #
    await dynamo.send(new UpdateItemCommand({
      TableName: "GameSessions",
      Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
      UpdateExpression: "SET #state = :state, round = :newRound",
      ExpressionAttributeNames: {
        "#state": "state",
      },
      ExpressionAttributeValues: {
        ":state": { S: "in_round" },
        ":newRound": { N: newRoundNumber.toString() },
      },
    }));

    // 5. Return info
    return {
      message: "Round started",
      blackCard: chosen,
      round: newRoundNumber,
    };
  }

  module.exports = startRound;
