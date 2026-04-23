"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Аккаунт создан, но не удалось войти. Попробуйте вручную.");
        setLoading(false);
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      setError("Ошибка сети");
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-accent-primary">as.</h1>
        <p className="mt-2 text-text-secondary">Создайте аккаунт</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-tertiary px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-accent-primary"
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">
            Имя пользователя
          </label>
          <input
            type="text"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-tertiary px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-accent-primary"
            placeholder="username"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">
            Отображаемое имя
          </label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => update("displayName", e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-tertiary px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-accent-primary"
            placeholder="Как вас зовут"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">
            Пароль
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-tertiary px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-accent-primary"
            placeholder="Минимум 8 символов"
            minLength={8}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent-primary py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Создаём..." : "Создать аккаунт"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="text-accent-secondary hover:text-accent-primary"
        >
          Войдите
        </Link>
      </p>
    </div>
  );
}
