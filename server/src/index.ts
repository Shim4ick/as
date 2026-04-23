import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { config } from "./config";
import { createSocketServer } from "./socket";
import { createWorkers } from "./media/worker-pool";
import { generateTurnCredentials } from "./services/turn-credentials";
import { logger } from "./utils/logger";

async function main() {
  await createWorkers();

  const app = express();
  app.use(cors(config.cors));
  app.use(express.json());

  app.get("/health", (_, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/turn-credentials", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      res.status(400).json({ error: "userId required" });
      return;
    }
    const credentials = generateTurnCredentials(userId);
    res.json(credentials);
  });

  const httpServer = http.createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(config.port, () => {
    logger.info(`as. server running on port ${config.port}`);
  });
}

main().catch((err) => {
  logger.fatal(err, "Failed to start server");
  process.exit(1);
});
