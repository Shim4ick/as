"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type { ServerToClientEvents, ClientToServerEvents } from "@as/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let globalSocket: TypedSocket | null = null;
let globalSocketUserId: string | null = null;

export function useSocket() {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;

    if (globalSocket && globalSocketUserId !== session.user.id) {
      globalSocket.disconnect();
      globalSocket = null;
      globalSocketUserId = null;
    }

    if (!globalSocket) {
      globalSocket = io(socketUrl, {
        auth: { userId: session.user.id, token: session.user.id },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      }) as TypedSocket;
      globalSocketUserId = session.user.id;
    }

    const activeSocket = globalSocket;
    const handleConnect = () => {
      setConnected(true);
    };
    const handleDisconnect = () => {
      setConnected(false);
    };

    setSocket(activeSocket);
    setConnected(activeSocket.connected);
    activeSocket.on("connect", handleConnect);
    activeSocket.on("disconnect", handleDisconnect);

    return () => {
      activeSocket.off("connect", handleConnect);
      activeSocket.off("disconnect", handleDisconnect);
    };
  }, [session?.user?.id]);

  return { socket, connected };
}
