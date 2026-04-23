"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { CallOverlay } from "./call/CallOverlay";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      {children}
      <CallOverlay />
    </SessionProvider>
  );
}
