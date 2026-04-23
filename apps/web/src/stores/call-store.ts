import { create } from "zustand";
import type { CallType } from "@as/shared";

export type CallState =
  | "idle"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended";

export type CallDirection = "incoming" | "outgoing" | null;

interface CallStore {
  state: CallState;
  direction: CallDirection;
  callId: string | null;
  conversationId: string | null;
  callType: CallType | null;
  remoteUserId: string | null;
  remoteUserName: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  callDuration: number;

  initiateCall: (
    conversationId: string,
    type: CallType,
    remoteUser?: {
      id: string;
      name: string;
    },
  ) => void;
  receiveCall: (data: {
    callId: string;
    callerId: string;
    callerName: string;
    type: CallType;
    conversationId: string;
  }) => void;
  acceptCall: () => void;
  setConnecting: () => void;
  setConnected: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  setCallId: (id: string) => void;
  tick: () => void;
  reset: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  state: "idle",
  direction: null,
  callId: null,
  conversationId: null,
  callType: null,
  remoteUserId: null,
  remoteUserName: null,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  callDuration: 0,

  initiateCall: (conversationId, type, remoteUser) =>
    set({
      state: "ringing",
      direction: "outgoing",
      conversationId,
      callType: type,
      remoteUserId: remoteUser?.id ?? null,
      remoteUserName: remoteUser?.name ?? null,
      callDuration: 0,
      isMuted: false,
      isVideoOff: type === "VOICE",
      isScreenSharing: false,
    }),

  receiveCall: (data) =>
    set({
      state: "ringing",
      direction: "incoming",
      callId: data.callId,
      conversationId: data.conversationId,
      callType: data.type,
      remoteUserId: data.callerId,
      remoteUserName: data.callerName,
      callDuration: 0,
    }),

  acceptCall: () => set({ state: "connecting" }),
  setConnecting: () => set({ state: "connecting" }),
  setConnected: () => set({ state: "connected" }),
  endCall: () => set({ state: "ended" }),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleVideo: () => set((s) => ({ isVideoOff: !s.isVideoOff })),
  toggleScreenShare: () =>
    set((s) => ({ isScreenSharing: !s.isScreenSharing })),
  setCallId: (id) => set({ callId: id }),
  tick: () => set((s) => ({ callDuration: s.callDuration + 1 })),
  reset: () =>
    set({
      state: "idle",
      direction: null,
      callId: null,
      conversationId: null,
      callType: null,
      remoteUserId: null,
      remoteUserName: null,
      isMuted: false,
      isVideoOff: false,
      isScreenSharing: false,
      callDuration: 0,
    }),
}));
