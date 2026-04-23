export type CallType = "VOICE" | "VIDEO";
export type CallStatus = "RINGING" | "ACTIVE" | "ENDED" | "MISSED" | "REJECTED";

export interface Call {
  id: string;
  conversationId: string;
  callerId: string;
  calleeId: string;
  type: CallType;
  status: CallStatus;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
}
