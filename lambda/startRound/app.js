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

  exports.handler = async (event) => {
    const { sessionId } = JSON.parse(event.body || "{}");
    const sessionKey = `SESSION#${sessionId}`;

    try {
      // 1. Get session metadata
      const sessionRes = await dynamo.send(
        new GetItemCommand({
          TableName: "GameSessions",
          Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
        })
      );

      const session = sessionRes.Item;
      const roundNumber = parseInt(session.round?.N ?? "1");
      const deckIds = session.deckIds?.SS ?? [];

      if (deckIds.length === 0) {
        throw new Error("No decks associated with session");
      }

      // 2. Pull all black cards from associated decks
      let blackCards = [];

      for (const deckId of deckIds) {
        const res = await dynamo.send(
          new QueryCommand({
            TableName: "CardDecks",
            KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
            ExpressionAttributeValues: {
              ":pk": { S: `DECK#${deckId}` },
              ":sk": { S: "BLACK#" },
            },
          })
        );

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
      await dynamo.send(
        new PutItemCommand({
          TableName: "GameSessions",
          Item: {
            PK: { S: sessionKey },
            SK: { S: `ROUND#${roundNumber}` },
            Type: { S: "Round" },
            blackCard: { S: chosen.text },
            blackCardId: { S: chosen.id },
            pick: { N: chosen.pick.toString() },
          },
        })
      );

      // 4. Update session state to "in_round"
      await dynamo.send(
        new UpdateItemCommand({
          TableName: "GameSessions",
          Key: { PK: { S: sessionKey }, SK: { S: "METADATA" } },
          UpdateExpression: "SET #state = :state",
          ExpressionAttributeNames: {
            "#state": "state",
          },
          ExpressionAttributeValues: {
            ":state": { S: "in_round" },
          },
        })
      );

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Round started",
          blackCard: chosen,
          round: roundNumber,
        }),
      };
    } catch (err) {
      console.error("Error starting round:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Could not start round" }),
      };
    }
  };
