import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Panel, Pill, day } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { audienceCounts, recentBroadcasts, sendDueBroadcasts } from "@/lib/admin-ops";
import { AUDIENCES, AUDIENCE_LABEL } from "@/lib/domain/admin-ops";
import { tzLabel } from "@/lib/domain/scheduling";
import { broadcastPreviewAction } from "../content-actions";
import { BroadcastForm } from "./broadcast-form";

export const metadata = { title: "Broadcast" };
export const dynamic = "force-dynamic";

/** A17 Broadcast: one announcement to one group, previewed and counted before it goes. Only active accounts receive it. */
export default async function Broadcast() {
  const r = await adminPage("/admin/broadcast");
  if ("to" in r) redirect(r.to);
  await sendDueBroadcasts();
  const [counts, recent] = await Promise.all([audienceCounts(), recentBroadcasts()]);
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Broadcast" }}>
      <AdminHead eyebrow="Content" title="Broadcast" sub="Choose one group: Everyone, Mentors, Participants or Guardians." />
      <BroadcastForm action={broadcastPreviewAction} audiences={AUDIENCES.map((a) => ({ value: a, label: AUDIENCE_LABEL[a], n: counts[a] }))} zone={tzLabel(new Date())} />
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">Recent announcements</h2>
        {recent.length ? (
          <ul className="mt-2 divide-y divide-line">
            {recent.map((b) => <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span><b className="block text-[15px]">{b.subject}</b><span className="text-[13px] text-stone">{AUDIENCE_LABEL[b.audience]} · {b.status === "SENT" ? `sent to ${b.recipientCount} on ${day(b.at)}` : b.status === "SCHEDULED" ? `scheduled for ${day(b.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : "draft"}</span></span><Pill tone={b.status === "SENT" ? "mint" : b.status === "SCHEDULED" ? "butter" : "sand"}>{b.status.toLowerCase()}</Pill></li>)}
          </ul>
        ) : <p className="mt-2 text-[14.5px] text-bark">No announcements yet.</p>}
      </Panel>
    </AdminShell>
  );
}
