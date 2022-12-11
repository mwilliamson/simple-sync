export type ClientState<AppState> =
  | {type: "connecting"}
  | {type: "connected", appState: AppState, nextMessageIndex: number}
  | {type: "connection-error"}
  | {type: "sync-error"};

interface ConnectOptions<AppState, AppUpdate> {
  applyAppUpdate: (state: AppState, update: AppUpdate) => AppState;
  initialAppState: AppState;
  onChange: (state: ClientState<AppState>) => void;
  uri: string;
}

export interface Client<AppState, AppUpdate> {
  close: () => void;
  sendAppUpdate: (update: AppUpdate) => void;
}

export function connect<AppState, AppUpdate>(options: ConnectOptions<AppState, AppUpdate>): Client<AppState, AppUpdate> {
  const {applyAppUpdate, initialAppState, onChange, uri} = options;
  const socket = new WebSocket(uri);
  let state: ClientState<AppState> = {type: "connecting"};

  function updateState(newState: ClientState<AppState>) {
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
    });
  };

  return {
    close: () => {
      socket.close();
    },
    sendAppUpdate: (update: AppUpdate) => {
      socket.send(JSON.stringify({type: "update", payload: update}));
    }
  }
}
