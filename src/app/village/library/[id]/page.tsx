import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { HelpfulButton, SaveButton } from "@/components/app/feed-actions";
import { participantPage } from "@/lib/participant-ctx";
import { resourceDetail, savedState } from "@/lib/village";
import { db } from "@/lib/db";
import { RichText } from "@/components/app/rich-text";
import { headingsOf } from "@/lib/domain/rich-text";

export const metadata = { title: "Library" };
export const dynamic = "force-dynamic";

/** D19 Library resource for members: body, helpful, save, ask the author. */
export default async function Resource({ params }: { params: { id: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/village/library/${params.id}` : r.to);
  const d = await resourceDetail("MEMBER", params.id);
  if (!d) redirect("/village/library");
  const [st, helped] = await Promise.all([savedState(r.ctx.userId, params.id), db.resourceHelped.count({ where: { resourceId: params.id } })]);
  // D19 "In this article": the body's section headings, with the same anchors RichText gives them.
  const titled = headingsOf(d.body);
  const aside = (
    <>
      {titled.length > 1 && (
        <Card className="p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">In this article</h2>
          <ol className="mt-2.5 flex flex-col gap-2">{titled.map((p) => <li key={p.id}><a href={`#${p.id}`} className="text-[14px] font-semibold text-bark hover:text-ink">{p.text}</a></li>)}</ol></Card>
      )}
      {d.related.length > 0 && (
        <Card className="p-[18px]"><h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">More like this</h2>
          <ul className="mt-2.5 flex flex-col gap-2">{d.related.map((x) => <li key={x.id}><Link href={`/village/library/${x.id}`} className="text-[14px] font-bold">{x.title}</Link></li>)}</ul></Card>
      )}
      <p className="text-[12.5px] leading-[1.4] text-stone">Written by a mentor who has been checked and approved. Reviewed again every year.</p>
    </>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} phone={{ back: "/village/library", title: " " }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border-[1.5px] border-butter-ink px-3 py-[5px] text-[12.5px] font-bold text-butter-ink">{d.card.kind}</span>
        {d.card.topic && <span className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">{d.card.topic}</span>}
        <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-forest"><Icon name="shieldCheck" size={15} />Reviewed by the team</span>
      </div>
      <p className="text-[13px] text-stone">{d.reviewedLong}</p>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">{d.card.title}</h1>
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-mint font-display text-[15px] font-bold text-mint-ink">{d.card.credit.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <div><p className="text-[15px] font-bold">{d.card.credit}</p>{helped > 0 && <p className="text-[13px] text-stone">{helped} {helped === 1 ? "person" : "people"} found this helpful</p>}</div>
      </div>
      <article className="rounded-card border border-line bg-card p-5 lg:p-7">
        {d.body.trim() ? <RichText body={d.body} /> : <p className="text-[16px] text-bark">This resource is a file or recording. Ask the team if you cannot open it.</p>}
      </article>
      <div className="flex flex-wrap items-center gap-4">
        <HelpfulButton id={params.id} count={helped} />
        <SaveButton id={params.id} saved={st.saved} />
        <Link href={`/asks/new?about=${params.id}`} className="ml-auto inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="message" size={16} />Ask about this</Link>
      </div>
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </ParticipantShell>
  );
}
