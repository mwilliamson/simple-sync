import express from "express";
import http from "http";

import * as simpleSync from "./";

async function start() {
    const port = process.env.PORT || 8080;
    const webSocketPath = process.env.WEBSOCKET_PATH || "/ws";

    const app = express();
    app.use("/", express.static(process.argv[2]));
    const httpServer = http.createServer(app);

    await simpleSync.listen({
        eventLogPath: process.argv[3],
        httpServer,
        webSocketPath: webSocketPath,
    });

    httpServer.listen(port);

    console.log(`Serving on: 0.0.0.0:${port}`);
}

start();
