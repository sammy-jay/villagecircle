import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { guardianPage } from "@/lib/guardian-ctx";
import { callView, joinCall } from "@/lib/connections";
import { GuardianRoom } from "./guardian-room";

export const metadata = { title: "In the call" };
export const dynamic = "force-dynamic";

/** CL3 In the call (guardian view), and P07-D3 when the guardian paused it (`?paused=1`). */
export default async function GuardianInCall({ params, searchParams }: { params: { id: string }; searchParams: { paused?: string } }) {
  const r = await guardianPage(`/guardian/asks/${params.id}/call`);
  if ("to" in r) redirect(r.to);
  const v = await callView(r.ctx.userId, params.id);
  if (!v?.start || v.role !== "GUARDIAN") redirect("/guardian");
  const title = `${v.topic} call with ${v.mentorShort}`;

  if (searchParams.paused === "1" || v.paused) {
    return (
      <div className="flex min-h-screen flex-col bg-[#14110D] text-[#F4EFE5]">
        <header className="px-4 pb-2 pt-3.5 lg:px-8 lg:py-4">
          <p className="text-[15.5px] font-extrabold lg:text-[18px]">{title}</p>
          <span className="mt-1 inline-block rounded-full bg-[#4A3A12] px-[13px] py-[7px] text-[11.5px] font-semibold text-butter">Guardian view</span>
        </header>
        <main id="main" className="mx-auto flex w-full max-w-[640px] flex-1 flex-col justify-center gap-4 px-4 pb-10">
          <span className="flex size-16 items-center justify-center rounded-[22px] bg-[#D8462F] text-white"><Icon name="pause" size={30} /></span>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-[-.02em] lg:text-[44px]">This conversation is paused</h1>
          <p className="text-[16px] leading-normal text-[#D6CEBF]">The call has ended. Our safeguarding lead has been alerted and will be in touch.</p>
          <section className="rounded-[26px] bg-[#201B16] p-5">
            <h2 className="font-display text-[19px] font-extrabold">What happens next</h2>
            <p className="mt-2 text-[14.5px] leading-normal text-[#D6CEBF]">A person on our team is looking into this. You will be told what happens next.</p>
            <p className="mt-2 text-[14.5px] leading-normal text-[#D6CEBF]">{v.participantFirst}&apos;s account and open Asks are on hold. You can resume later with the team. Nothing is deleted.</p>
          </section>
          <Link href="/guardian" className="dc-btn h-[52px] self-start bg-white/[.12] text-[#F4EFE5]">Back to my overview</Link>
        </main>
      </div>
    );
  }
  const j = await joinCall(r.ctx.userId, params.id);
  if (!j.ok) redirect(`/guardian/asks/${params.id}/call`);
  return <GuardianRoom askId={params.id} src={j.simulated ? "" : `${j.url}?t=${encodeURIComponent(j.token)}`} simulated={j.simulated} title={title} mentor={v.mentorShort} first={v.participantFirst} recorded={v.recorded} startIso={v.start.toISOString()} minutes={v.minutes} />;
}
