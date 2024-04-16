import express from "express";
import http from "http";

import * as simpleSync from "./";

async function start() {
    const eventLogPath = process.env.EVENT_LOG_PATH;
    const port = process.env.PORT || 8080;
    const webSocketPath = process.env.WEBSOCKET_PATH || "/ws";

    const app = express();
    app.use("/", express.static(process.argv[2]));
    const httpServer = http.createServer(app);

    await simpleSync.listen({
        eventLogPath,
        httpServer,
        webSocketPath: webSocketPath,
    });

    httpServer.listen(port);

    console.log(`Serving on: 0.0.0.0:${port}`);
}

start();
