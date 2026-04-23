"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Неверный email или пароль");
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <div className="glass rounded-2xl p-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-accent-primary">as.</h1>
        <p className="mt-2 text-text-secondary">Войдите в аккаунт</p>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-tertiary px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-accent-primary"
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-text-secondary">
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-tertiary px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-accent-primary"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent-primary py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Нет аккаунта?{" "}
        <Link
          href="/register"
          className="text-accent-secondary hover:text-accent-primary"
        >
          Зарегистрируйтесь
        </Link>
      </p>
    </div>
  );
}
