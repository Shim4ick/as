"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import {
  MessageCircle,
  Search,
  Settings,
  LogOut,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/chat", icon: MessageCircle, label: "Чаты" },
  { href: "/contacts", icon: Search, label: "Поиск" },
  { href: "/settings", icon: Settings, label: "Настройки" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <aside className="flex h-screen w-[72px] flex-col items-center border-r border-border-secondary bg-bg-secondary py-4">
      <Link href="/chat" className="mb-8">
        <span className="text-2xl font-bold text-accent-primary">as.</span>
      </Link>

      <nav className="flex flex-1 flex-col items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredItem(item.href)}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all",
                isActive
                  ? "bg-accent-primary text-white"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary",
              )}
            >
              <item.icon size={22} />
              {hoveredItem === item.href && (
                <div className="absolute left-16 z-50 rounded-lg bg-bg-tertiary px-3 py-1.5 text-sm text-text-primary shadow-lg">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3 pb-2">
        <div className="h-9 w-9 rounded-full bg-accent-primary/20 flex items-center justify-center text-sm font-medium text-accent-secondary">
          {session?.user?.name?.[0]?.toUpperCase() || "?"}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-hover hover:text-red-400"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
