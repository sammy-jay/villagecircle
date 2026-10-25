import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { guardianRecordings, withdrawView } from "@/lib/safety-user";
import { DataRequests, RequestRecording } from "../forms";
import { cn } from "@/lib/cn";

export const metadata = { title: "Calls and recordings" };
export const dynamic = "force-dynamic";

const FILTERS = [["all", "All"], ["upcoming", "Upcoming"], ["past", "Past"], ["recorded", "With recordings"]] as const;

/** G3 Conversations and recordings: who the young person has spoken with, when and about what. */
export default async function Recordings({ searchParams }: { searchParams: { f?: string } }) {
  const r = await guardianPage("/guardian/recordings");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const [data, w] = await Promise.all([guardianRecordings(c.userId), withdrawView(c.userId)]);
  const first = data?.first ?? "your young person";
  const items = data?.items ?? [];
  const f = FILTERS.some(([k]) => k === searchParams.f) ? searchParams.f! : "all";
  const shown = items.filter((i) => f === "all" || (f === "upcoming" ? i.upcoming : f === "past" ? !i.upcoming : i.ready));
  const held = items.filter((i) => !i.upcoming).length; const next = items.filter((i) => i.upcoming).at(-1); const kept = items.filter((i) => i.ready).length;

  const aside = (
    <>
      <Card className="p-5">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Who can see recordings</h2>
        <ul className="mt-2.5 flex flex-col gap-2 text-[14px]">{["You", `${first} and the mentor in the call`, "Our safeguarding lead"].map((x) => <li key={x} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-forest" />{x}</li>)}</ul>
        <p className="mt-3 text-[13px] text-stone">Recordings are stored securely and are never shared with anyone else.</p>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">So far</h2>
        <dl className="mt-2 divide-y divide-line text-[14.5px]">
          {[["Conversations held", String(held)], ["Next", next ? next.dateLabel.split(",")[0]! : "Nothing booked"], ["Recordings kept", String(kept)]].map(([k, v]) => <div key={k} className="flex justify-between gap-3 py-2.5"><dt className="text-stone">{k}</dt><dd className="font-bold">{v}</dd></div>)}
        </dl>
      </Card>
    </>
  );

  return (
    <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} aside={aside} phone={{ title: "Calls" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Conversations and recordings</h1><p className="mt-1 text-[16px] text-bark">Who {first} has spoken with, when, and about what.</p></div>
      <h1 className="sr-only lg:hidden">Calls</h1>
      <p className="text-[14.5px] leading-normal text-bark lg:hidden">Who {first} has spoken with, when, and about what. Recordings are visible only to you, the people in the call and our safeguarding lead.</p>
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => <Link key={k} href={k === "all" ? "/guardian/recordings" : `/guardian/recordings?f=${k}`} aria-current={f === k ? "page" : undefined} className={cn("rounded-full px-[13px] py-[7px] text-[13.5px] font-semibold", f === k ? "bg-forest text-forest-ink" : "bg-sand", k === "recorded" && "max-lg:hidden")}>{l}</Link>)}
      </nav>
      {shown.length ? shown.map((i) => {
        const [wd, rest] = [i.dateLabel.split(" ")[0]!.replace(",", "").slice(0, 3).toUpperCase(), i.dateLabel.split(" ").slice(1)];
        return (
          <Card key={i.id} className="flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3.5">
              <span className={cn("flex h-[72px] w-16 shrink-0 flex-col items-center justify-center rounded-[18px] font-display", i.upcoming ? "bg-butter text-butter-ink" : "bg-mint text-mint-ink")}>
                <span className="text-[12px] font-bold">{wd}</span><span className="text-[28px] font-extrabold leading-none">{rest[0]}</span><span className="text-[12px] font-bold">{rest[1]?.slice(0, 3).toUpperCase()}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  {i.upcoming ? <span className="inline-flex items-center gap-1.5 rounded-full bg-butter px-[13px] py-[7px] text-[12.5px] font-semibold text-butter-ink"><Icon name="clock" size={16} />Upcoming</span>
                    : i.ready ? <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-[13px] py-[7px] text-[12.5px] font-semibold text-mint-ink"><Icon name="check" size={16} />Ready to view</span>
                    : <span className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{i.expired ? "Recording expired" : "No recording yet"}</span>}
                  {i.ready && <span className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">Available for 90 days</span>}
                </div>
                <h2 className="mt-2 font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">{i.topic}, with {i.mentor}</h2>
              </div>
            </div>
            <p className="text-[14px] leading-normal text-bark">{i.upcoming ? `Recording will be available after it ends. You and ${i.mentor.split(" ")[0]} are told before it starts.` : `${i.attended}${i.attended.endsWith("attended") ? "." : ", not present."}`}</p>
            {i.nextSteps && <div className="rounded-field bg-sand px-3.5 py-3"><p className="text-[13px] font-bold text-bark">Agreed next steps</p><p className="mt-0.5 whitespace-pre-line text-[14.5px] leading-normal">{i.nextSteps}</p></div>}
            {i.ready ? <Link href={`/guardian/recordings/${i.id}`} className="dc-btn dc-btn-primary h-[46px]"><Icon name="play" size={18} />Watch recording</Link> : !i.expired && <RequestRecording connectionId={i.id} />}
          </Card>
        );
      }) : <Card className="p-5 text-[15px] text-bark">{f === "all" ? `No conversations yet. When ${first} has one, it shows here.` : "Nothing here."}</Card>}
      {w && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Export or delete</h2>
          <p className="text-[14.5px] leading-normal text-bark">You can export or delete {first}&apos;s data on request. Deleting closes the account and removes their Asks, notes and recordings after a short confirmation step.</p>
          <DataRequests participantId={w.participantId} first={first} />
        </Card>
      )}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </GuardianShell>
  );
}
