import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AskTag, ASK_TAG, type AskTagKey } from "@/components/dc";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { offerFor } from "@/lib/insight";
import { offerAction } from "@/app/asks/actions";
import { cn } from "@/lib/cn";

export const metadata = { title: "From the team" };
export const dynamic = "force-dynamic";

/** EX18 Goals offer: after a few Asks on one subject, the team offers a goals conversation, or ongoing mentorship as a request. */
export default async function Offer({ params, searchParams }: { params: { id: string }; searchParams: { sent?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/offer` : r.to);
  const o = await offerFor(r.ctx.userId, params.id);
  if (!o) redirect(`/asks/${params.id}`);
  const sent = searchParams.sent;
  const choices: [string, string, string, IconLike][] = [
    ["GOALS", "A goals conversation with our team", `Thirty minutes to turn your questions into a plan${o.minor ? ", with your guardian invited" : ""}.`, "target"],
    ["ONGOING", "Ask about ongoing mentorship", `A longer relationship with one mentor.${o.minor ? " Your guardian must authorize it, and" : " It"} is never automatic.`, "users"],
  ];
  const recent = (
    <Card className="p-[18px]">
      <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Your recent Asks</h2>
      <ul className="mt-2.5 flex flex-col gap-2.5">{o.recent.map((a) => <li key={a.id} className="flex items-center justify-between gap-3"><Link href={`/asks/${a.id}`} className="text-[14.5px] font-bold">{a.title}</Link>{a.state in ASK_TAG && <AskTag state={a.state as AskTagKey} />}</li>)}</ul>
    </Card>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={recent} phone={{ back: `/asks/${params.id}`, title: "From the team" }}>
      <section className="rounded-[30px] bg-butter p-6 text-butter-ink lg:rounded-[32px] lg:px-8 lg:py-[30px]">
        <p className="text-[12.5px] font-extrabold uppercase tracking-[.06em] opacity-85">From the team</p>
        <h1 className="mt-2 font-display text-[30px] font-extrabold leading-[1.06] tracking-[-.02em] lg:text-[38px]">Let us talk about your bigger goal</h1>
        <p className="mt-2 text-[15.5px] leading-normal lg:text-[16.5px]">You have asked about {o.subject} a few times. A team member would like to help you make a plan.</p>
      </section>
      {sent ? (
        <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">{sent === "ongoing" ? "Thanks. The team will look at ongoing mentorship with you" : "Thanks. A team member will be in touch to book it"}{o.minor ? " and your guardian" : ""}. We added a goal to My goals.</p>
      ) : (
        <form action={offerAction} className="flex flex-col gap-4">
          <input type="hidden" name="askId" value={params.id} />
          <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-[-.01em]">Two ways forward</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {choices.map(([v, t, s, icon], i) => (
              <label key={v} className={cn("relative flex cursor-pointer flex-col gap-2 rounded-card p-5 has-[:checked]:shadow-[0_0_0_3px_rgb(var(--forest))]", i ? "bg-blush text-blush-ink" : "bg-mint text-mint-ink")}>
                <input type="radio" name="choice" value={v} defaultChecked={i === 0} className="sr-only" />
                <span className="flex size-11 items-center justify-center rounded-[14px] bg-card"><Icon name={icon} size={24} /></span>
                <span className="font-display text-[19px] font-extrabold leading-[1.15]">{t}</span>
                <span className="text-[14px] leading-normal opacity-90">{s}</span>
              </label>
            ))}
          </div>
          <div className="flex flex-col gap-2.5 lg:flex-row">
            <button type="submit" className="dc-btn dc-btn-primary h-[52px]"><Icon name="calendar" size={18} />Book a goals conversation</button>
            <Link href={`/asks/${params.id}`} className="dc-btn dc-btn-soft h-[52px]">Maybe later</Link>
          </div>
        </form>
      )}
      <div className="lg:hidden">{recent}</div>
    </ParticipantShell>
  );
}
type IconLike = "target" | "users";
