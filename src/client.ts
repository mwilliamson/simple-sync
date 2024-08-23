import WebSocket from "isomorphic-ws";

export type ClientState<AppState, AppUpdate> =
  | {type: "connecting"}
  | {
    type: "connected",
    appState: AppState,
    nextMessageIndex: number,
    sendAppUpdate: (update: AppUpdate) => void,
  }
  | {type: "connection-error"}
  | {type: "sync-error"};

export interface ConnectOptions<AppState, AppUpdate> {
  applyAppUpdate: (state: AppState, update: AppUpdate) => AppState;
  initialAppState: AppState;
  onChange: (state: ClientState<AppState, AppUpdate>) => void;
  uri: string;

  serializeAppUpdate: (update: AppUpdate) => unknown;
  deserializeAppUpdate: (update: unknown) => AppUpdate;
}

export interface Client<AppState, AppUpdate> {
  close: () => void;
}

export function connect<AppState, AppUpdate>(options: ConnectOptions<AppState, AppUpdate>): Client<AppState, AppUpdate> {
  const {applyAppUpdate, initialAppState, onChange, uri, serializeAppUpdate, deserializeAppUpdate} = options;
  const socket = new WebSocket(uri);
  let state: ClientState<AppState, AppUpdate> = {type: "connecting"};

  function updateState(newState: ClientState<AppState, AppUpdate>) {
    state = newState;
    onChange(newState);
  }

  socket.onmessage = function (event) {
    if (state.type === "connected" && typeof event.data === "string") {
      const message = JSON.parse(event.data);

      const nextMessageIndex = state.nextMessageIndex;
      if (message.index !== state.nextMessageIndex) {
          updateState({type: "sync-error"});
          socket.close();
      } else {
        const appUpdate = deserializeAppUpdate(message.payload);

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
      appState: initialAppState,
      nextMessageIndex: 0,
      sendAppUpdate,
    });
  };

  function sendAppUpdate(update: AppUpdate) {
    socket.send(JSON.stringify({type: "update", payload: serializeAppUpdate(update)}));
  }

  return {
    close: () => {
      socket.close();
    },
  };
}
