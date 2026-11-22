"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/dc/icons";
import { CallRoom } from "@/components/app/call/call-room";
import { leaveAction } from "@/app/asks/actions";

/**
 * CL2 In the call, for the participant (and, with `leave` and `safety`, the mentor): our own call screen, with the
 * person's questions, private notes and the safety controls beside it (in a sheet on the phone).
 */
export function Room({ askId, url, token, simulated, title, other, recorded, startIso, minutes, leave = leaveAction, trouble = `/asks/${askId}/trouble`, safety, role = "PARTICIPANT" }: {
  askId: string; url: string; token: string; simulated: boolean; title: string; other: string; recorded: boolean; startIso: string; minutes: number;
  /** The mentor view (CL4 / D8) leaves to the close-out instead of the participant check-out, and words the safety line for a mentor. */
  leave?: (fd: FormData) => void; trouble?: string; safety?: string; role?: "PARTICIPANT" | "MENTOR";
}) {
  const [notes, setNotes] = useState(""); const [saved, setSaved] = useState<string | null>(null);
  const [qs, setQs] = useState<string[]>([]);
  const [moment, setMoment] = useState(false);
  const nk = `vc-notes-${askId}`;
  useEffect(() => {
    try { setNotes(localStorage.getItem(nk) ?? ""); setQs((JSON.parse(localStorage.getItem(`vc-questions-${askId}`) ?? "[]") as string[]).filter(Boolean)); } catch { /* ignore */ }
  }, [askId, nk]);
  const save = (v: string) => { setNotes(v); try { localStorage.setItem(nk, v); setSaved(new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date())); } catch { /* ignore */ } };

  const panel = (
    <>
      {qs.length > 0 && (
        <section className="rounded-[22px] bg-white/[.06] p-4">
          <h2 className="font-display text-[17px] font-extrabold">Your questions</h2>
          <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[14px] text-[#D6CEBF]">{qs.map((q) => <li key={q}>{q}</li>)}</ol>
        </section>
      )}
      <section className="flex flex-col gap-2 rounded-[22px] bg-white/[.06] p-4">
        <div className="flex items-baseline justify-between"><h2 className="font-display text-[17px] font-extrabold">My notes</h2>{saved && <span className="text-[12px] text-[#A39A8A]">Saved {saved}</span>}</div>
        <textarea value={notes} onChange={(e) => save(e.target.value)} rows={5} aria-label="My notes" placeholder="Anything you want to remember…" className="w-full resize-none rounded-[16px] border-2 border-white/15 bg-transparent px-3 py-2.5 text-[14.5px] leading-normal text-[#F4EFE5] placeholder:text-[#A39A8A] focus:border-white/50 focus:outline-none" />
        <p className="text-[12.5px] text-[#A39A8A]">Only you can see these. They stay on this device.</p>
      </section>
      <button type="button" onClick={() => setMoment((m) => !m)} aria-expanded={moment} className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-white/20 text-[15px] font-bold"><Icon name="pause" size={18} />I need a moment</button>
      {moment && <p role="status" className="rounded-[16px] bg-butter px-3.5 py-3 text-[13.5px] leading-normal text-butter-ink">Take your time. Turn off your microphone and camera with the buttons under the video, and come back when you are ready. You can also leave at any point.</p>}
      <Link href={`/report?ask=${askId}`} target="_blank" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-blush text-[15px] font-bold text-blush-ink"><Icon name="flag" size={18} />Report a concern</Link>
      <Link href={trouble} className="text-center text-[14px] font-bold text-[#D6CEBF] underline">Having trouble connecting?</Link>
      <p className="text-[12.5px] leading-normal text-[#A39A8A]">{safety ?? `${recorded ? "This call is recorded because you are under 18. " : ""}Contact details cannot be shared here. If someone asks, say no and tell us. A report pauses the connection and the other person is not told who reported.`}</p>
    </>
  );

  return (
    <CallRoom askId={askId} url={url} token={token} simulated={simulated} title={title} other={other} role={role} recorded={recorded} startIso={startIso} minutes={minutes}
      leave={leave} panel={panel} panelLabel="Notes and safety"
      leaveConfirm={role === "MENTOR"
        ? { title: "Leave the call?", body: "You will go to the close-out to add your notes and next steps.", confirmLabel: "Leave the call" }
        : { title: "Leave the call?", body: "This ends the call for you, and we will ask how it went.", confirmLabel: "Leave the call" }} />
  );
}
