"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { DailyParticipant } from "@daily-co/daily-js";
import { Icon, type IconName } from "@/components/dc/icons";
import { useConfirmSubmit } from "@/components/app/confirm";
import { cn } from "@/lib/cn";
import { playable, useDailyCall } from "./use-daily-call";

/* The call room (CL2, CL3): our own screen on top of a Daily call, in the app's warm dark palette. */

export type CallRole = "PARTICIPANT" | "MENTOR" | "GUARDIAN";
const C = { page: "bg-[#14110D] text-[#F4EFE5]", panel: "bg-[#201B16]", tile: "bg-[#2A241D]", soft: "text-[#D6CEBF]", faint: "text-[#A39A8A]" };
const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;
const initials = (n: string) => n.replace(/^Dr\.?\s+/i, "").replace(/,.*$/, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const nameOf = (p: DailyParticipant) => p.user_name.replace(/,\s*observing$/i, "") || "Guest";
const isObserver = (p: DailyParticipant) => p.user_id === "GUARDIAN";

function Video({ track, fit = "cover", mirror }: { track?: MediaStreamTrack; fit?: "cover" | "contain"; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current; if (!v) return;
    if (!track) { v.srcObject = null; return; }
    if ((v.srcObject as MediaStream | null)?.getVideoTracks()[0]?.id === track.id) return;
    v.srcObject = new MediaStream([track]);
    void v.play().catch(() => undefined);
  }, [track]);
  return <video ref={ref} autoPlay muted playsInline className={cn("absolute inset-0 size-full", fit === "cover" ? "object-cover" : "object-contain", mirror && "-scale-x-100")} />;
}

function Audio({ track, onBlocked }: { track: MediaStreamTrack; onBlocked: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = ref.current; if (!a) return;
    if ((a.srcObject as MediaStream | null)?.getAudioTracks()[0]?.id === track.id) return;
    a.srcObject = new MediaStream([track]);
    a.play().catch(onBlocked);
  }, [track, onBlocked]);
  return <audio ref={ref} autoPlay data-call-audio />;
}

/** Everyone else's sound. If the browser blocks autoplay, one tap turns it on. */
function RemoteAudio({ people }: { people: DailyParticipant[] }) {
  const [blocked, setBlocked] = useState(false);
  const tracks = people.flatMap((p) => [playable(p.tracks.audio), playable(p.tracks.screenAudio)]).filter((t): t is MediaStreamTrack => !!t);
  return (
    <>
      {tracks.map((t) => <Audio key={t.id} track={t} onBlocked={() => setBlocked(true)} />)}
      {blocked && (
        <button type="button" onClick={() => { document.querySelectorAll<HTMLAudioElement>("audio[data-call-audio]").forEach((a) => void a.play()); setBlocked(false); }}
          className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-butter px-5 py-3 text-[14.5px] font-bold text-butter-ink shadow-lg">Tap to turn on sound</button>
      )}
    </>
  );
}

function Avatar({ name, size = "lg" }: { name: string; size?: "lg" | "sm" }) {
  return <span className={cn("flex items-center justify-center rounded-full bg-mint font-display font-bold text-mint-ink", size === "lg" ? "size-24 text-[34px] lg:size-28 lg:text-[40px]" : "size-12 text-[18px]")}>{initials(name)}</span>;
}

/** One person (or a shared screen). `small`: the self view and the people strip beside a shared screen. */
function Tile({ p, label, speaking, screen, small, className }: { p: DailyParticipant; label: string; speaking?: boolean; screen?: boolean; small?: boolean; className?: string }) {
  const track = screen ? playable(p.tracks.screenVideo) : playable(p.tracks.video);
  return (
    <div className={cn("relative overflow-hidden ring-inset transition-shadow", small ? "rounded-[18px]" : "rounded-[24px]", C.tile, speaking ? "ring-[3px] ring-mint" : "ring-1 ring-white/10", className)}>
      {track ? <Video track={track} fit={screen ? "contain" : "cover"} mirror={p.local && !screen} />
        : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><Avatar name={nameOf(p)} size={small ? "sm" : "lg"} />{!small && <p className={cn("text-[14px]", C.soft)}>Camera off</p>}</div>}
      <span className="absolute bottom-2.5 left-2.5 inline-flex max-w-[calc(100%-20px)] items-center gap-1.5 truncate rounded-full bg-black/55 px-3 py-1.5 text-[12.5px] font-semibold backdrop-blur-sm lg:text-[13.5px]">
        {!p.audio && !screen && <Icon name="micOff" size={14} className="shrink-0 text-blush" />}{label}
      </span>
    </div>
  );
}

