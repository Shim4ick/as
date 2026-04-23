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

        const calleeId = participant.userId;

        const reciprocalCall = await prisma.call.findFirst({
          where: {
            conversationId: data.conversationId,
            status: "RINGING",
            callerId: calleeId,
            calleeId: userId,
          },
          orderBy: { createdAt: "desc" },
        });

        if (reciprocalCall) {
          const activeCall = await prisma.call.update({
            where: { id: reciprocalCall.id },
            data: {
              status: "ACTIVE",
              answeredAt: reciprocalCall.answeredAt ?? new Date(),
              type: data.type,
            },
          });

          if (ack) ack(activeCall.id);

          const callerSocket = await getUserSocket(activeCall.callerId);
          const calleeSocket = await getUserSocket(activeCall.calleeId);

          if (callerSocket) {
            io.to(callerSocket).emit("call:accepted", { callId: activeCall.id });
          }
          if (calleeSocket) {
            io.to(calleeSocket).emit("call:accepted", { callId: activeCall.id });
          }

          return;
        }

        const ownRingingCall = await prisma.call.findFirst({
          where: {
            conversationId: data.conversationId,
            status: "RINGING",
            callerId: userId,
            calleeId,
          },
          orderBy: { createdAt: "desc" },
        });

        if (ownRingingCall) {
          if (ack) ack(ownRingingCall.id);
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
            calleeId,
            type: data.type,
            status: "RINGING",
          },
        });

        if (ack) ack(call.id);

        const calleeSocket = await getUserSocket(calleeId);
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
