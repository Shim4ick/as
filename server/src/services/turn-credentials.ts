import crypto from "crypto";
import { config } from "../config";

export function generateTurnCredentials(userId: string) {
  const ttl = 86400;
  const timestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${timestamp}:${userId}`;
  const hmac = crypto.createHmac("sha1", config.turn.secret);
  hmac.update(username);
  const credential = hmac.digest("base64");

  return {
    urls: config.turn.urls.split(",").map((url) => url.trim()),
    username,
    credential,
  };
}
