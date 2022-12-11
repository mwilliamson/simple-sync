import http from "http";
import url from "url";
import WebSocket from "ws";

interface ServerOptions {
    httpServer: http.Server;
    webSocketPath: string;
}

export function listen({httpServer, webSocketPath}: ServerOptions) {
    const wss = new WebSocket.Server({noServer: true});

    let connections: Array<WebSocket.WebSocket> = [];
    const messages: Array<unknown> = [];

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

        ws.on("message", function incoming(payload) {
            const message = JSON.stringify({
                index: messages.length,
                payload: JSON.parse(payload.toString("utf-8")),
            });
            messages.push(message);
            connections.forEach((ws) => ws.send(message));
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
