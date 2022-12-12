import { open } from "fs/promises";
import http from "http";
import url from "url";
import WebSocket from "ws";

interface ServerOptions {
    eventLogPath: string;
    httpServer: http.Server;
    webSocketPath: string;
}

type IncomingMessage =
    | {type: "update", payload: unknown};

export async function listen({eventLogPath, httpServer, webSocketPath}: ServerOptions) {
    const wss = new WebSocket.Server({noServer: true});

    let connections: Array<WebSocket.WebSocket> = [];
    const messages: Array<unknown> = [];

    const eventLogFile = await open(eventLogPath, "a+");

    for await (const line of eventLogFile.readLines({encoding: "utf-8", start: 0, autoClose: false})) {
        messages.push(line);
    }

    const eventLogWriteStream = eventLogFile.createWriteStream({encoding: "utf-8"});

    function receiveUpdate(update: unknown) {
        const outgoingMessage = JSON.stringify({
            index: messages.length,
            payload: update,
        });
        // TODO: error handling of event log
        eventLogWriteStream.write(outgoingMessage);
        eventLogWriteStream.write("\n");
        messages.push(outgoingMessage);
        connections.forEach((ws) => ws.send(outgoingMessage));
    }

    wss.on("connection", function connection(ws) {
        connections.push(ws);

        const intervalId = setInterval(() => {
            ws.ping();
        }, 1000);

        messages.forEach(message => ws.send(message));

        ws.on("close", () => {
            connections = connections.filter(connection => connection != ws);
            clearInterval(intervalId);
        });

        ws.on("message", function incoming(incomingMessageBinary) {
            const incomingMessage: IncomingMessage = JSON.parse(incomingMessageBinary.toString("utf-8"));

            switch (incomingMessage.type) {
                case "update":
                    receiveUpdate(incomingMessage.payload);
            }
        });
    });

    httpServer.on("upgrade", function upgrade(request, socket, head) {
        const requestPath = url.parse(request.url || "").pathname;

        if (requestPath === webSocketPath) {
            wss.handleUpgrade(request, socket, head, function done(ws) {
                wss.emit("connection", ws, request);
            });
        } else {
            socket.destroy();
        }
    });

}