function Ctrl({ icon, label, onClick, off, className, disabled }: { icon: IconName; label: string; onClick?: () => void; off?: boolean; className?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={off === undefined ? undefined : !off} aria-label={label} title={label}
      className={cn("flex flex-col items-center gap-1.5 disabled:opacity-40", className)}>
      <span className={cn("flex size-[52px] items-center justify-center rounded-full transition-colors lg:size-14", off ? "bg-blush text-blush-ink" : "bg-white/[.12] hover:bg-white/20")}><Icon name={icon} size={22} /></span>
      <span className={cn("text-[11.5px] font-semibold max-lg:sr-only", C.soft)}>{label}</span>
    </button>
  );
}

/** Camera and microphone pickers (desktop), from the devices the browser reports. */
function Devices({ list, set, onClose }: { list: () => Promise<MediaDeviceInfo[]>; set: (d: { cam?: string; mic?: string }) => Promise<void>; onClose: () => void }) {
  const [devs, setDevs] = useState<MediaDeviceInfo[]>([]);
  useEffect(() => { void list().then(setDevs); }, [list]);
  const sel = (kind: "videoinput" | "audioinput", label: string, key: "cam" | "mic") => {
    const opts = devs.filter((d) => d.kind === kind && d.deviceId);
    return (
      <label className="flex flex-col gap-1.5 text-[13px] font-bold text-[#D6CEBF]">{label}
        <select onChange={(e) => void set({ [key]: e.target.value })} defaultValue="" className="h-12 rounded-[14px] border-2 border-white/15 bg-[#14110D] px-3 text-[15px] font-normal text-[#F4EFE5]">
          <option value="" disabled>Choose…</option>
          {opts.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `${label} ${i + 1}`}</option>)}
        </select>
      </label>
    );
  };
  return (
    <div className="absolute bottom-[calc(100%+12px)] left-1/2 z-30 flex w-[320px] -translate-x-1/2 flex-col gap-3 rounded-[22px] bg-[#201B16] p-4 shadow-[0_20px_50px_rgba(0,0,0,.5)] ring-1 ring-white/10">
      <div className="flex items-center justify-between"><p className="font-display text-[17px] font-extrabold">Camera and microphone</p><button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"><Icon name="x" size={18} /></button></div>
      {sel("videoinput", "Camera", "cam")}{sel("audioinput", "Microphone", "mic")}
    </div>
  );
}

