export const SCREEN_SHARE_CONFIG = {
  width: 1920,
  height: 1080,
  frameRate: 60,
  maxBitrate: 8_000_000,
  scalabilityMode: "L1T3",
} as const;

export const WEBCAM_SIMULCAST = [
  { rid: "r0", maxBitrate: 100_000, scaleResolutionDownBy: 4, maxFramerate: 15 },
  { rid: "r1", maxBitrate: 500_000, scaleResolutionDownBy: 2, maxFramerate: 30 },
  { rid: "r2", maxBitrate: 2_500_000, scaleResolutionDownBy: 1, maxFramerate: 30 },
] as const;

export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48000,
  channelCount: 1,
} as const;

export const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
} as const;
