import type { Server, Socket } from "socket.io";
import {
  setUserOnline,
  setUserOffline,
  refreshPresence,
} from "../../services/redis";
import { logger } from "../../utils/logger";

export function registerPresenceHandlers(io: Server, socket: Socket) {
  const userId = socket.data.userId;

  setUserOnline(userId, socket.id).catch((err) =>
    logger.error(err, "Failed to set user online"),
  );

  socket.broadcast.emit("presence:update", {
    userId,
    status: "online" as const,
  });

  const heartbeat = setInterval(() => {
    refreshPresence(userId).catch(() => {});
  }, 15000);

  socket.on("disconnect", async () => {
    clearInterval(heartbeat);

    setTimeout(async () => {
      await setUserOffline(userId, socket.id);
      io.emit("presence:update", {
        userId,
        status: "offline" as const,
        lastSeenAt: new Date().toISOString(),
      });
    }, 5000);
  });
}
