export type { User, UserPublic } from "./types/user";
export type { Message, MessageType } from "./types/message";
export type { Conversation, ConversationType } from "./types/conversation";
export type { Call, CallType, CallStatus } from "./types/call";
export type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "./types/socket-events";

export {
  registerSchema,
  loginSchema,
  messageSchema,
  searchUsersSchema,
} from "./validators";
export type {
  RegisterInput,
  LoginInput,
  MessageInput,
  SearchUsersInput,
} from "./validators";

export {
  SCREEN_SHARE_CONFIG,
  WEBCAM_SIMULCAST,
  AUDIO_CONSTRAINTS,
  VIDEO_CONSTRAINTS,
} from "./constants/media";
