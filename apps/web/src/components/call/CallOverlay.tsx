"use client";

import { useEffect, useRef } from "react";
import { useCall } from "@/hooks/useCall";
import { CallControls } from "./CallControls";
import { IncomingCallModal } from "./IncomingCallModal";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function CallOverlay() {
  const call = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (localVideoRef.current && call.localStream) {
      localVideoRef.current.srcObject = call.localStream;
    }
  }, [call.localStream]);

  useEffect(() => {
    const videoStream = call.remoteStreams.find(
      (s) => s.kind === "video",
    );
    const audioStream = call.remoteStreams.find(
      (s) => s.kind === "audio",
    );

    if (remoteVideoRef.current && videoStream) {
      remoteVideoRef.current.srcObject = videoStream.stream;
    }
    if (remoteAudioRef.current && audioStream) {
      remoteAudioRef.current.srcObject = audioStream.stream;
    }
  }, [call.remoteStreams]);

  if (call.state === "idle") return null;

  if (
    call.state === "ringing" &&
    call.direction === "incoming" &&
    call.remoteUserId &&
    call.remoteUserName
  ) {
    return (
      <IncomingCallModal
        callerName={call.remoteUserName}
        callType={call.callType!}
        onAccept={call.accept}
        onReject={call.reject}
      />
    );
  }

  const screenStream = call.remoteStreams.find(
    (s) => s.appData?.type === "screen",
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary">
      {/* Status bar */}
      <div className="flex items-center justify-center gap-3 py-4">
        <div
          className={`h-2 w-2 rounded-full ${
            call.state === "connected"
              ? "bg-status-online"
              : "animate-pulse bg-yellow-500"
          }`}
        />
        <span className="text-sm text-text-secondary">
          {call.state === "ringing" && "Вызов..."}
          {call.state === "connecting" && "Подключение..."}
          {call.state === "connected" &&
            formatDuration(call.callDuration)}
          {call.state === "ended" && "Завершён"}
        </span>
        <span className="text-sm text-text-muted">
          {call.remoteUserName || ""}
        </span>
      </div>

      {/* Video area */}
      <div className="relative flex-1">
        {screenStream ? (
          <ScreenShareDisplay stream={screenStream.stream} />
        ) : call.callType === "VIDEO" ? (
          <div className="flex h-full items-center justify-center">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="max-h-full max-w-full rounded-xl"
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent-primary/20 text-5xl font-bold text-accent-secondary">
              {call.remoteUserName?.[0]?.toUpperCase() || "?"}
            </div>
          </div>
        )}

        {/* Local video PiP */}
        {call.callType === "VIDEO" && call.localStream && (
          <div className="absolute bottom-4 right-4 overflow-hidden rounded-xl shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-36 w-48 object-cover"
            />
          </div>
        )}

        <audio ref={remoteAudioRef} autoPlay />
      </div>

      {/* Controls */}
      <CallControls
        isMuted={call.isMuted}
        isVideoOff={call.isVideoOff}
        isScreenSharing={call.isScreenSharing}
        callType={call.callType!}
        onToggleMute={call.toggleMute}
        onToggleVideo={call.toggleVideo}
        onToggleScreenShare={call.toggleScreenShare}
        onHangUp={call.hangUp}
      />
    </div>
  );
}

function ScreenShareDisplay({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex h-full items-center justify-center bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="max-h-full max-w-full"
      />
    </div>
  );
}
