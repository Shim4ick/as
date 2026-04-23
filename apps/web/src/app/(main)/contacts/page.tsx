"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageCircle, Loader2 } from "lucide-react";
import type { UserPublic } from "@as/shared";

export default function ContactsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.users || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  async function startChat(userId: string) {
    setStartingChat(userId);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      router.push(`/chat/${data.conversationId}`);
    } catch {
      setStartingChat(null);
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="border-b border-border-secondary p-6">
        <h1 className="mb-4 text-xl font-semibold text-text-primary">
          Поиск пользователей
        </h1>
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Введите имя или @username..."
            className="w-full max-w-lg rounded-xl border border-border-primary bg-bg-tertiary py-3 pl-11 pr-4 text-text-primary outline-none transition-colors focus:border-accent-primary"
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-text-muted">
              {query ? "Никого не найдено" : "Начните вводить для поиска"}
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-lg space-y-2">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-xl border border-border-secondary bg-bg-secondary p-4 transition-colors hover:bg-bg-hover"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-primary/20 text-sm font-medium text-accent-secondary">
                    {user.displayName[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-text-muted">@{user.username}</p>
                  </div>
                </div>

                <button
                  onClick={() => startChat(user.id)}
                  disabled={startingChat === user.id}
                  className="flex items-center gap-2 rounded-lg bg-accent-primary/10 px-3 py-2 text-sm text-accent-secondary transition-colors hover:bg-accent-primary/20 disabled:opacity-50"
                >
                  {startingChat === user.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <MessageCircle size={16} />
                  )}
                  Написать
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
