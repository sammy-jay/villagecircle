"use client";

import DailyIframe, { type DailyCall, type DailyEventObjectNetworkConnectionEvent, type DailyParticipant } from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { savedDevices, saveDevices } from "./devices";

export type CallStatus = "joining" | "joined" | "reconnecting" | "left" | "error";
export interface CallState {
  status: CallStatus; error: string | null; deviceError: string | null;
  participants: DailyParticipant[]; activeSpeaker: string | null; weakNetwork: boolean;
  mic: boolean; cam: boolean; sharing: boolean; recording: boolean; recordingError: boolean;
}

const DEVICE_MESSAGES: Record<string, string> = {
  permissions: "Your browser is blocking the camera or microphone. Allow them in the address bar, then press Try again.",
  "not-found": "We cannot find a camera or microphone. Plug one in, or carry on with what works.",
  "cam-in-use": "Another app is using your camera. Close it, then turn your camera on again.",
  "mic-in-use": "Another app is using your microphone. Close it, then unmute again.",
};

/**
 * One Daily call for the room screen: joins with the person's token, follows who is in the call, their tracks and
 * who is speaking, and offers the controls. Leaves and cleans up when the screen goes away.
 */
export function useDailyCall({ url, token, enabled }: { url: string; token: string; enabled: boolean }) {
  const callRef = useRef<DailyCall | null>(null);
  const [s, setS] = useState<CallState>({ status: "joining", error: null, deviceError: null, participants: [], activeSpeaker: null, weakNetwork: false, mic: true, cam: true, sharing: false, recording: false, recordingError: false });
  const patch = (p: Partial<CallState>) => setS((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!enabled) return;
    // Several instances are allowed so React's double mount in development never trips Daily's single-call check.
    const call = DailyIframe.createCallObject({ subscribeToTracksAutomatically: true, allowMultipleCallInstances: true });
    callRef.current = call;
    const sync = () => {
      if (call.isDestroyed()) return;
      const ps = Object.values(call.participants());
      const me = ps.find((p) => p.local);
      setS((x) => ({ ...x, participants: ps, mic: !!me?.audio, cam: !!me?.video, sharing: !!me?.screen }));
    };
    const on = (ev: Parameters<DailyCall["on"]>[0], fn: (e?: unknown) => void) => { call.on(ev, fn as never); };
    on("joined-meeting", () => { patch({ status: "joined" }); sync(); });
    for (const ev of ["participant-joined", "participant-updated", "participant-left", "track-started", "track-stopped"] as const) on(ev, sync);
    on("active-speaker-change", (e) => patch({ activeSpeaker: (e as { activeSpeaker?: { peerId?: string } })?.activeSpeaker?.peerId ?? null }));
    on("network-quality-change", (e) => patch({ weakNetwork: (e as { threshold?: string })?.threshold !== "good" }));
    on("network-connection", (e) => { const t = (e as DailyEventObjectNetworkConnectionEvent)?.event; if (t === "interrupted") patch({ status: "reconnecting" }); if (t === "connected") patch({ status: "joined" }); });
    on("recording-started", () => patch({ recording: true, recordingError: false }));
    on("recording-stopped", () => patch({ recording: false }));
    on("recording-error", () => patch({ recordingError: true }));
    on("camera-error", (e) => {
      const err = (e as { error?: { type?: string } })?.error?.type ?? "";
      patch({ deviceError: DEVICE_MESSAGES[err] ?? DEVICE_MESSAGES.permissions! });
    });
    on("left-meeting", () => patch({ status: "left" }));
    on("error", (e) => patch({ status: "error", error: (e as { errorMsg?: string })?.errorMsg ?? "The call could not continue." }));

    const devices = savedDevices(); // picked on the before-the-call screen
    call.join({ url, token, ...(devices.cam ? { videoSource: devices.cam } : {}), ...(devices.mic ? { audioSource: devices.mic } : {}) })
      .catch((e: unknown) => patch({ status: "error", error: e instanceof Error ? e.message : "We could not join the call." }));

    return () => {
      callRef.current = null;
      void call.leave().catch(() => undefined).finally(() => { if (!call.isDestroyed()) void call.destroy(); });
    };
  }, [url, token, enabled]);

  const toggleMic = useCallback(() => { const c = callRef.current; if (c) c.setLocalAudio(!c.localAudio()); }, []);
  const toggleCam = useCallback(() => { const c = callRef.current; if (c) c.setLocalVideo(!c.localVideo()); }, []);
  const toggleShare = useCallback(() => { const c = callRef.current; if (!c) return; if (c.participants().local?.screen) c.stopScreenShare(); else c.startScreenShare(); }, []);
  const flipCamera = useCallback(async () => { await callRef.current?.cycleCamera({ preferDifferentFacingMode: true }); }, []);
  const setDevices = useCallback(async (d: { cam?: string; mic?: string }) => {
    const c = callRef.current; if (!c) return;
    await c.setInputDevicesAsync({ ...(d.cam ? { videoDeviceId: d.cam } : {}), ...(d.mic ? { audioDeviceId: d.mic } : {}) });
    saveDevices(d);
  }, []);
  const listDevices = useCallback(async () => (await callRef.current?.enumerateDevices())?.devices ?? [], []);
  const retryDevices = useCallback(async () => {
    patch({ deviceError: null });
    const c = callRef.current; if (!c) return;
    c.setLocalVideo(true); c.setLocalAudio(true);
  }, []);
  const leave = useCallback(async () => { await callRef.current?.leave().catch(() => undefined); }, []);

  return { ...s, toggleMic, toggleCam, toggleShare, flipCamera, setDevices, listDevices, retryDevices, leave };
}

/** A track to show, or nothing: only when Daily says it is playable. */
export const playable = (t?: { state?: string; persistentTrack?: MediaStreamTrack }) => (t?.state === "playable" ? t.persistentTrack : undefined);
