import { Room } from "./Room";
import { logger } from "../utils/logger";

const rooms = new Map<string, Room>();

export async function getOrCreateRoom(roomId: string): Promise<Room> {
  let room = rooms.get(roomId);
  if (room && !room.closed) return room;

  room = new Room(roomId);
  await room.init();
  rooms.set(roomId, room);
  return room;
}

export function getRoom(roomId: string): Room | undefined {
  const room = rooms.get(roomId);
  return room && !room.closed ? room : undefined;
}

export function removeRoom(roomId: string) {
  const room = rooms.get(roomId);
  if (room) {
    room.close();
    rooms.delete(roomId);
  }
}

export function getRoomCount(): number {
  return rooms.size;
}
