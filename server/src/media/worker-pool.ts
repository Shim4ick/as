import * as mediasoup from "mediasoup";
import type { Worker } from "mediasoup/node/lib/types";
import { config } from "../config";
import { logger } from "../utils/logger";

const workers: Worker[] = [];
let nextWorkerIdx = 0;

export async function createWorkers() {
  const { numWorkers, workerSettings } = config.mediasoup;

  for (let i = 0; i < numWorkers; i++) {
    const worker = await mediasoup.createWorker(workerSettings);

    worker.on("died", () => {
      logger.error(`mediasoup worker ${worker.pid} died, exiting`);
      setTimeout(() => process.exit(1), 2000);
    });

    workers.push(worker);
    logger.info(`mediasoup worker ${worker.pid} created`);
  }
}

export function getNextWorker(): Worker {
  const worker = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return worker;
}

export function getWorkerCount(): number {
  return workers.length;
}
