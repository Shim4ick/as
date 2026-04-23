import type { Server, Socket } from "socket.io";
import { getOrCreateRoom, getRoom } from "../../room/RoomManager";
import { logger } from "../../utils/logger";
import type { DtlsParameters, MediaKind, RtpCapabilities, RtpParameters } from "mediasoup/node/lib/types";
import { getUserSocket } from "../../services/redis";

export function registerSignalingHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on(
    "media:get-router-rtp-capabilities",
    async (data: { roomId: string }, ack) => {
      try {
        const room = await getOrCreateRoom(data.roomId);
        room.addPeer(userId, socket.id);
        socket.join(data.roomId);

        if (ack) ack(room.getRtpCapabilities() as unknown as Record<string, unknown>);

        const existingProducers = room.getOtherProducers(userId);
        for (const p of existingProducers) {
          socket.emit("media:new-producer", {
            producerId: p.producerId,
            userId: p.userId,
            kind: p.kind,
            appData: p.appData,
          });
        }
      } catch (err) {
        logger.error(err, "media:get-router-rtp-capabilities error");
      }
    },
  );

  socket.on(
    "media:create-transport",
    async (data: { roomId: string; direction: "send" | "recv" }, ack) => {
      try {
        const room = getRoom(data.roomId);
        if (!room) throw new Error("Room not found");
        room.addPeer(userId, socket.id);

        const transport = await room.createTransport(userId, data.direction);
        if (ack) ack(transport as unknown as Record<string, unknown>);
      } catch (err) {
        logger.error(err, "media:create-transport error");
      }
    },
  );

  socket.on(
    "media:connect-transport",
    async (
      data: { transportId: string; dtlsParameters: Record<string, unknown> },
      ack,
    ) => {
      try {
        const roomId = [...socket.rooms].find((r) => r !== socket.id);
        const room = roomId ? getRoom(roomId) : undefined;
        if (!room) throw new Error("Room not found");

        await room.connectTransport(
          userId,
          data.transportId,
          data.dtlsParameters as unknown as DtlsParameters,
        );
        if (ack) ack();
      } catch (err) {
        logger.error(err, "media:connect-transport error");
      }
    },
  );

  socket.on(
    "media:produce",
    async (
      data: {
        transportId: string;
        kind: "audio" | "video";
        rtpParameters: Record<string, unknown>;
        appData: Record<string, unknown>;
      },
      ack,
    ) => {
      try {
        const roomId = [...socket.rooms].find((r) => r !== socket.id);
        const room = roomId ? getRoom(roomId) : undefined;
        if (!room) throw new Error("Room not found");

        const producerId = await room.produce(
          userId,
          data.transportId,
          data.kind as MediaKind,
          data.rtpParameters as unknown as RtpParameters,
          data.appData,
        );

        if (ack) ack(producerId);

        socket.to(roomId!).emit("media:new-producer", {
          producerId,
          userId,
          kind: data.kind,
          appData: data.appData,
        });
      } catch (err) {
        logger.error(err, "media:produce error");
      }
    },
  );

  socket.on(
    "media:consume",
    async (
      data: {
        producerId: string;
        rtpCapabilities: Record<string, unknown>;
      },
      ack,
    ) => {
      try {
        const roomId = [...socket.rooms].find((r) => r !== socket.id);
        const room = roomId ? getRoom(roomId) : undefined;
        if (!room) throw new Error("Room not found");

        const consumer = await room.consume(
          userId,
          data.producerId,
          data.rtpCapabilities as unknown as RtpCapabilities,
        );

        if (ack) ack(consumer as unknown as Record<string, unknown>);
      } catch (err) {
        logger.error(err, "media:consume error");
      }
    },
  );

  socket.on(
    "media:resume-consumer",
    async (data: { consumerId: string }, ack) => {
      try {
        const roomId = [...socket.rooms].find((r) => r !== socket.id);
        const room = roomId ? getRoom(roomId) : undefined;
        if (!room) throw new Error("Room not found");

        await room.resumeConsumer(userId, data.consumerId);
        if (ack) ack();
      } catch (err) {
        logger.error(err, "media:resume-consumer error");
      }
    },
  );

  socket.on(
    "media:set-preferred-layers",
    (data: {
      consumerId: string;
      spatialLayer: number;
      temporalLayer: number;
    }) => {
      const roomId = [...socket.rooms].find((r) => r !== socket.id);
      const room = roomId ? getRoom(roomId) : undefined;
      if (!room) return;

      room.setPreferredLayers(
        userId,
        data.consumerId,
        data.spatialLayer,
        data.temporalLayer,
      );
    },
  );

  socket.on("disconnect", () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue;
      const room = getRoom(roomId);
      if (!room) continue;
      const peer = room.peers.get(userId);
      if (!peer || peer.socketId !== socket.id) continue;

      const producers = [...peer.producers.values()];
      for (const producer of producers) {
        socket.to(roomId).emit("media:producer-closed", {
          producerId: producer.id,
        });
      }

      room.removePeer(userId, socket.id);
    }
  });
}
