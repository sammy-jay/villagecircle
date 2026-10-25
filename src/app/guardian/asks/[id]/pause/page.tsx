import { redirect } from "next/navigation";
import { GuardianShell } from "@/components/app/app-shell";
import { settingsPage } from "@/lib/settings-ctx";
import { pauseView } from "@/lib/safety-user";
import { PauseForm } from "./pause-form";

export const metadata = { title: "Pause the connection" };
export const dynamic = "force-dynamic";

/** M24 Pause a connection: the guardian's emergency stop, shown over their overview. */
export default async function Pause({ params }: { params: { id: string } }) {
  const r = await settingsPage();
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/guardian/asks/${params.id}/pause` : r.to);
  if (r.ctx.role !== "GUARDIAN") redirect("/settings");
  const v = await pauseView(r.ctx.userId, params.id);
  if (!v) redirect("/guardian");
  const back = `/guardian/asks/${params.id}`;
  return (
    <GuardianShell name={r.ctx.name} of={r.ctx.kids.join(" and ") || undefined} approvals={r.ctx.needs} unread={r.ctx.unread} phone={{ title: "Overview" }}>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.02] tracking-[-.02em] lg:text-[40px]">{v.participantFirst}&apos;s week</h1>
      <section className="rounded-card border border-line bg-card p-4 text-[16px] leading-normal text-bark lg:p-[22px]">
        {v.mentorFirst ? `Connection with ${v.mentorFirst}` : "Open Ask"}{v.when && ` · ${v.booked ? "Booked" : "Offered"} for ${v.when}`}
      </section>
      <PauseForm askId={v.askId} first={v.participantFirst} back={back} />
    </GuardianShell>
  );
}