export function CallRoom({ askId, url, token, simulated, title, other, role, recorded, startIso, minutes, leave, leaveConfirm, panel, panelLabel }: {
  askId: string; url: string; token: string; simulated: boolean; title: string;
  /** Who this person is meeting (first or short name), for the waiting state. */
  other: string; role: CallRole; recorded: boolean; startIso: string; minutes: number;
  leave: (fd: FormData) => void; leaveConfirm: { title: string; body: string; confirmLabel: string };
  /** The side column on desktop, the "More" sheet on the phone: notes, questions, safety, or the guardian controls. */
  panel: ReactNode; panelLabel: string;
}) {
  const call = useDailyCall({ url, token, enabled: !simulated });
  const [now, setNow] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [devicesOpen, setDevicesOpen] = useState(false);
  const leaving = useConfirmSubmit({ ...leaveConfirm, danger: true });
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const elapsed = now == null ? 0 : (now - new Date(startIso).getTime()) / 1000;
  const left = minutes * 60 - elapsed;
  const me = call.participants.find((p) => p.local);
  const remotes = call.participants.filter((p) => !p.local);
  const people = remotes.filter((p) => !isObserver(p));
  const observers = remotes.filter(isObserver);
  const screen = remotes.find((p) => playable(p.tracks.screenVideo));
  const observer = role === "GUARDIAN";
  const speaking = (p: DailyParticipant) => call.activeSpeaker === p.session_id && p.audio;
  const canShare = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  const stage = simulated ? (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <Avatar name={other} />
      <p className="font-display text-[22px] font-extrabold">{other}</p>
      <p className={cn("max-w-[380px] text-[14.5px] leading-normal", C.soft)}>Video is not set up on this server, so this is a preview of the room. Add the Daily keys to try a real call.</p>
    </div>
  ) : call.status === "error" ? (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-[18px] bg-blush text-blush-ink"><Icon name="alert" size={26} /></span>
      <p className="font-display text-[22px] font-extrabold">The call could not connect</p>
      <p className={cn("max-w-[420px] text-[14.5px] leading-normal", C.soft)}>{call.error}</p>
      <button type="button" onClick={() => window.location.reload()} className="dc-btn h-12 bg-white/[.12] text-[#F4EFE5]"><Icon name="refresh" size={18} />Try again</button>
    </div>
  ) : screen ? (
    <>
      <div className="absolute inset-0"><Tile p={screen} label={`${nameOf(screen)}'s screen`} screen className="size-full" /></div>
      {people.length > 0 && <div className="absolute left-3 top-3 z-10 flex gap-2 lg:left-4 lg:top-4">{people.map((p) => <Tile key={p.session_id} p={p} label={nameOf(p)} speaking={speaking(p)} small className="h-[96px] w-[140px] lg:h-[120px] lg:w-[200px]" />)}</div>}
    </>
  ) : people.length === 0 ? (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="relative flex"><span className="absolute inset-0 animate-ping rounded-full bg-mint/30" /><Avatar name={other} /></span>
      <p className="font-display text-[22px] font-extrabold lg:text-[26px]">{call.status === "joining" ? "Joining the call…" : `Waiting for ${other} to join`}</p>
      <p className={cn("max-w-[380px] text-[14.5px] leading-normal", C.soft)}>{call.status === "joining" ? "Connecting your camera and microphone." : "They will appear here as soon as they join. Your camera and microphone are ready."}</p>
    </div>
  ) : (
    <div className={cn("absolute inset-0 grid gap-2 lg:gap-3", people.length > 1 && "grid-rows-2 lg:grid-cols-2 lg:grid-rows-1")}>
      {people.map((p) => <Tile key={p.session_id} p={p} label={nameOf(p)} speaking={speaking(p)} className="size-full" />)}
    </div>
  );

  return (
    <div className={cn("flex h-[100dvh] flex-col overflow-hidden lg:h-auto lg:min-h-screen lg:overflow-visible", C.page)}>
      <header className="flex h-14 shrink-0 items-center gap-2.5 px-4 lg:h-16 lg:px-8">
        <h1 className="min-w-0 flex-1 truncate font-display text-[16px] font-extrabold lg:text-[19px]">{title}</h1>
        {recorded && (call.recordingError
          ? <span className="inline-flex items-center gap-1.5 rounded-full bg-butter px-3 py-1.5 text-[12px] font-bold text-butter-ink">Recording did not start</span>
          : <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4A2517] px-3 py-1.5 text-[12px] font-bold text-[#F0906B]"><span className="size-2 animate-pulse rounded-full bg-[#F0906B]" />Recorded</span>)}
        {call.weakNetwork && <span className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-semibold sm:inline-flex"><Icon name="wifiOff" size={14} />Weak connection</span>}
        <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-bold tabular-nums lg:text-[13.5px]", left <= 0 ? "bg-blush text-blush-ink" : left <= 300 ? "bg-butter text-butter-ink" : "bg-white/10")} suppressHydrationWarning>
          <Icon name="clock" size={14} />{mmss(elapsed)}<span className="max-sm:hidden"> / {mmss(minutes * 60)}</span>
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main id="main" className="flex min-h-0 flex-1 flex-col px-2 lg:px-5 lg:pb-5">
          <div className={cn("relative min-h-0 flex-1 overflow-hidden rounded-[26px] lg:min-h-[60vh] lg:rounded-[30px]", C.panel)}>
            {stage}
            {!simulated && <RemoteAudio people={remotes} />}
            {/* Self view: floating, mirrored. An observing guardian has no camera, so a chip instead. */}
            {/* Positioned by a wrapper: the tile itself is `relative`, which would win over `absolute` on the same element. */}
            {me && !observer && (
              <div className="absolute right-2.5 top-2.5 z-10 h-[132px] w-[96px] rounded-[18px] shadow-[0_10px_30px_rgba(0,0,0,.45)] lg:bottom-4 lg:right-4 lg:top-auto lg:h-[124px] lg:w-[220px]">
                <Tile p={me} label="You" small className="size-full" />
              </div>
            )}
            <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
              {observer && <span className="rounded-full bg-black/55 px-3 py-1.5 text-[12.5px] font-semibold backdrop-blur-sm">You are observing, camera off</span>}
              {observers.map((p) => <span key={p.session_id} className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[12.5px] font-semibold backdrop-blur-sm"><Icon name="shieldCheck" size={14} className="text-mint" />{nameOf(p)} is observing</span>)}
            </div>
            {call.status === "reconnecting" && <div className="absolute inset-x-0 top-0 z-20 flex justify-center p-3"><span className="rounded-full bg-butter px-4 py-2 text-[13.5px] font-bold text-butter-ink">Reconnecting…</span></div>}
          </div>

          {call.deviceError && (
            <div role="alert" className="mx-1 mt-2 flex items-start gap-3 rounded-[18px] bg-butter px-4 py-3 text-[13.5px] leading-snug text-butter-ink lg:mx-0">
              <Icon name="alert" size={18} className="mt-0.5 shrink-0" /><p className="flex-1">{call.deviceError}</p>
              <button type="button" onClick={() => void call.retryDevices()} className="shrink-0 font-bold underline">Try again</button>
            </div>
          )}

          <div className="relative flex shrink-0 items-end justify-center gap-3 px-2 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 lg:gap-4 lg:pb-0 lg:pt-4">
            <Ctrl icon={call.mic ? "mic" : "micOff"} label={call.mic ? "Mute" : "Unmute"} off={!call.mic} onClick={call.toggleMic} disabled={simulated} />
            {!observer && <Ctrl icon={call.cam ? "video" : "videoOff"} label={call.cam ? "Camera off" : "Camera on"} off={!call.cam} onClick={call.toggleCam} disabled={simulated} />}
            {!observer && <Ctrl icon="flipCamera" label="Flip camera" onClick={() => void call.flipCamera()} disabled={simulated || !call.cam} className="lg:hidden" />}
            {!observer && canShare && <Ctrl icon="screenShare" label={call.sharing ? "Stop sharing" : "Share screen"} off={call.sharing ? false : undefined} onClick={call.toggleShare} disabled={simulated} className="max-lg:hidden" />}
            {!observer && <div className="relative max-lg:hidden"><Ctrl icon="settings" label="Devices" onClick={() => setDevicesOpen((o) => !o)} disabled={simulated} />{devicesOpen && <Devices list={call.listDevices} set={call.setDevices} onClose={() => setDevicesOpen(false)} />}</div>}
            <Ctrl icon="more" label={panelLabel} onClick={() => setSheet(true)} className="lg:hidden" />
            <form action={leave} onSubmit={leaving.onSubmit} className="flex flex-col items-center gap-1.5">
              {leaving.dialog}
              <input type="hidden" name="askId" value={askId} />
              <button type="submit" aria-label="Leave the call" className="flex h-[52px] items-center gap-2 rounded-full bg-clay px-5 text-[15px] font-bold text-clay-ink lg:h-14 lg:px-7"><Icon name="logout" size={19} />Leave</button>
              <span className="text-[11.5px] font-semibold opacity-0 max-lg:hidden" aria-hidden="true">.</span>
            </form>
          </div>
        </main>

        {/* One panel: the side column on desktop, a sheet over the call on the phone. */}
        {sheet && <button type="button" aria-label="Close" onClick={() => setSheet(false)} className="fixed inset-0 z-40 bg-black/50 lg:hidden" />}
        <aside aria-label={panelLabel} className={cn("flex-col gap-3 overflow-y-auto lg:flex lg:w-[360px] lg:shrink-0 lg:border-l lg:border-white/10 lg:p-5",
          sheet ? "fixed inset-x-0 bottom-0 z-50 flex max-h-[82dvh] rounded-t-[28px] p-4 pb-[max(16px,env(safe-area-inset-bottom))] lg:static lg:max-h-none lg:rounded-none" : "hidden", C.panel, "lg:bg-transparent")}>
          <div className="flex items-center justify-between lg:hidden"><p className="font-display text-[19px] font-extrabold">{panelLabel}</p><button type="button" onClick={() => setSheet(false)} aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-white/10"><Icon name="x" size={20} /></button></div>
          {panel}
        </aside>
      </div>
    </div>
  );
}
