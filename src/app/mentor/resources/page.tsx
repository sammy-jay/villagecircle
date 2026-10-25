import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { myResources } from "@/lib/mentor-resources";
import { CREDIT_LABEL, RESOURCE_STATUS, TYPE_LABEL, matchesResourceFilter, parseFilter, resourceCounts, type ResourceFilter } from "@/lib/domain/mentor-resources";
import { cn } from "@/lib/cn";

export const metadata = { title: "Resources" };
export const dynamic = "force-dynamic";

const TONE = { warn: "bg-butter text-butter-ink", good: "bg-mint text-mint-ink", neutral: "bg-sand", bad: "bg-blush text-blush-ink" };
const TABS: [ResourceFilter, string][] = [["ALL", "All"], ["PENDING", "With the team"], ["APPROVED", "Published"], ["NOT_PUBLISHED", "Not published"]];

/** P03 Resources I have shared (and its empty state): where each one is now, with counts only, never reader names. */
export default async function Resources({ searchParams }: { searchParams: { tab?: string; sent?: string } }) {
  const r = await mentorPage("/mentor/resources");
  if ("to" in r) redirect(r.to);
  const rows = await myResources(r.ctx.userId);
  if (!rows) redirect("/mentor");
  const f = parseFilter(searchParams.tab);
  const counts = resourceCounts(rows.map((x) => x.state));
  const shown = rows.filter((x) => matchesResourceFilter(x.state, f));
  const helped = rows.reduce((n, x) => n + x.helped, 0);
  const aside = rows.length ? (
    <>
      <Card className="p-5"><p className="font-display text-[36px] font-extrabold leading-none">{helped}</p><p className="mt-1 text-[13.5px] text-bark">found helpful, across {counts.APPROVED} published</p></Card>
      <Card className="flex flex-col gap-2 p-5"><h2 className="font-display text-[19px] font-extrabold">Got something to share?</h2><p className="text-[14px] leading-normal text-bark">A short answer to a question you hear often helps more people than you might think.</p><Link href="/mentor/contribute" className="dc-btn dc-btn-primary mt-1 h-[48px]"><Icon name="plus" size={17} />Share something new</Link></Card>
      <p className="rounded-card bg-butter p-5 text-[14px] leading-normal text-butter-ink">You only ever see counts. Reader names are never shown to you.</p>
    </>
  ) : (
    <Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">How it works</h2><ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[14px] leading-normal text-bark"><li>Write a short answer, guide or template.</li><li>The team reads it before it is published.</li><li>You see where it is, and how many people found it helpful.</li></ol></Card>
  );
  return (
    <MentorShell ctx={r.ctx} aside={aside} phone={{ title: "Resources" }}>
      <div><h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] max-lg:sr-only lg:text-[40px]">Resources</h1><p className="mt-1 text-[16px] text-bark">Everything you have sent to the village, and where it is now. The team reads each one before it is published.</p></div>
      {searchParams.sent === "1" && <p role="status" className="flex items-center gap-2.5 rounded-[18px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink"><Icon name="check" size={18} />Sent to the team. We will tell you when it is live.</p>}
      <nav aria-label="Filter" className="-mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
        {TABS.map(([k, l]) => <Link key={k} href={k === "ALL" ? "/mentor/resources" : `/mentor/resources?tab=${k}`} aria-current={f === k ? "page" : undefined} className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] font-bold", f === k ? "bg-forest text-forest-ink" : "bg-sand")}>{l} {counts[k]}</Link>)}
      </nav>
      {!rows.length ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-[18px] bg-butter text-butter-ink"><Icon name="book" size={26} /></span>
          <h2 className="font-display text-[22px] font-extrabold">Nothing shared yet</h2>
          <p className="max-w-[420px] text-[14.5px] text-bark">A short answer to a question you hear often helps more people than you might think.</p>
          <Link href="/mentor/contribute" className="dc-btn dc-btn-primary h-[50px]"><Icon name="plus" size={18} />Leave something for the village</Link>
        </Card>
      ) : shown.length ? shown.map((x) => {
        const st = RESOURCE_STATUS[x.state];
        return (
          <Card key={x.id} className="flex flex-col gap-2.5 p-5 lg:px-6">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sand px-3 py-1.5 text-[12.5px] font-semibold">{TYPE_LABEL[x.type] ?? x.type}</span><span className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", TONE[st.tone])}>{st.label}</span><span className="text-[12.5px] text-stone">Sent {x.submitted}{x.published ? ` · Published ${x.published}` : ""}</span></div>
            <h2 className="font-display text-[19px] font-extrabold leading-snug">{x.title}</h2>
            <p className="text-[14.5px] leading-normal text-bark">{x.preview}</p>
            <p className="text-[13px] text-stone">{[x.topic && `Topic: ${x.topic}`, x.audience && `For: ${x.audience}`, `Credit: ${CREDIT_LABEL[x.credit] ?? x.credit}`].filter(Boolean).join(" · ")}</p>
            {x.state === "APPROVED" && x.helped > 0 && <p className="text-[14px] font-bold text-forest">{x.helped} {x.helped === 1 ? "person" : "people"} found this helpful</p>}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5"><span className="text-[13px] text-stone">{st.note}</span>{x.state === "APPROVED" && <Link href={`/library/${x.id}`} className="text-[14px] font-bold text-clay">View in the library</Link>}</div>
          </Card>
        );
      }) : <Card className="p-6 text-center text-[15px] text-bark">Nothing in this list.</Card>}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </MentorShell>
  );
}
