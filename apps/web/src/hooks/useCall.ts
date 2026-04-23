"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useMediasoup } from "./useMediasoup";
import { useCallStore } from "@/stores/call-store";

export function useCall() {
  const { socket } = useSocket();
  const mediasoup = useMediasoup();
  const store = useCallStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("call:incoming", (data) => {
      store.receiveCall(data);
    });

    socket.on("call:accepted", async (data) => {
      store.setConnecting();
      await startMedia(data.callId);
    });

    socket.on("call:rejected", () => {
      store.endCall();
      setTimeout(() => store.reset(), 2000);
    });

    socket.on("call:ended", () => {
      mediasoup.leaveRoom();
      store.endCall();
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => store.reset(), 2000);
    });

    return () => {
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:rejected");
      socket.off("call:ended");
    };
  }, [socket]);

  const startMedia = useCallback(
    async (callId: string) => {
      try {
        await mediasoup.joinRoom(callId);
        await mediasoup.produceAudio();

        if (store.callType === "VIDEO") {
          await mediasoup.produceVideo();
        }

        store.setConnected();
        timerRef.current = setInterval(() => store.tick(), 1000);
      } catch (err) {
        console.error("Failed to start media:", err);
        store.endCall();
      }
    },
    [mediasoup, store],
  );

  const initiate = useCallback(
    (conversationId: string, type: "VOICE" | "VIDEO") => {
      if (!socket) return;

      store.initiateCall(conversationId, type);
      socket.emit("call:initiate", { conversationId, type }, (callId: string) => {
        store.setCallId(callId);
      });
    },
    [socket, store],
  );

  const accept = useCallback(async () => {
    if (!socket || !store.callId) return;

    store.acceptCall();
    socket.emit("call:accept", { callId: store.callId });
    await startMedia(store.callId);
  }, [socket, store, startMedia]);

  const reject = useCallback(() => {
    if (!socket || !store.callId) return;
    socket.emit("call:reject", { callId: store.callId });
    store.reset();
  }, [socket, store]);

  const hangUp = useCallback(() => {
    if (!socket || !store.callId) return;
    socket.emit("call:end", { callId: store.callId });
    mediasoup.leaveRoom();
    if (timerRef.current) clearInterval(timerRef.current);
    store.endCall();
    setTimeout(() => store.reset(), 2000);
  }, [socket, store, mediasoup]);

  const toggleMute = useCallback(() => {
    store.toggleMute();
    mediasoup.toggleMute(!store.isMuted);
  }, [store, mediasoup]);

  const toggleVideo = useCallback(() => {
    store.toggleVideo();
    mediasoup.toggleVideo(!store.isVideoOff);
  }, [store, mediasoup]);

  const toggleScreenShare = useCallback(async () => {
    if (store.isScreenSharing) {
      mediasoup.stopScreenShare();
      store.toggleScreenShare();
    } else {
      await mediasoup.produceScreenShare();
      store.toggleScreenShare();
    }
  }, [store, mediasoup]);

  return {
    ...store,
    initiate,
    accept,
    reject,
    hangUp,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    localStream: mediasoup.localStream,
    remoteStreams: mediasoup.remoteStreams,
  };
}
