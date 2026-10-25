import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { cn } from "@/lib/cn";
import { ContactForm } from "./contact-form";

export const metadata = { title: "Talk to the team" };
export const dynamic = "force-dynamic";

/** N11 Talk to the team. */
export default async function Contact() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/settings/contact" : r.to);
  const steps: [string, string][] = [["You send it", "Today"], ["A team member reads it", "Within 1 working day"], ["We reply in the app", r.ctx.minor ? "Your guardian can see it too" : "You get a notification"]];
  const aside = (
    <>
      <Card className="p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-3">{steps.map(([a, b], i) => <li key={a} className="flex items-start gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] font-display text-[15px] font-extrabold", PASTEL[(["butter", "mint", "blush"] as const)[i]!].both)}>{i + 1}</span><div><p className="text-[15px] font-extrabold">{a}</p><p className="text-[13.5px] text-stone">{b}</p></div></li>)}</ol>
      </Card>
      <section className="flex flex-col gap-2.5 rounded-card bg-blush p-[18px] text-blush-ink">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12]">Worried about someone?</h2>
        <p className="text-[13.5px] leading-normal">If a mentor or a message made you feel uncomfortable, report it. Nobody is told it was you.</p>
        <Link href="/report" className="inline-flex items-center gap-1.5 self-start rounded-full border-[1.5px] border-current px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="flag" size={16} />Report a concern</Link>
      </section>
      <p className="text-[12.5px] text-stone">We are not an emergency service. In an emergency call 112.</p>
    </>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} tabs={false} phone={{ back: "/me", title: "Talk to the team" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Talk to the team</h1><p className="mt-1 text-[16px] text-bark">A real person on our team reads every message.</p></div>
      <h1 className="sr-only lg:hidden">Talk to the team</h1>
      <section className="flex gap-3 rounded-card bg-blush p-5 text-blush-ink">
        <Icon name="heart" size={24} className="shrink-0" />
        <div><p className="font-display text-[19px] font-extrabold">Need help right now? Do not wait for us</p><p className="mt-1 text-[14.5px] leading-normal">If you are in danger or may hurt yourself, get help now. In Nigeria call <b>112</b>. You do not need to explain everything. Then tell an adult you trust.</p><Link href="/crisis" className="mt-2 inline-block font-bold underline">Get support now</Link></div>
      </section>
      <ContactForm />
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </ParticipantShell>
  );
}
