import type { Socket } from "socket.io";
import { logger } from "../../utils/logger";

export function authMiddleware(socket: Socket, next: (err?: Error) => void) {
  const userId = socket.handshake.auth.userId;

  if (!userId || typeof userId !== "string") {
    logger.warn("Socket connection rejected: no userId");
    return next(new Error("Authentication required"));
  }

  (socket.data as { userId: string }).userId = userId;
  next();
}
