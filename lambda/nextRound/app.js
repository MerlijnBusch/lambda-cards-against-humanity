const rotateJudge = require("./lib/rotateJudge");
const drawCards = require("./lib/drawCards");
const startRound = require("./lib/startRound");
const listPlayers = require("./lib/listPlayers");
const getSession = require("./lib/getSession");

exports.handler = async (event) => {
  const { sessionId } = JSON.parse(event.body || "{}");

  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing sessionId" }),
    };
  }

  try {
    // 1. Rotate judge
    await rotateJudge(sessionId);

    // 2. Get players
    const { players } = await listPlayers(sessionId);

    // 3. Get current judge
    const { currentJudgeId } = await getSession(sessionId);

    // 4. Draw cards for non-judge players
    const others = players.filter(p => p.playerId !== currentJudgeId);
    await Promise.all(
      others.map(p => drawCards(sessionId, p.playerId))
    );

    // 5. Start round
    const result = await startRound(sessionId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Next round started",
        ...result,
      }),
    };
  } catch (err) {
    console.error("Error in nextRound:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not start next round" }),
    };
  }
};
