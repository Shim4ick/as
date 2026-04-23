"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Phone, Video, ArrowLeft, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";
import { useCallStore } from "@/stores/call-store";
import type { Message, UserPublic } from "@as/shared";

interface Props {
  conversationId: string;
  currentUserId: string;
  otherUser: UserPublic;
  initialMessages: Message[];
}

export function ChatView({
  conversationId,
  currentUserId,
  otherUser,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();
  const { socket, connected } = useSocket();
  const initiateCall = useCallStore((s) => s.initiateCall);
  const setCallId = useCallStore((s) => s.setCallId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    function onNewMessage(msg: Message) {
      if (msg.conversationId === conversationId) {
        setMessages((prev) => [...prev, msg]);
      }
    }

    function onTyping(data: {
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }) {
      if (
        data.conversationId === conversationId &&
        data.userId !== currentUserId
      ) {
        setIsTyping(data.isTyping);
      }
    }

    socket.on("message:new", onNewMessage);
    socket.on("message:typing", onTyping);

    return () => {
      socket.off("message:new", onNewMessage);
      socket.off("message:typing", onTyping);
    };
  }, [socket, conversationId, currentUserId]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !socket) return;

    socket.emit(
      "message:send",
      { conversationId, content: input.trim(), type: "TEXT" as const },
      (msg: Message) => {
        setMessages((prev) => [...prev, msg]);
      },
    );

    setInput("");
    socket.emit("message:typing", { conversationId, isTyping: false });
  }, [input, socket, conversationId]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
    if (!socket) return;

    socket.emit("message:typing", { conversationId, isTyping: true });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("message:typing", { conversationId, isTyping: false });
    }, 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleStartCall(type: "VOICE" | "VIDEO") {
    if (!socket || !connected) return;

    initiateCall(conversationId, type, {
      id: otherUser.id,
      name: otherUser.displayName,
    });

    socket.emit("call:initiate", { conversationId, type }, (callId: string) => {
      setCallId(callId);
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-secondary px-4 py-3">
        <div className="flex items-center gap-3">
          <a href="/chat" className="lg:hidden">
            <ArrowLeft size={20} className="text-text-secondary" />
          </a>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-primary/20 text-sm font-medium text-accent-secondary">
              {otherUser.displayName[0].toUpperCase()}
            </div>
            {otherUser.isOnline && (
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-primary bg-status-online" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">
              {otherUser.displayName}
            </p>
            <p className="text-xs text-text-muted">
              {isTyping
                ? "печатает..."
                : otherUser.isOnline
                  ? "онлайн"
                  : `@${otherUser.username}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStartCall("VOICE")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => handleStartCall("VIDEO")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
          >
            <Video size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-3xl space-y-1">
          {messages.map((msg, i) => {
            const isMine = msg.senderId === currentUserId;
            const showAvatar =
              i === 0 || messages[i - 1].senderId !== msg.senderId;
            const time = new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  isMine ? "justify-end" : "justify-start",
                  showAvatar && "mt-3",
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-2",
                    isMine
                      ? "rounded-br-md bg-accent-primary text-white"
                      : "rounded-bl-md bg-bg-tertiary text-text-primary",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {msg.content}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-right text-[10px]",
                      isMine ? "text-white/50" : "text-text-muted",
                    )}
                  >
                    {time}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border-secondary p-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            className="flex-1 rounded-xl border border-border-primary bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary text-white transition-colors hover:bg-accent-hover disabled:opacity-30"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
