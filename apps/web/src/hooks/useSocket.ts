"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import type { ServerToClientEvents, ClientToServerEvents } from "@as/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let globalSocket: TypedSocket | null = null;

export function useSocket() {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<TypedSocket | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (!socketUrl) return;

    if (globalSocket?.connected) {
      setSocket(globalSocket);
      setConnected(true);
      return;
    }

    const s = io(socketUrl, {
      auth: { userId: session.user.id, token: session.user.id },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    }) as TypedSocket;

    s.on("connect", () => {
      setConnected(true);
    });

    s.on("disconnect", () => {
      setConnected(false);
    });

    globalSocket = s;
    setSocket(s);

    return () => {
      // Don't disconnect on unmount — keep global connection alive
    };
  }, [session?.user?.id]);

  return { socket, connected };
}
