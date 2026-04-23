export type MessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  createdAt: string;
  editedAt: string | null;
}
