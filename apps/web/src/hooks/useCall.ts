"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSocket } from "./useSocket";
import { useMediasoup } from "./useMediasoup";
import { useCallStore } from "@/stores/call-store";

export function useCall() {
  const { socket } = useSocket();
  const {
    joinRoom,
    produceAudio,
    produceVideo,
    produceScreenShare,
    stopScreenShare,
    toggleMute: toggleMediasoupMute,
    toggleVideo: toggleMediasoupVideo,
    leaveRoom,
    localStream,
    remoteStreams,
  } = useMediasoup();
  const store = useCallStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startMedia = useCallback(
    async (callId: string) => {
      try {
        await joinRoom(callId);
        await produceAudio();

        if (useCallStore.getState().callType === "VIDEO") {
          await produceVideo();
        }

        useCallStore.getState().setConnected();
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          useCallStore.getState().tick();
        }, 1000);
      } catch (err) {
        console.error("Failed to start media:", err);
        useCallStore.getState().endCall();
      }
    },
    [joinRoom, produceAudio, produceVideo],
  );

  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data: {
      callId: string;
      callerId: string;
      callerName: string;
      type: "VOICE" | "VIDEO";
      conversationId: string;
    }) => {
      useCallStore.getState().receiveCall(data);
    };

    const handleAccepted = async (data: { callId: string }) => {
      useCallStore.getState().setConnecting();
      await startMedia(data.callId);
    };

    const handleRejected = () => {
      useCallStore.getState().endCall();
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => useCallStore.getState().reset(), 2000);
    };

    const handleEnded = () => {
      leaveRoom();
      useCallStore.getState().endCall();
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => useCallStore.getState().reset(), 2000);
    };

    socket.on("call:incoming", handleIncoming);
    socket.on("call:accepted", handleAccepted);
    socket.on("call:rejected", handleRejected);
    socket.on("call:ended", handleEnded);

    return () => {
      socket.off("call:incoming", handleIncoming);
      socket.off("call:accepted", handleAccepted);
      socket.off("call:rejected", handleRejected);
      socket.off("call:ended", handleEnded);
    };
  }, [leaveRoom, socket, startMedia]);

  const initiate = useCallback(
    (
      conversationId: string,
      type: "VOICE" | "VIDEO",
      remoteUser?: { id: string; name: string },
    ) => {
      if (!socket) return;

      useCallStore.getState().initiateCall(conversationId, type, remoteUser);
      socket.emit("call:initiate", { conversationId, type }, (callId: string) => {
        useCallStore.getState().setCallId(callId);
      });
    },
    [socket],
  );

  const accept = useCallback(async () => {
    const { callId } = useCallStore.getState();
    if (!socket || !callId) return;

    useCallStore.getState().acceptCall();
    socket.emit("call:accept", { callId });
    await startMedia(callId);
  }, [socket, startMedia]);

  const reject = useCallback(() => {
    const { callId } = useCallStore.getState();
    if (!socket || !callId) return;
    socket.emit("call:reject", { callId });
    useCallStore.getState().reset();
  }, [socket]);

  const hangUp = useCallback(() => {
    const { callId } = useCallStore.getState();
    if (!socket || !callId) return;
    socket.emit("call:end", { callId });
    leaveRoom();
    if (timerRef.current) clearInterval(timerRef.current);
    useCallStore.getState().endCall();
    setTimeout(() => useCallStore.getState().reset(), 2000);
  }, [leaveRoom, socket]);

  const toggleMute = useCallback(() => {
    const { isMuted, toggleMute } = useCallStore.getState();
    toggleMute();
    toggleMediasoupMute(!isMuted);
  }, [toggleMediasoupMute]);

  const toggleVideo = useCallback(() => {
    const { isVideoOff, toggleVideo } = useCallStore.getState();
    toggleVideo();
    toggleMediasoupVideo(!isVideoOff);
  }, [toggleMediasoupVideo]);

  const toggleScreenShare = useCallback(async () => {
    const { isScreenSharing, toggleScreenShare } = useCallStore.getState();
    if (isScreenSharing) {
      stopScreenShare();
      toggleScreenShare();
    } else {
      await produceScreenShare();
      toggleScreenShare();
    }
  }, [produceScreenShare, stopScreenShare]);

  return {
    ...store,
    initiate,
    accept,
    reject,
    hangUp,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    localStream,
    remoteStreams,
  };
}
