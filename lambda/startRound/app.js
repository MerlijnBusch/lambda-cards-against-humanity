const startRound = require("./lib/startRound");

exports.handler = async (event) => {
  const { sessionId } = JSON.parse(event.body || "{}");

  if (!sessionId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing sessionId" }),
    };
  }

  try {
    const result = await startRound(sessionId);
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error("startRound error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Could not start round" }),
    };
  }
};
