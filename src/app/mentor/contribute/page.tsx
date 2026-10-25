import { redirect } from "next/navigation";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { AUDIENCES, TYPES, contributeContext } from "@/lib/insight";
import { ContributeForm } from "./contribute-form";

export const metadata = { title: "Share something" };
export const dynamic = "force-dynamic";

/** D24 Contribute a resource: two steps, reviewed by the team before it is published, and credited the way the mentor chooses. */
export default async function Contribute({ searchParams }: { searchParams: { from?: string } }) {
  const r = await mentorPage("/mentor/contribute");
  if ("to" in r) redirect(r.to);
  const c = await contributeContext(r.ctx.userId);
  if (!c) redirect("/mentor");
  const from = c.conversations.find((x) => x.askId === searchParams.from);
  const draft = { type: "ARTICLE", title: "", body: "", topic: "", cohort: "HIGH_SCHOOL", credit: "FIRST", askId: "", ...(c.draft ?? {}), ...(from ? { askId: from.askId, body: c.draft?.body || from.notes } : {}) };
  return (
    <MentorShell ctx={r.ctx} phone={{ back: "/mentor/resources", title: "Share something" }} tabs={false}
      aside={<Card className="p-5"><h2 className="font-display text-[19px] font-extrabold">What makes a good one</h2><ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-normal text-bark"><li>Answer one question you hear often.</li><li>Write it like you talk.</li><li>Leave out names, schools and contact details.</li></ul></Card>}>
      <div><h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] lg:text-[40px]">Share something</h1><p className="mt-1 text-[16px] text-bark">Two steps. The team reads it before it is published, and you are credited.</p></div>
      <ContributeForm
        types={TYPES.map((t) => ({ value: t.v, label: t.hint }))}
        topics={c.topics.map((t) => ({ value: t.slug, label: t.name }))}
        audiences={AUDIENCES.map((a) => ({ value: a.v, label: a.label }))}
        credits={[{ value: "FULL", label: c.full }, { value: "FIRST", label: `${c.first} (first name only)` }, { value: "ANON", label: "Anonymous" }]}
        conversations={c.conversations}
        draft={draft}
      />
    </MentorShell>
  );
}
