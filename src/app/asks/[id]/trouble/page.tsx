import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { participantPage } from "@/lib/participant-ctx";
import { callView } from "@/lib/connections";
import { Trouble } from "./trouble";

export const metadata = { title: "Connection trouble" };
export const dynamic = "force-dynamic";

/** EX4 Connection trouble: the call time keeps running, so this page is quick and calm. */
export default async function TroublePage({ params }: { params: { id: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/trouble` : r.to);
  const v = await callView(r.ctx.userId, params.id);
  if (!v?.start) redirect(`/asks/${params.id}`);
  const left = Math.max(0, Math.round((v.start.getTime() + v.minutes * 60_000 - Date.now()) / 60_000));
  return (
    <div className="min-h-screen">
      <header className="flex h-[68px] items-center gap-6 border-b border-line bg-card px-4 lg:px-8">
        <Link href="/home" aria-label="The Village Circle, home"><Image src="/brand/logo.png" alt="The Village Circle" width={51} height={46} /></Link>
        <p className="truncate text-[15px] font-bold">{v.topic} call with {v.mentorShort}</p>
        <Link href="/settings/contact" className="ml-auto whitespace-nowrap text-[14.5px] text-stone max-lg:hidden">Need help? <b className="text-ink">Contact the team</b></Link>
      </header>
      <main id="main" className="mx-auto flex max-w-[1040px] flex-col gap-[18px] px-4 py-6 lg:px-6 lg:py-8">
        <section className="flex flex-col items-center gap-3.5 rounded-[32px] bg-[#1D1914] px-6 py-10 text-center text-white lg:rounded-[36px] lg:px-10 lg:py-11">
          <span className="flex size-[78px] items-center justify-center rounded-full border-[3px] border-[#E7A98F] text-[#E7A98F]"><Icon name="wifiOff" size={40} /></span>
          <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-.02em] lg:text-[44px]">We cannot connect you right now</h1>
          <p className="max-w-[560px] text-[16px] leading-normal text-[#D8D1C4] lg:text-[17px]">{v.mentorShort} has been told you are having trouble. Your conversation time keeps running while we sort this out.</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#2C2620] px-4 py-2 text-[14px] font-bold"><Icon name="clock" size={17} className="text-butter" /><span className="text-butter">{left} min left</span><span className="font-medium text-[#B7AE9F]">of your {v.minutes} minutes</span></p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link href={`/asks/${params.id}/room`} className="dc-btn dc-btn-primary h-[54px]"><Icon name="refresh" size={18} />Try again</Link>
            <Link href={`/asks/${params.id}/call`} className="inline-flex h-[54px] items-center gap-2 rounded-full border-2 border-[#6B6254] px-[22px] text-[15.5px] font-bold"><Icon name="video" size={18} />Test my camera and microphone</Link>
          </div>
        </section>
        <Trouble askId={params.id} mentor={v.mentorShort} />
        <div className="flex gap-3 rounded-[20px] bg-mint px-4 py-3.5 text-[13.5px] leading-[1.45] text-mint-ink"><Icon name="shieldCheck" size={22} className="shrink-0" /><p><b>Stay on the platform.</b> There is no phone or other meeting link to switch to. That keeps everyone safe.</p></div>
      </main>
    </div>
  );
}
