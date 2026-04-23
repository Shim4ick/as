"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Save, Check } from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [displayName, setDisplayName] = useState(session?.user?.name || "");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });

      if (res.ok) {
        setSaved(true);
        await update({ name: displayName });
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      <div className="border-b border-border-secondary p-6">
        <h1 className="text-xl font-semibold text-text-primary">Настройки</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-border-secondary bg-bg-secondary p-6">
            <h2 className="mb-4 text-base font-medium text-text-primary">
              Профиль
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-text-secondary">
                  Email
                </label>
                <input
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="w-full rounded-lg border border-border-primary bg-bg-primary px-4 py-2.5 text-sm text-text-muted"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-text-secondary">
                  Отображаемое имя
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-border-primary bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saved ? (
                  <>
                    <Check size={16} />
                    Сохранено
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {loading ? "Сохраняем..." : "Сохранить"}
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 rounded-xl border border-border-secondary bg-bg-secondary p-6">
            <h2 className="mb-2 text-base font-medium text-text-primary">
              О приложении
            </h2>
            <p className="text-sm text-text-muted">
              <span className="text-accent-primary font-semibold">as.</span>{" "}
              — мессенджер с HD звонками и демонстрацией экрана в 1080p 60fps
            </p>
            <p className="mt-1 text-xs text-text-muted">Версия 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
