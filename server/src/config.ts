import os from "os";
import type { WorkerSettings, RouterOptions, WebRtcTransportOptions } from "mediasoup/node/lib/types";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "dev-secret",
  },
  turn: {
    secret: process.env.TURN_SECRET || "turn-secret",
    urls: process.env.TURN_URLS || "turn:localhost:3478",
  },
  mediasoup: {
    numWorkers: Math.min(os.cpus().length, 4),

    workerSettings: {
      logLevel: "warn",
      logTags: [
        "info", "ice", "dtls", "rtp", "srtp",
        "rtcp", "rtx", "bwe", "score", "simulcast", "svc", "sctp",
      ],
      rtcMinPort: 40000,
      rtcMaxPort: 49999,
    } as WorkerSettings,

    routerOptions: {
      mediaCodecs: [
        {
          kind: "audio",
          mimeType: "audio/opus",
          clockRate: 48000,
          channels: 2,
          parameters: {
            useinbandfec: 1,
            usedtx: 1,
            minptime: 10,
            stereo: 1,
          },
        },
        {
          kind: "video",
          mimeType: "video/VP9",
          clockRate: 90000,
          parameters: {
            "profile-id": 0,
          },
        },
        {
          kind: "video",
          mimeType: "video/VP8",
          clockRate: 90000,
        },
        {
          kind: "video",
          mimeType: "video/H264",
          clockRate: 90000,
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f",
            "level-asymmetry-allowed": 1,
          },
        },
      ],
    } as RouterOptions,

    webRtcTransportOptions: {
      listenInfos: [
        {
          protocol: "udp" as const,
          ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
        },
        {
          protocol: "tcp" as const,
          ip: process.env.MEDIASOUP_LISTEN_IP || "0.0.0.0",
          announcedAddress: process.env.MEDIASOUP_ANNOUNCED_IP || undefined,
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      maxIncomingBitrate: 8000000,
      minimumAvailableOutgoingBitrate: 300000,
    } as WebRtcTransportOptions,
  },
};
