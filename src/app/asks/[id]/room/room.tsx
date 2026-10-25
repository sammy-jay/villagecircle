"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/dc/icons";
import { leaveAction } from "@/app/asks/actions";
import { cn } from "@/lib/cn";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/** CL2 In the call. Daily's own room runs in the frame (its buttons mute and switch the camera); this page adds the timer, questions, notes and safety. */
export function Room({ askId, src, simulated, title, mentor, me, guardian, recorded, startIso, minutes, leave = leaveAction, trouble = `/asks/${askId}/trouble`, safety }: {
  askId: string; src: string; simulated: boolean; title: string; mentor: string; me: string; guardian: string | null; recorded: boolean; startIso: string; minutes: number;
  /** The mentor view (CL4 / D8) leaves to the close-out instead of the participant check-out, and words the safety line for a mentor. */
  leave?: (fd: FormData) => void; trouble?: string; safety?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [notes, setNotes] = useState(""); const [saved, setSaved] = useState<string | null>(null);
  const [qs, setQs] = useState<string[]>([]);
  const [moment, setMoment] = useState(false);
  const [panel, setPanel] = useState(true);
  const nk = `vc-notes-${askId}`;
  useEffect(() => {
    setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000);
    try { setNotes(localStorage.getItem(nk) ?? ""); setQs((JSON.parse(localStorage.getItem(`vc-questions-${askId}`) ?? "[]") as string[]).filter(Boolean)); } catch { /* ignore */ }
    return () => clearInterval(t);
  }, [askId, nk]);
  const elapsed = now == null ? 0 : Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  const save = (v: string) => { setNotes(v); try { localStorage.setItem(nk, v); setSaved(new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(new Date())); } catch { /* ignore */ } };

  return (
    <div className="flex min-h-screen flex-col bg-[#1D1914] text-white" data-theme="dark">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4 lg:px-8">
        <p className="min-w-0 flex-1 truncate font-display text-[17px] font-extrabold lg:text-[19px]">{title}</p>
        {recorded && <span className="inline-flex items-center gap-1.5 rounded-full bg-clay px-3 py-1.5 text-[12.5px] font-bold"><span className="size-2 rounded-full bg-white" />Recording</span>}
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold tabular-nums" suppressHydrationWarning>{mmss(elapsed)} / {mmss(minutes * 60)}</span>
        {guardian && <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold lg:inline">{guardian} is watching</span>}
      </header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main id="main" className="relative flex min-h-[60vh] flex-1 flex-col p-3 lg:p-5">
          {simulated ? (
            <div className="grid flex-1 gap-3 lg:grid-cols-2">
              {[[mentor, "Speaking", "bg-mint text-mint-ink"], [`${me} (you)`, "Camera on", "bg-blush text-blush-ink"]].map(([n, s, tone]) => (
                <div key={n} className="relative flex min-h-[200px] items-center justify-center rounded-card bg-white/5">
                  <span className={cn("flex size-24 items-center justify-center rounded-full font-display text-[32px] font-bold", tone)}>{n!.replace(/^Dr /, "").split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                  <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-semibold">{n} · {s}</span>
                </div>
              ))}
              <p className="col-span-full text-center text-[13px] text-white/60">Video is not set up on this server, so this is a preview of the room.</p>
            </div>
          ) : (
            <iframe title={`Video call with ${mentor}`} src={src} allow="camera; microphone; fullscreen; display-capture; autoplay" className="min-h-[60vh] w-full flex-1 rounded-card border-0 bg-black" />
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" onClick={() => setPanel((p) => !p)} className="inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-5 text-[15px] font-bold lg:hidden"><Icon name="pencil" size={18} />Notes</button>
            <form action={leave}><input type="hidden" name="askId" value={askId} /><button type="submit" className="inline-flex h-12 items-center gap-2 rounded-full bg-clay px-6 text-[15px] font-bold"><Icon name="logout" size={18} />Leave</button></form>
          </div>
        </main>
        <aside className={cn("flex w-full shrink-0 flex-col gap-4 border-white/10 p-4 lg:w-[340px] lg:border-l lg:p-5", !panel && "max-lg:hidden")}>
          {qs.length > 0 && (
            <section className="rounded-card bg-white/5 p-4">
              <h2 className="font-display text-[17px] font-extrabold">Your questions</h2>
              <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[14px] text-white/85">{qs.map((q) => <li key={q}>{q}</li>)}</ol>
            </section>
          )}
          <section className="flex flex-col gap-2 rounded-card bg-white/5 p-4">
            <div className="flex items-baseline justify-between"><h2 className="font-display text-[17px] font-extrabold">My notes</h2>{saved && <span className="text-[12px] text-white/60">Saved {saved}</span>}</div>
            <textarea value={notes} onChange={(e) => save(e.target.value)} rows={5} aria-label="My notes" className="w-full resize-none rounded-field border-2 border-white/15 bg-transparent px-3 py-2.5 text-[14.5px] leading-normal text-white focus:border-white/50 focus:outline-none" />
            <p className="text-[12.5px] text-white/60">Only you can see these. They stay on this device.</p>
          </section>
          <button type="button" onClick={() => setMoment(true)} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-white/25 text-[15px] font-bold"><Icon name="pause" size={18} />I need a moment</button>
          {moment && <p role="status" className="rounded-[16px] bg-butter px-3.5 py-3 text-[13.5px] leading-normal text-butter-ink">Take your time. Turn off your mic and camera with the buttons in the call, and come back when you are ready. You can also leave at any point.</p>}
          <Link href={trouble} className="text-center text-[14px] font-bold text-white/80 underline">Having trouble connecting?</Link>
          <Link href={`/report?ask=${askId}`} target="_blank" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blush text-[15px] font-bold text-blush-ink"><Icon name="flag" size={18} />Report a concern</Link>
          <p className="text-[12.5px] leading-normal text-white/70">{safety ?? `${recorded ? "This call is recorded because you are under 18. " : ""}Contact details cannot be shared here. If someone asks, say no and tell us. A report pauses the connection and the other person is not told who reported.`}</p>
        </aside>
      </div>
    </div>
  );
}
