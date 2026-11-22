"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { SubmitButton } from "@/components/forms/fields";
import { PhoneBar } from "@/components/account/shells";
import { joinAction, type AskFormState } from "@/app/asks/actions";
import { cn } from "@/lib/cn";
import { useCallClock, type CallClock } from "@/components/app/call-clock";
import { savedDevices, saveDevices } from "@/components/app/call/devices";

type Dev = { id: string; label: string };

/** CL1 camera preview, mic level and device pickers. Nothing leaves the browser until the person joins. */
export function Preview() {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [cams, setCams] = useState<Dev[]>([]); const [mics, setMics] = useState<Dev[]>([]);
  const [cam, setCam] = useState(""); const [mic, setMic] = useState("");
  // Start from, and remember, the camera and microphone picked here: the call joins with them.
  useEffect(() => { const d = savedDevices(); if (d.cam) setCam(d.cam); if (d.mic) setMic(d.mic); }, []);
  useEffect(() => { saveDevices({ cam, mic }); }, [cam, mic]);
  useEffect(() => {
    let stream: MediaStream | null = null; let raf = 0; let ctx: AudioContext | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: cam ? { deviceId: cam } : true, audio: mic ? { deviceId: mic } : true });
        if (video.current) video.current.srcObject = stream;
        const all = await navigator.mediaDevices.enumerateDevices();
        setCams(all.filter((d) => d.kind === "videoinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Camera ${i + 1}` })));
        setMics(all.filter((d) => d.kind === "audioinput").map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` })));
        ctx = new AudioContext(); const an = ctx.createAnalyser(); an.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        const tick = () => { an.getByteFrequencyData(buf); setLevel(Math.min(1, buf.reduce((a, b) => a + b, 0) / buf.length / 80)); raf = requestAnimationFrame(tick); };
        tick(); setErr(null);
      } catch { setErr("We cannot reach your camera or microphone. Allow them in your browser, then refresh."); }
    })();
    return () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); void ctx?.close(); };
  }, [cam, mic]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-card bg-ink">
        <video ref={video} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-[12px] font-bold tracking-[.04em] text-white">YOU, PREVIEW</span>
        {!err && <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-[12.5px] font-semibold text-mint-ink">Good connection</span>}
        {err && <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-[14.5px] text-white">{err}</p>}
      </div>
      <div className="flex items-center gap-3 rounded-field border border-line bg-card px-4 py-3 max-lg:hidden">
        <span className="text-[13.5px] font-bold">Mic level</span>
        <span className="h-2 flex-1 overflow-hidden rounded bg-sand"><span className="block h-full rounded bg-forest transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} /></span>
      </div>
      <div className="grid gap-3 max-lg:hidden lg:grid-cols-2">
        {([["Camera", cams, cam, setCam], ["Microphone", mics, mic, setMic]] as const).map(([label, list, v, set]) => (
          <label key={label} className="flex flex-col gap-[7px] text-[13px] font-bold text-bark">{label}
            <select value={v} onChange={(e) => set(e.target.value)} className="h-[54px] rounded-field border-2 border-line bg-card px-4 text-[16px] font-normal text-ink">
              {list.length ? list.map((d) => <option key={d.id} value={d.id}>{d.label}</option>) : <option value="">Default</option>}
            </select>
          </label>
        ))}
      </div>
    </div>
  );
}

/** "Your 2 questions": kept in this browser only, shown again in the call. */
export function Questions({ askId, n = 2 }: { askId: string; n?: number }) {
  const key = `vc-questions-${askId}`;
  const [qs, setQs] = useState<string[]>(Array(n).fill(""));
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem(key) ?? "[]"); if (Array.isArray(v)) setQs([...v, ...Array(n).fill("")].slice(0, n)); } catch { /* ignore */ } }, [key, n]);
  const save = (i: number, s: string) => { const next = qs.map((q, j) => (j === i ? s : q)); setQs(next); try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ } };
  return (
    <div className="flex flex-col gap-2">
      {qs.map((q, i) => <input key={i} value={q} onChange={(e) => save(i, e.target.value)} placeholder={`${i + 1}. A question to bring`} aria-label={`Question ${i + 1}`} className="h-12 rounded-field border-2 border-line bg-card px-3.5 text-[15px] focus:border-ink focus:outline-none" />)}
      <p className="text-[12.5px] text-stone">Only saved on this device.</p>
    </div>
  );
}

/** Turns itself on when the link opens, ten minutes before the start, without a refresh. */
export function JoinButton({ askId, clock, paused, opensAt }: { askId: string; clock: CallClock; paused: boolean; opensAt: string }) {
  const [state, action] = useFormState<AskFormState, FormData>(joinAction, {});
  const open = useCallClock(clock).open && !paused;
  const btn = (cls: string) => <SubmitButton form="join" icon="video" disabled={!open} className={cn(cls)} pendingText="Joining…">{open ? "Join the call" : `Opens ${opensAt}`}</SubmitButton>;
  return (
    <form id="join" action={action} className="flex flex-col gap-2">
      <input type="hidden" name="askId" value={askId} />
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="max-lg:hidden">{btn("h-14 w-full")}</div>
      <PhoneBar>{btn("h-14 w-full")}</PhoneBar>
    </form>
  );
}
