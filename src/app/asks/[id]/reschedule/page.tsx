import { redirect } from "next/navigation";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { trackerView } from "@/lib/connections";
import { whenLong } from "@/components/app/ask-journey";
import { cn } from "@/lib/cn";
import { ChangeForm } from "./change-form";

export const metadata = { title: "Change your conversation" };
export const dynamic = "force-dynamic";

/** EX1 Reschedule or cancel a booked conversation. One move is allowed; after that a team member steps in. */
export default async function Reschedule({ params }: { params: { id: string } }) {
  const r = await participantPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/reschedule` : r.to);
  const t = await trackerView(r.ctx.userId, params.id);
  if (!t || t.state !== "SCHEDULED" || !t.connection?.scheduledAt) redirect(`/asks/${params.id}`);
  const mentor = t.mentor?.shortName ?? "your mentor";
  const g = t.guardianName ?? "Your guardian";
  const steps: [string, string][] = [["You send the request", `${mentor} is told you asked to move it`], ["The team offers new times", "Usually within 1 business day"], ...(t.minor ? [[`${g} approves`, "The new time needs their yes, as before"] as [string, string]] : []), ["New invitation arrives", "The old link stops working"]];
  const aside = (
    <>
      <Card className="p-[18px]">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-3">{steps.map(([a, b], i) => <li key={a} className="flex items-start gap-3"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] font-display text-[15px] font-extrabold", PASTEL[(["butter", "mint", "blush", "butter"] as const)[i]!].both)}>{i + 1}</span><div><p className="text-[15px] font-extrabold">{a}</p><p className="text-[13.5px] text-stone">{b}</p></div></li>)}</ol>
      </Card>
      <Card className="p-[18px] text-[13.5px] leading-normal text-bark"><b className="text-ink">What {mentor} sees.</b> {r.ctx.first} asked to move your conversation. No reason is shared.</Card>
      {t.minor && <section className="rounded-card bg-mint p-[18px] text-[13.5px] leading-normal text-mint-ink"><b>What your guardian sees.</b> {g} is told straight away and approves the new time before it is booked.</section>}
      <p className="text-[12.5px] text-stone">You can move a conversation once. After that the team steps in.</p>
    </>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} tabs={false} phone={{ back: `/asks/${params.id}`, title: "Change time" }}>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">Change your conversation with {mentor}</h1>
      <Card className="flex items-center gap-3.5 p-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-mint font-display text-[17px] font-bold text-mint-ink">{mentor.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <div><p className="text-[16px] font-bold">{mentor}</p><p className="text-[13.5px] text-stone">{whenLong(t.connection.scheduledAt)} · {t.connection.minutes} minutes</p><p className="text-[13.5px] text-bark">{t.answers.q1}</p></div>
      </Card>
      <ChangeForm askId={params.id} mentor={mentor} />
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </ParticipantShell>
  );
}
