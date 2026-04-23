import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { config } from "../config";
import { authMiddleware } from "./middleware/auth";
import { registerMessagingHandlers } from "./handlers/messaging";
import { registerPresenceHandlers } from "./handlers/presence";
import { registerCallHandlers } from "./handlers/call";
import { registerSignalingHandlers } from "./handlers/signaling";
import { logger } from "../utils/logger";

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: config.cors,
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(authMiddleware);

  io.on("connection", (socket) => {
    logger.info(
      { socketId: socket.id, userId: socket.data.userId },
      "Client connected",
    );

    registerPresenceHandlers(io, socket);
    registerMessagingHandlers(io, socket);
    registerCallHandlers(io, socket);
    registerSignalingHandlers(io, socket);
  });

  return io;
}
