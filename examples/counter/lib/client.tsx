import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

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

type ClientState =
    | {type: "connecting"}
    | {type: "connected", appState: AppState, nextMessageIndex: number, socket: WebSocket}
    | {type: "connection-error"}
    | {type: "sync-error"};

function webSocketUri() {
  const location = window.location;
  const webSocketProtocol = location.protocol === "https:" ? "wss" : "ws";
  return `${webSocketProtocol}://${location.host}/ws`;
}

function connect(onChange: (state: ClientState) => void) {
  const uri = webSocketUri();
  console.log(`Connecting to ${uri}`);
  const socket = new WebSocket(uri);
  let state: ClientState = {type: "connecting"};

  function updateState(newState: ClientState) {
    state = newState;
    onChange(newState);
  }

  socket.onmessage = function (event) {
    if (state.type === "connected") {
      const message = JSON.parse(event.data);

      const nextMessageIndex = state.nextMessageIndex;
      if (message.index !== state.nextMessageIndex) {
          updateState({type: "sync-error"});
          socket.close();
      } else {
        const appUpdate = message.payload as AppUpdate;
        console.log("App update received:", appUpdate);

        updateState({
          ...state,
          appState: applyAppUpdate(state.appState, appUpdate),
          nextMessageIndex: nextMessageIndex + 1,
        });
      }
    }
  };

  socket.onerror = function() {
    updateState({type: "connection-error"});
  };

  socket.onclose = function() {
    updateState({type: "connection-error"});
  };

  socket.onopen = function() {
    updateState({
      type: "connected",
      appState: initialAppState(),
      nextMessageIndex: 0,
      socket: socket,
    });
  };

  return {
    close: () => {
      socket.close();
    },
  }
}

function Client() {
  const [state, setState] = useState<ClientState>({type: "connecting"});

  useEffect(() => {
    const client = connect(state => setState(state));
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
