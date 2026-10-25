"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/dc/icons";
import { pauseFromCallAction, stepOutAction } from "../../../actions";
import { cn } from "@/lib/cn";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

/** CL3 / P07-D2 In the call, guardian view: observer tiles (or the Daily room), the timer and the guardian controls. */
export function GuardianRoom({ askId, src, simulated, title, mentor, first, recorded, startIso, minutes }: {
  askId: string; src: string; simulated: boolean; title: string; mentor: string; first: string; recorded: boolean; startIso: string; minutes: number;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = now == null ? 0 : Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 1000));
  const tile = (name: string, sub: string, bg: string, ink: string, big?: boolean) => (
    <div className={cn("flex flex-col items-center justify-center gap-2.5 rounded-panel", bg, big ? "min-h-[250px] lg:min-h-[340px]" : "min-h-[140px] lg:min-h-[180px]")}>
      <span className={cn("flex items-center justify-center rounded-full bg-[#201B16] font-display font-bold", ink, big ? "size-[100px] text-[36px]" : "size-[60px] text-[22px]")}>{name.replace(/^Dr /, "").replace(" (observing)", "").split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
      <div className="text-center"><p className="text-[16px] font-extrabold">{name}</p><p className="text-[13px] text-[#D6CEBF]">{sub}</p></div>
    </div>
  );
  return (
    <div className="flex min-h-screen flex-col bg-[#14110D] text-[#F4EFE5]">
      <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5 lg:px-8 lg:py-4">
        <div className="min-w-0">
          <p className="truncate text-[15.5px] font-extrabold lg:text-[18px]">{title}</p>
          <div className="mt-[3px] flex items-center gap-2.5">
            {recorded && <span className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#F0906B]"><span className="size-[9px] rounded-full bg-[#F0906B]" />Recording</span>}
            <span className="rounded-full bg-[#4A3A12] px-[13px] py-[7px] text-[11.5px] font-semibold text-butter">Guardian view</span>
          </div>
        </div>
        <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#2A241D] px-3 py-[7px] text-[13.5px] font-bold tabular-nums" suppressHydrationWarning><Icon name="clock" size={15} />{mmss(elapsed)}<span className="max-lg:hidden"> / {mmss(minutes * 60)}</span></span>
      </header>
      <div className="flex flex-1 flex-col gap-4 px-4 pb-6 lg:flex-row lg:px-8">
        <main id="main" className="flex min-w-0 flex-1 flex-col gap-2.5">
          {simulated ? (
            <>
              {tile(mentor, "Speaking", "bg-[#1D3A2A]", "text-[#BDE5C8]", true)}
              <div className="grid grid-cols-2 gap-2.5">{tile(first, "Camera on", "bg-[#4A2517]", "text-blush")}{tile("You (observing)", "Camera off", "bg-[#4A3A12]", "text-butter")}</div>
              <p className="text-center text-[12.5px] text-[#A39A8A]">Video is not set up on this server, so this is a preview of the room.</p>
            </>
          ) : <iframe title={`Video call with ${mentor}`} src={src} allow="camera; microphone; fullscreen; autoplay" className="min-h-[60vh] w-full flex-1 rounded-panel border-0 bg-black" />}
        </main>
        <aside className="flex w-full shrink-0 flex-col gap-3 rounded-[26px] bg-[#201B16] p-[18px] lg:w-[360px] lg:self-start">
          <h2 className="font-display text-[21px] font-extrabold leading-[1.12] tracking-[-.01em]">Guardian controls</h2>
          <p className="text-[14px] leading-normal text-[#D6CEBF]">You joined as an observer. {first} and {mentor.split(" ")[0]} can see you are here.</p>
          <form action={stepOutAction}><input type="hidden" name="askId" value={askId} /><button type="submit" className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-white/[.12] text-[15px] font-bold"><Icon name="clock" size={19} />Step out, stay reachable</button></form>
          <Link href="/settings/contact" className="flex h-[52px] items-center justify-center gap-2 rounded-full border-2 border-[#352E26] text-[15px] font-bold"><Icon name="clipboard" size={19} />Add a note for the team</Link>
          <form action={pauseFromCallAction} onSubmit={(e) => { if (!confirm(`Pause this connection? The call ends for everyone, ${first}'s account and open Asks are put on hold, and the safeguarding lead is alerted.`)) e.preventDefault(); }}>
            <input type="hidden" name="askId" value={askId} />
            <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#D8462F] text-[15px] font-bold text-white"><Icon name="pause" size={19} />Pause this connection</button>
          </form>
          <p className="text-[12.5px] leading-normal text-[#A39A8A]">Pausing ends the call, suspends {first}&apos;s account and open Asks, and alerts the safeguarding lead. You can resume later with the team.</p>
          {recorded && <p className="border-t border-white/10 pt-3 text-[12.5px] leading-normal text-[#A39A8A]">This call is recorded because {first} is under 18. You and our safeguarding lead can view it.</p>}
        </aside>
      </div>
    </div>
  );
}
