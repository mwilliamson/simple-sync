import http from "http";
import url from "url";
import WebSocket from "ws";

interface ServerOptions {
    httpServer: http.Server;
    webSocketPath: string;
}

type IncomingMessage =
    | {type: "update", payload: unknown};

export function listen({httpServer, webSocketPath}: ServerOptions) {
    const wss = new WebSocket.Server({noServer: true});

    let connections: Array<WebSocket.WebSocket> = [];
    const messages: Array<unknown> = [];

    function receiveUpdate(update: unknown) {
        const outgoingMessage = JSON.stringify({
            index: messages.length,
            payload: update,
        });
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
