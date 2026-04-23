import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Некорректный email"),
  username: z
    .string()
    .min(3, "Минимум 3 символа")
    .max(20, "Максимум 20 символов")
    .regex(/^[a-zA-Z0-9_]+$/, "Только буквы, цифры и _"),
  displayName: z
    .string()
    .min(1, "Обязательное поле")
    .max(50, "Максимум 50 символов"),
  password: z.string().min(8, "Минимум 8 символов"),
});

export const loginSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(1, "Обязательное поле"),
});

export const messageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1).max(4000),
  type: z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM"]).default("TEXT"),
});

export const searchUsersSchema = z.object({
  query: z.string().min(1).max(50),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
