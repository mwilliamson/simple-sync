import express from "express";
import http from "http";

import * as simpleSync from "./";

const port = process.env.PORT || 8080;

const app = express();
app.use("/", express.static(process.argv[2]));
const httpServer = http.createServer(app);

simpleSync.listen({httpServer, webSocketPath: "/ws"});

httpServer.listen(port);

console.log(`Serving on: 0.0.0.0:${port}`);
