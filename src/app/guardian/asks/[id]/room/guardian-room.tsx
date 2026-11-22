"use client";

import Link from "next/link";
import { Icon } from "@/components/dc/icons";
import { useConfirmSubmit } from "@/components/app/confirm";
import { CallRoom } from "@/components/app/call/call-room";
import { pauseFromCallAction, stepOutAction } from "../../../actions";

/**
 * CL3 / P07-D2 In the call, guardian view: the same call screen as everyone, joined as an observer (camera and
 * microphone off), with the guardian controls beside it (in a sheet on the phone). Leaving is "step out, stay reachable".
 */
export function GuardianRoom({ askId, url, token, simulated, title, mentor, first, recorded, startIso, minutes }: {
  askId: string; url: string; token: string; simulated: boolean; title: string; mentor: string; first: string; recorded: boolean; startIso: string; minutes: number;
}) {
  const pausing = useConfirmSubmit({ title: "Pause this connection?", body: `The call ends for everyone, ${first}'s account and open Asks are put on hold, and the safeguarding lead is alerted.`, confirmLabel: "Pause connection", danger: true });
  const panel = (
    <>
      <section className="flex flex-col gap-2 rounded-[22px] bg-white/[.06] p-4">
        <span className="self-start rounded-full bg-[#4A3A12] px-3 py-1.5 text-[12px] font-semibold text-butter">Guardian view</span>
        <h2 className="font-display text-[19px] font-extrabold leading-[1.15]">You are observing</h2>
        <p className="text-[14px] leading-normal text-[#D6CEBF]">{first} and {mentor.split(" ")[0]} can see you are here. Your camera is off. Unmute if you need to say something.</p>
      </section>
      <Link href="/settings/contact" className="flex h-[52px] items-center justify-center gap-2 rounded-full border-2 border-white/20 text-[15px] font-bold"><Icon name="clipboard" size={19} />Add a note for the team</Link>
      <form action={pauseFromCallAction} onSubmit={pausing.onSubmit}>
        {pausing.dialog}
        <input type="hidden" name="askId" value={askId} />
        <button type="submit" className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#D8462F] text-[15px] font-bold text-white"><Icon name="pause" size={19} />Pause this connection</button>
      </form>
      <p className="text-[12.5px] leading-normal text-[#A39A8A]">Pausing ends the call, suspends {first}&apos;s account and open Asks, and alerts the safeguarding lead. You can resume later with the team.</p>
      {recorded && <p className="border-t border-white/10 pt-3 text-[12.5px] leading-normal text-[#A39A8A]">This call is recorded because {first} is under 18. You and our safeguarding lead can view it.</p>}
    </>
  );
  return (
    <CallRoom askId={askId} url={url} token={token} simulated={simulated} title={title} other={`${first} and ${mentor.split(" ")[0]}`} role="GUARDIAN" recorded={recorded} startIso={startIso} minutes={minutes}
      leave={stepOutAction} panel={panel} panelLabel="Guardian controls"
      leaveConfirm={{ title: "Step out of the call?", body: `The conversation carries on. You stay reachable, and you can come back while it is open.`, confirmLabel: "Step out" }} />
  );
}
