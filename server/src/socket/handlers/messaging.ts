import type { Server, Socket } from "socket.io";
import { prisma } from "../../services/prisma";
import { getUserSocket } from "../../services/redis";
import { logger } from "../../utils/logger";
import type { MessageType } from "@as/shared";

export function registerMessagingHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  socket.on(
    "message:send",
    async (
      data: { conversationId: string; content: string; type: MessageType },
      ack,
    ) => {
      try {
        const message = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId: userId,
            content: data.content,
            type: data.type || "TEXT",
          },
        });

        await prisma.conversation.update({
          where: { id: data.conversationId },
          data: { updatedAt: new Date() },
        });

        const formatted = {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          content: message.content,
          type: message.type as "TEXT",
          createdAt: message.createdAt.toISOString(),
          editedAt: null,
        };

        if (ack) ack(formatted);

        const participants = await prisma.conversationParticipant.findMany({
          where: { conversationId: data.conversationId },
          select: { userId: true },
        });

        for (const p of participants) {
          if (p.userId === userId) continue;
          const targetSocket = await getUserSocket(p.userId);
          if (targetSocket) {
            io.to(targetSocket).emit("message:new", formatted);
          }
        }
      } catch (err) {
        logger.error(err, "message:send error");
      }
    },
  );

  socket.on(
    "message:typing",
    async (data: { conversationId: string; isTyping: boolean }) => {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId: data.conversationId },
        select: { userId: true },
      });

      for (const p of participants) {
        if (p.userId === userId) continue;
        const targetSocket = await getUserSocket(p.userId);
        if (targetSocket) {
          io.to(targetSocket).emit("message:typing", {
            conversationId: data.conversationId,
            userId,
            isTyping: data.isTyping,
          });
        }
      }
    },
  );

  socket.on("message:read", async (data: { conversationId: string }) => {
    const now = new Date();

    await prisma.conversationParticipant.updateMany({
      where: { conversationId: data.conversationId, userId },
      data: { lastReadAt: now },
    });

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: data.conversationId },
      select: { userId: true },
    });

    for (const p of participants) {
      if (p.userId === userId) continue;
      const targetSocket = await getUserSocket(p.userId);
      if (targetSocket) {
        io.to(targetSocket).emit("message:read", {
          conversationId: data.conversationId,
          userId,
          readAt: now.toISOString(),
        });
      }
    }
  });
}
