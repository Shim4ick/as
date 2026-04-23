import type { Message } from "./message";
import type { UserPublic } from "./user";

export type ConversationType = "DM";

export interface Conversation {
  id: string;
  type: ConversationType;
  createdAt: string;
  updatedAt: string;
  participants: UserPublic[];
  lastMessage: Message | null;
  unreadCount: number;
}
