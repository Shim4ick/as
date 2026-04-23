"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import type { Conversation } from "@as/shared";

interface Props {
  conversations: Conversation[];
}

export function ConversationList({ conversations }: Props) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.participants.some(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.username.toLowerCase().includes(q),
    );
  });

  return (
    <div className="flex h-full w-full flex-col border-r border-border-secondary bg-bg-secondary lg:w-80">
      <div className="border-b border-border-secondary p-4">
        <h2 className="mb-3 text-lg font-semibold text-text-primary">Чаты</h2>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full rounded-lg border border-border-primary bg-bg-tertiary py-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">
              {conversations.length === 0
                ? "Нет чатов. Найдите пользователя!"
                : "Ничего не найдено"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const other = conv.participants[0];
            if (!other) return null;
            const isActive = pathname === `/chat/${conv.id}`;

            return (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors",
                  isActive ? "bg-bg-hover" : "hover:bg-bg-hover/50",
                )}
              >
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-primary/20 text-sm font-medium text-accent-secondary">
                    {other.displayName[0].toUpperCase()}
                  </div>
                  {other.isOnline && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg-secondary bg-status-online" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-text-primary">
                      {other.displayName}
                    </span>
                    {conv.lastMessage && (
                      <span className="ml-2 text-xs text-text-muted">
                        {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                          addSuffix: false,
                          locale: ru,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-text-secondary">
                    {conv.lastMessage?.content || "Нет сообщений"}
                  </p>
                </div>

                {conv.unreadCount > 0 && (
                  <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-primary px-1.5 text-xs font-medium text-white">
                    {conv.unreadCount}
                  </div>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
