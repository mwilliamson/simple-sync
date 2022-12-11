import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import * as simpleSync from "../../../lib/client";

type AppState = number;

function initialAppState(): AppState {
  return 0;
}

type AppUpdate =
  | {type: "increment"}
  | {type: "decrement"};

function applyAppUpdate(state: AppState, update: AppUpdate): AppState {
  switch (update.type) {
    case "increment":
      return state + 1;
    case "decrement":
      return state - 1;
  }
}

function webSocketUri() {
  const location = window.location;
  const webSocketProtocol = location.protocol === "https:" ? "wss" : "ws";
  return `${webSocketProtocol}://${location.host}/ws`;
}

function Client() {
  const [state, setState] = useState<simpleSync.ClientState<AppState>>({type: "connecting"});

  useEffect(() => {
    const client = simpleSync.connect({
      applyAppUpdate,
      initialAppState: initialAppState(),
      onChange: state => setState(state),
      uri: webSocketUri(),
    });
    return () => {
      client.close();
    };
  }, []);

  switch (state.type) {
    case "connecting":
      return (
        <p>Connecting...</p>
      );
    case "connected":
      return (
        <CounterView sendUpdate={update => sendUpdateToSocket(update, state.socket)} state={state.appState} />
      );
    case "connection-error":
      return (
        <p>Connection error, please reload the page.</p>
      );
    case "sync-error":
      return (
        <p>Synchronisation error, please reload the page.</p>
      );
  }
}

function sendUpdateToSocket(update: AppUpdate, socket: WebSocket) {
    socket.send(JSON.stringify(update));
}

interface CounterViewProps {
  sendUpdate: (update: AppUpdate) => void;
  state: AppState;
}

function CounterView(props: CounterViewProps) {
  const {state, sendUpdate} = props;

  return (
    <div>
      <button onClick={() => sendUpdate({type: "decrement"})}>
        -
      </button>
      <span style={{display: "inline-block", minWidth: 200, textAlign: "center"}}>{state}</span>
      <button onClick={() => sendUpdate({type: "increment"})}>
        +
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Client />
  </React.StrictMode>,
);