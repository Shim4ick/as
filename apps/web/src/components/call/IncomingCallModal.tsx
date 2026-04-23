"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import type { CallType } from "@as/shared";

interface Props {
  callerName: string;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallModal({
  callerName,
  callType,
  onAccept,
  onReject,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass mx-4 w-full max-w-sm rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-accent-primary/20">
          {callType === "VIDEO" ? (
            <Video size={32} className="text-accent-secondary" />
          ) : (
            <Phone size={32} className="text-accent-secondary" />
          )}
        </div>

        <h3 className="text-lg font-semibold text-text-primary">
          {callerName}
        </h3>
        <p className="mb-8 text-sm text-text-secondary">
          {callType === "VIDEO" ? "Видеозвонок" : "Голосовой звонок"}
        </p>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onReject}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
          >
            <PhoneOff size={24} />
          </button>

          <button
            onClick={onAccept}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white transition-colors hover:bg-green-600"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
