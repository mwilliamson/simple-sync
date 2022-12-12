import { useEffect, useRef, useState } from "react";

import { Client, ClientState, connect, ConnectOptions } from "./client";

export function useSimpleSync<AppState, AppUpdate>(options: Omit<ConnectOptions<AppState, AppUpdate>, "onChange">) {
    const [state, setState] = useState<ClientState<AppState, AppUpdate>>({type: "connecting"});

    const client = useRef<Client<AppState, AppUpdate> | null>(null);

    useEffect(() => {
        client.current = connect({...options, onChange: state => setState(state)});
        return () => {
            if (client.current !== null) {
                client.current.close();
            }
        };
    }, []);

    return state;
}
