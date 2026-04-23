"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  MonitorOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallType } from "@as/shared";

interface Props {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  callType: CallType;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onHangUp: () => void;
}

export function CallControls({
  isMuted,
  isVideoOff,
  isScreenSharing,
  callType,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onHangUp,
}: Props) {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <ControlButton
        active={isMuted}
        onClick={onToggleMute}
        icon={isMuted ? MicOff : Mic}
        label={isMuted ? "Включить микрофон" : "Выключить микрофон"}
      />

      {callType === "VIDEO" && (
        <ControlButton
          active={isVideoOff}
          onClick={onToggleVideo}
          icon={isVideoOff ? VideoOff : Video}
          label={isVideoOff ? "Включить камеру" : "Выключить камеру"}
        />
      )}

      <ControlButton
        active={isScreenSharing}
        onClick={onToggleScreenShare}
        icon={isScreenSharing ? MonitorOff : Monitor}
        label={
          isScreenSharing ? "Остановить демонстрацию" : "Показать экран"
        }
        accent
      />

      <button
        onClick={onHangUp}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
        title="Завершить"
      >
        <PhoneOff size={24} />
      </button>
    </div>
  );
}

function ControlButton({
  active,
  onClick,
  icon: Icon,
  label,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Mic;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-12 w-12 items-center justify-center rounded-full transition-colors",
        active
          ? accent
            ? "bg-accent-primary text-white"
            : "bg-red-500/20 text-red-400"
          : "bg-bg-tertiary text-text-secondary hover:bg-bg-hover hover:text-text-primary",
      )}
    >
      <Icon size={20} />
    </button>
  );
}
