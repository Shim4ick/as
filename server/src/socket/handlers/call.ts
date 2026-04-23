import type { Server, Socket } from "socket.io";
import { prisma } from "../../services/prisma";
import { getUserSocket } from "../../services/redis";
import { logger } from "../../utils/logger";
import type { CallType } from "@as/shared";

export function registerCallHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on(
    "call:initiate",
    async (data: { conversationId: string; type: CallType }, ack) => {
      try {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId: data.conversationId,
            userId: { not: userId },
          },
        });

        if (!participant) {
          logger.warn("No other participant found for call");
          return;
        }

        const caller = await prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true },
        });

        const call = await prisma.call.create({
          data: {
            conversationId: data.conversationId,
            callerId: userId,
            calleeId: participant.userId,
            type: data.type,
            status: "RINGING",
          },
        });

        if (ack) ack(call.id);

        const calleeSocket = await getUserSocket(participant.userId);
        if (calleeSocket) {
          io.to(calleeSocket).emit("call:incoming", {
            callId: call.id,
            callerId: userId,
            callerName: caller?.displayName || "Unknown",
            type: data.type,
            conversationId: data.conversationId,
          });
        }
      } catch (err) {
        logger.error(err, "call:initiate error");
      }
    },
  );

  socket.on("call:accept", async (data: { callId: string }) => {
    try {
      const call = await prisma.call.update({
        where: { id: data.callId },
        data: { status: "ACTIVE", answeredAt: new Date() },
      });

      const callerSocket = await getUserSocket(call.callerId);
      if (callerSocket) {
        io.to(callerSocket).emit("call:accepted", { callId: call.id });
      }
    } catch (err) {
      logger.error(err, "call:accept error");
    }
  });

  socket.on("call:reject", async (data: { callId: string }) => {
    try {
      const call = await prisma.call.update({
        where: { id: data.callId },
        data: { status: "REJECTED", endedAt: new Date() },
      });

      const callerSocket = await getUserSocket(call.callerId);
      if (callerSocket) {
        io.to(callerSocket).emit("call:rejected", { callId: call.id });
      }
    } catch (err) {
      logger.error(err, "call:reject error");
    }
  });

  socket.on("call:end", async (data: { callId: string }) => {
    try {
      const call = await prisma.call.update({
        where: { id: data.callId },
        data: { status: "ENDED", endedAt: new Date() },
      });

      const otherId =
        call.callerId === userId ? call.calleeId : call.callerId;
      const otherSocket = await getUserSocket(otherId);
      if (otherSocket) {
        io.to(otherSocket).emit("call:ended", { callId: call.id });
      }
    } catch (err) {
      logger.error(err, "call:end error");
    }
  });
}
