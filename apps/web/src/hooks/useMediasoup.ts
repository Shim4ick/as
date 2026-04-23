"use client";

import { useRef, useCallback, useState } from "react";
import { Device, type types } from "mediasoup-client";

type Transport = types.Transport;
type Producer = types.Producer;
type Consumer = types.Consumer;
import { useSocket } from "./useSocket";
import {
  AUDIO_CONSTRAINTS,
  VIDEO_CONSTRAINTS,
  WEBCAM_SIMULCAST,
  SCREEN_SHARE_CONFIG,
} from "@as/shared";

interface RemoteStream {
  kind: "audio" | "video";
  stream: MediaStream;
  appData: Record<string, unknown>;
  consumerId: string;
}

export function useMediasoup() {
  const { socket } = useSocket();
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producersRef = useRef<Map<string, Producer>>(new Map());
  const consumersRef = useRef<Map<string, Consumer>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const joinRoom = useCallback(
    async (roomId: string) => {
      if (!socket) throw new Error("Socket not connected");

      const rtpCapabilities = await new Promise<Record<string, unknown>>(
        (resolve) => {
          socket.emit(
            "media:get-router-rtp-capabilities",
            { roomId },
            resolve,
          );
        },
      );

      const device = new Device();
      await device.load({
        routerRtpCapabilities: rtpCapabilities as any,
      });
      deviceRef.current = device;

      const sendTransportOptions = await new Promise<Record<string, unknown>>(
        (resolve) => {
          socket.emit(
            "media:create-transport",
            { roomId, direction: "send" },
            resolve,
          );
        },
      );

      const sendTransport = device.createSendTransport(
        sendTransportOptions as any,
      );
      sendTransportRef.current = sendTransport;

      sendTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
        socket.emit(
          "media:connect-transport",
          { transportId: sendTransport.id, dtlsParameters: dtlsParameters as any },
          () => callback(),
        );
      });

      sendTransport.on(
        "produce",
        ({ kind, rtpParameters, appData }, callback, errback) => {
          socket.emit(
            "media:produce",
            {
              transportId: sendTransport.id,
              kind,
              rtpParameters: rtpParameters as any,
              appData: appData as Record<string, unknown>,
            },
            (producerId: string) => callback({ id: producerId }),
          );
        },
      );

      const recvTransportOptions = await new Promise<Record<string, unknown>>(
        (resolve) => {
          socket.emit(
            "media:create-transport",
            { roomId, direction: "recv" },
            resolve,
          );
        },
      );

      const recvTransport = device.createRecvTransport(
        recvTransportOptions as any,
      );
      recvTransportRef.current = recvTransport;

      recvTransport.on("connect", ({ dtlsParameters }, callback, errback) => {
        socket.emit(
          "media:connect-transport",
          { transportId: recvTransport.id, dtlsParameters: dtlsParameters as any },
          () => callback(),
        );
      });

      socket.on("media:new-producer", async (data) => {
        await consumeProducer(data.producerId, data.appData);
      });

      socket.on("media:producer-closed", (data) => {
        const consumer = consumersRef.current.get(data.producerId);
        if (consumer) {
          consumer.close();
          consumersRef.current.delete(data.producerId);
          setRemoteStreams((prev) =>
            prev.filter((s) => s.consumerId !== consumer.id),
          );
        }
      });
    },
    [socket],
  );

  const consumeProducer = useCallback(
    async (producerId: string, appData: Record<string, unknown>) => {
      if (!socket || !deviceRef.current || !recvTransportRef.current) return;

      const consumerOptions = await new Promise<Record<string, unknown>>(
        (resolve) => {
          socket.emit(
            "media:consume",
            {
              producerId,
              rtpCapabilities: deviceRef.current!
                .rtpCapabilities as unknown as Record<string, unknown>,
            },
            resolve,
          );
        },
      );

      const consumer = await recvTransportRef.current.consume(
        consumerOptions as any,
      );
      consumersRef.current.set(producerId, consumer);

      await new Promise<void>((resolve) => {
        socket.emit(
          "media:resume-consumer",
          { consumerId: consumer.id },
          () => resolve(),
        );
      });

      const stream = new MediaStream([consumer.track]);
      setRemoteStreams((prev) => [
        ...prev,
        {
          kind: consumer.kind as "audio" | "video",
          stream,
          appData: appData,
          consumerId: consumer.id,
        },
      ]);
    },
    [socket],
  );

  const produceAudio = useCallback(async () => {
    if (!sendTransportRef.current) return null;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
    });

    const track = stream.getAudioTracks()[0];
    const producer = await sendTransportRef.current.produce({
      track,
      codecOptions: {
        opusStereo: false,
        opusDtx: true,
        opusFec: true,
        opusMaxPlaybackRate: 48000,
        opusPtime: 20,
      },
      appData: { type: "voice" },
    });

    producersRef.current.set("audio", producer);
    setLocalStream((prev) => {
      const s = prev || new MediaStream();
      s.addTrack(track);
      return s;
    });

    return producer;
  }, []);

  const produceVideo = useCallback(async () => {
    if (!sendTransportRef.current || !deviceRef.current) return null;

    const stream = await navigator.mediaDevices.getUserMedia({
      video: VIDEO_CONSTRAINTS,
    });

    const track = stream.getVideoTracks()[0];

    const encodings = deviceRef.current.rtpCapabilities.codecs?.some(
      (c) => c.mimeType.toLowerCase() === "video/vp9",
    )
      ? undefined
      : (WEBCAM_SIMULCAST as any);

    const producer = await sendTransportRef.current.produce({
      track,
      encodings,
      codecOptions: { videoGoogleStartBitrate: 1000 },
      appData: { type: "webcam" },
    });

    producersRef.current.set("video", producer);
    setLocalStream((prev) => {
      const s = prev || new MediaStream();
      s.addTrack(track);
      return s;
    });

    return producer;
  }, []);

  const produceScreenShare = useCallback(async () => {
    if (!sendTransportRef.current || !deviceRef.current) return null;

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: SCREEN_SHARE_CONFIG.width },
        height: { ideal: SCREEN_SHARE_CONFIG.height },
        frameRate: { ideal: SCREEN_SHARE_CONFIG.frameRate, max: 60 },
      },
      audio: true,
    });

    const videoTrack = stream.getVideoTracks()[0];

    const vp9Codec = deviceRef.current.rtpCapabilities.codecs?.find(
      (c) => c.mimeType.toLowerCase() === "video/vp9",
    );

    const producer = await sendTransportRef.current.produce({
      track: videoTrack,
      codecOptions: { videoGoogleStartBitrate: 1000 },
      codec: vp9Codec as any,
      encodings: [
        {
          scalabilityMode: SCREEN_SHARE_CONFIG.scalabilityMode,
          maxBitrate: SCREEN_SHARE_CONFIG.maxBitrate,
          dtx: false,
        },
      ],
      appData: { type: "screen" },
    });

    producersRef.current.set("screen", producer);

    videoTrack.addEventListener("ended", () => {
      stopScreenShare();
    });

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const audioProducer = await sendTransportRef.current!.produce({
        track: audioTrack,
        appData: { type: "screen-audio" },
      });
      producersRef.current.set("screen-audio", audioProducer);
    }

    return producer;
  }, []);

  const stopScreenShare = useCallback(() => {
    const screenProducer = producersRef.current.get("screen");
    if (screenProducer) {
      screenProducer.close();
      producersRef.current.delete("screen");
    }

    const screenAudioProducer = producersRef.current.get("screen-audio");
    if (screenAudioProducer) {
      screenAudioProducer.close();
      producersRef.current.delete("screen-audio");
    }
  }, []);

  const toggleMute = useCallback((muted: boolean) => {
    const audioProducer = producersRef.current.get("audio");
    if (!audioProducer) return;

    if (muted) {
      audioProducer.pause();
    } else {
      audioProducer.resume();
    }
  }, []);

  const toggleVideo = useCallback((off: boolean) => {
    const videoProducer = producersRef.current.get("video");
    if (!videoProducer) return;

    if (off) {
      videoProducer.pause();
    } else {
      videoProducer.resume();
    }
  }, []);

  const leaveRoom = useCallback(() => {
    for (const [, producer] of producersRef.current) {
      producer.close();
    }
    producersRef.current.clear();

    for (const [, consumer] of consumersRef.current) {
      consumer.close();
    }
    consumersRef.current.clear();

    sendTransportRef.current?.close();
    recvTransportRef.current?.close();
    sendTransportRef.current = null;
    recvTransportRef.current = null;

    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStreams([]);
  }, [localStream]);

  return {
    joinRoom,
    produceAudio,
    produceVideo,
    produceScreenShare,
    stopScreenShare,
    toggleMute,
    toggleVideo,
    leaveRoom,
    remoteStreams,
    localStream,
    device: deviceRef.current,
  };
}
