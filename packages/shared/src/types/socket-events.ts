import type { Message, MessageType } from "./message";
import type { CallType } from "./call";

export interface ServerToClientEvents {
  "message:new": (message: Message) => void;
  "message:typing": (data: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  "message:read": (data: {
    conversationId: string;
    userId: string;
    readAt: string;
  }) => void;

  "presence:update": (data: {
    userId: string;
    status: "online" | "offline";
    lastSeenAt?: string;
  }) => void;

  "call:incoming": (data: {
    callId: string;
    callerId: string;
    callerName: string;
    type: CallType;
    conversationId: string;
  }) => void;
  "call:accepted": (data: { callId: string }) => void;
  "call:rejected": (data: { callId: string; reason?: string }) => void;
  "call:ended": (data: { callId: string }) => void;
  "call:ice-restart": (data: { callId: string }) => void;

  "media:router-rtp-capabilities": (data: {
    roomId: string;
    rtpCapabilities: Record<string, unknown>;
  }) => void;
  "media:transport-created": (data: {
    id: string;
    iceParameters: Record<string, unknown>;
    iceCandidates: Record<string, unknown>[];
    dtlsParameters: Record<string, unknown>;
  }) => void;
  "media:new-producer": (data: {
    producerId: string;
    userId: string;
    kind: "audio" | "video";
    appData: Record<string, unknown>;
  }) => void;
  "media:producer-closed": (data: { producerId: string }) => void;
  "media:consumer-created": (data: {
    id: string;
    producerId: string;
    kind: "audio" | "video";
    rtpParameters: Record<string, unknown>;
    appData: Record<string, unknown>;
  }) => void;
}

export interface ClientToServerEvents {
  "message:send": (
    data: { conversationId: string; content: string; type: MessageType },
    ack: (msg: Message) => void,
  ) => void;
  "message:typing": (data: {
    conversationId: string;
    isTyping: boolean;
  }) => void;
  "message:read": (data: { conversationId: string }) => void;

  "call:initiate": (
    data: { conversationId: string; type: CallType },
    ack: (callId: string) => void,
  ) => void;
  "call:accept": (data: { callId: string }) => void;
  "call:reject": (data: { callId: string }) => void;
  "call:end": (data: { callId: string }) => void;

  "media:get-router-rtp-capabilities": (
    data: { roomId: string },
    ack: (caps: Record<string, unknown>) => void,
  ) => void;
  "media:create-transport": (
    data: { roomId: string; direction: "send" | "recv" },
    ack: (options: Record<string, unknown>) => void,
  ) => void;
  "media:connect-transport": (
    data: {
      transportId: string;
      dtlsParameters: Record<string, unknown>;
    },
    ack: () => void,
  ) => void;
  "media:produce": (
    data: {
      transportId: string;
      kind: "audio" | "video";
      rtpParameters: Record<string, unknown>;
      appData: Record<string, unknown>;
    },
    ack: (producerId: string) => void,
  ) => void;
  "media:consume": (
    data: {
      producerId: string;
      rtpCapabilities: Record<string, unknown>;
    },
    ack: (options: Record<string, unknown>) => void,
  ) => void;
  "media:resume-consumer": (
    data: { consumerId: string },
    ack: () => void,
  ) => void;
  "media:set-preferred-layers": (data: {
    consumerId: string;
    spatialLayer: number;
    temporalLayer: number;
  }) => void;
}
