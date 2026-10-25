import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { ongoingView } from "@/lib/safety-user";
import { OngoingForm } from "./ongoing-form";

export const metadata = { title: "Ongoing mentorship" };
export const dynamic = "force-dynamic";

const DONE: Record<string, string> = { THREE_MONTHS: "You authorized three months.", ONE_MORE: "You authorized one more conversation.", NOT_NOW: "You chose not now." };

/** G6 Authorize ongoing mentorship. Never automatic: the young person asks, the team approves, then the guardian decides. */
export default async function Ongoing({ params }: { params: { askId: string } }) {
  const r = await guardianPage(`/guardian/ongoing/${params.askId}`);
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const v = await ongoingView(c.userId, params.askId);
  if (!v) redirect("/guardian");
  const rows: [string, string][] = [["Pattern", "One 30-minute conversation a month"], ["For", "Three months, then you decide again"], ["Recording", "On, and available to you any time"], ["Topic", v.topic]];
  const sees = <Card className="p-4"><h2 className="font-display text-[17px] font-extrabold leading-[1.12] tracking-[-.01em]">What {v.participantFirst} sees</h2><p className="mt-1.5 text-[14px] leading-normal text-bark">{v.decided ? DONE[v.decided] : `Waiting on your decision. ${v.participantFirst} is told you are thinking about it. Nothing is booked.`}</p></Card>;
  return (
    <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} tabs={!!v.decided} phone={{ back: "/guardian/approvals", title: "Ongoing mentorship" }}
      aside={<>{sees}<p className="text-[13.5px] leading-normal text-stone">Ongoing mentorship follows the family guidelines. It is never automatic, and you can pause or end it at any time.</p></>}>
      <div className="max-lg:hidden"><h1 className="font-display text-[36px] font-extrabold leading-[1.12] tracking-[-.01em]">Authorize ongoing mentorship?</h1></div>
      <h1 className="sr-only lg:hidden">Ongoing mentorship</h1>
      <div className="flex gap-3 rounded-[22px] bg-butter px-[18px] py-4 text-[14.5px] leading-[1.45] text-butter-ink"><Icon name="heart" size={24} className="shrink-0" /><p>{v.participantFirst} and {v.mentorFirst} would like to keep meeting. It is never automatic, and you decide.</p></div>
      <Card className="p-5">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em] max-lg:hidden">What is proposed</h2>
        <div className="mt-0 flex items-center gap-3.5 lg:mt-3">
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-mint font-display text-[19px] font-bold text-mint-ink">{v.mentorShort.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
          <div><p className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">{v.mentorShort}</p><p className="text-[14px] text-bark">{v.cleared ? "Cleared for young people" : "Verified mentor"}</p></div>
        </div>
        <dl className="mt-2.5 divide-y divide-line text-[14.5px]">{rows.map(([k, val]) => <div key={k} className="flex justify-between gap-3.5 py-[11px]"><dt className="text-stone">{k}</dt><dd className="text-right font-bold">{val}</dd></div>)}</dl>
      </Card>
      {v.decided ? <Card className="p-5 text-[15px]"><b>{DONE[v.decided]}</b> You can change this with the team at any time.</Card> : <OngoingForm askId={v.askId} />}
      <div className="flex flex-col gap-4 lg:hidden">{sees}</div>
    </GuardianShell>
  );
}
