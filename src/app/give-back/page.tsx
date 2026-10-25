import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL, pastelAt } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { canGiveBack } from "@/lib/village";
import { cn } from "@/lib/cn";
import { GiveBackForm } from "./give-back-form";

export const metadata = { title: "Give back" };
export const dynamic = "force-dynamic";

/** EX17 Give back: small ways to help the next person, offered only after a completed conversation. */
export default async function GiveBack() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/give-back" : r.to);
  const g = await canGiveBack(r.ctx.userId);
  if (!g?.eligible) redirect("/home");
  const ways: [string, string, IconName, string][] = [
    ["Share your story", "A short note about what changed for you. The team reads it first.", "pencil", "/village/community?tab=stories"],
    ["Say thanks again", "Send a thank-you to a mentor who helped.", "heart", "/village/community"],
    ["Be a guest at a Q&A", "Tell people your path at an event.", "users", "/village/events"],
    ["Become a mentor one day", g.minor ? "When you are 18 and ready, you can apply." : "Apply when you are ready.", "rocket", g.minor ? "/become-a-mentor" : "/become-a-mentor"],
  ];
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} phone={{ back: "/home", title: "Give back" }}
      aside={<>
        <Card className="p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Why we ask</h2><p className="mt-2 text-[14px] leading-normal text-bark">The village renews itself from within. A college student can help a high school student, and today&apos;s participants become tomorrow&apos;s mentors.</p></Card>
        {g.minor && <section className="rounded-card bg-mint p-[18px] text-[13.5px] leading-normal text-mint-ink">You will join the mentor path later, once you are 18 and have been through the application and orientation. Until then this is just a note to us.</section>}
        <p className="text-[12.5px] text-stone">Everything you share is read by the team first, and you choose what name goes on it.</p>
      </>}>
      <section className="rounded-[30px] bg-butter p-6 text-butter-ink lg:rounded-[32px] lg:px-8 lg:py-[30px]">
        <p className="text-[12.5px] font-extrabold uppercase tracking-[.06em] opacity-85">Give back</p>
        <h1 className="mt-2 font-display text-[30px] font-extrabold leading-[1.06] tracking-[-.02em] lg:text-[38px]">You helped yourself. Want to help someone else?</h1>
        <p className="mt-2 text-[15.5px] leading-normal">Many people in the village started as someone who asked. When you are ready, there are small ways to help the next person. Nothing is required.</p>
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        {ways.map(([t, s, icon, href], i) => (
          <Link key={t} href={href} className={cn("flex flex-col gap-2 rounded-card p-5", PASTEL[pastelAt(i)].both)}>
            <span className="flex size-11 items-center justify-center rounded-[14px] bg-card"><Icon name={icon} size={24} /></span>
            <span className="font-display text-[19px] font-extrabold leading-[1.15]">{t}</span>
            <span className="text-[14px] leading-normal opacity-90">{s}</span>
          </Link>
        ))}
      </div>
      <GiveBackForm done={g.existing} />
    </ParticipantShell>
  );
}
