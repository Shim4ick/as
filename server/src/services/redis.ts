import Redis from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";

export const redis = new Redis(config.redis.url);
export const redisSub = new Redis(config.redis.url);

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error(err, "Redis error"));

export async function setUserOnline(userId: string, socketId: string) {
  await redis.set(`presence:${userId}`, "online", "EX", 30);
  await redis.set(`socket:${socketId}`, userId);
  await redis.set(`user-socket:${userId}`, socketId);
}

export async function setUserOffline(userId: string, socketId: string) {
  await redis.del(`presence:${userId}`);
  await redis.del(`socket:${socketId}`);
  await redis.del(`user-socket:${userId}`);
}

export async function refreshPresence(userId: string) {
  await redis.expire(`presence:${userId}`, 30);
}

export async function isUserOnline(userId: string): Promise<boolean> {
  const val = await redis.get(`presence:${userId}`);
  return val === "online";
}

export async function getUserSocket(userId: string): Promise<string | null> {
  return redis.get(`user-socket:${userId}`);
}
