exports.handler = async (event) => {
    const body = JSON.parse(event.body || "{}");
    const action = body.action;

    switch (action) {
      case "ping":
        return { statusCode: 200, body: "pong" };
      default:
        return { statusCode: 400, body: "Unknown action" };
    }
  };
