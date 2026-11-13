import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card, PASTEL, pastelAt } from "@/components/app/feed";
import { PhoneBar } from "@/components/account/shells";
import { participantPage } from "@/lib/participant-ctx";
import { mentorProfileFor } from "@/lib/village";
import { askMentorAction } from "@/app/participant-actions";
import { cn } from "@/lib/cn";
import { ScrollX } from "@/components/dc/scroll-x";

export const metadata = { title: "Mentor profile" };
export const dynamic = "force-dynamic";

/** D18 Mentor profile. Asking names the mentor in a new Ask; the team confirms the match. */
export default async function MentorProfile({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/village/directory/${params.id}` : r.to);
  const p = await mentorProfileFor(r.ctx.userId, params.id);
  if (!p || !("card" in p)) redirect("/village/directory");
  const m = p.card;
  const first = m.name.replace(/\s+\w\.$/, "");
  const ask = (cls: string) => (
    <form action={askMentorAction}><input type="hidden" name="mentorId" value={m.id} /><button type="submit" className={cn("dc-btn dc-btn-primary w-full", cls)}><Icon name="message" size={18} />Ask {first}</button></form>
  );
  const how: [string, string][] = [["Send an Ask", `Name ${first}. The team reads it first.`], ...(p.minor ? [["Guardian says yes", "Because you are under 18, we ask your guardian."] as [string, string]] : []), ["Pick a time", "Chat on video, in the app, for 30 or 60 minutes."]];

  const aside = (
    <>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">Ask {first}</h2>
        <p className="text-[14px] leading-normal text-bark">You send an Ask and name {first}. The team confirms the match{p.minor ? " and your guardian approves" : ""}.</p>
        {ask("h-[52px]")}
        <p className="text-center text-[12.5px] text-stone">No direct messages. Your name stays private.</p>
      </Card>
      <Card className="p-5">
        <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Good to know</h2>
        <ul className="mt-2.5 flex flex-col gap-2 text-[14px] text-bark">
          {["30 or 60 minute calls on video", m.gives, m.languages.join(" and "), m.verified ? "Background checked, safeguarding trained" : ""].filter(Boolean).map((x) => <li key={x} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-forest" />{x}</li>)}
        </ul>
      </Card>
      {p.similar.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Also in {m.area}</h2>
          <ul className="mt-3 flex flex-col gap-3">{p.similar.map((s, i) => <li key={s.id} className="flex items-center gap-3"><span className={cn("flex size-[42px] items-center justify-center rounded-full font-display text-[15px] font-bold", PASTEL[pastelAt(i + 1)].both)}>{s.initials}</span><div className="min-w-0 flex-1 text-[14px]"><b>{s.name}</b><p className="text-[12.5px] text-stone">{[s.role, s.country].filter(Boolean).join(" · ")}</p></div><Link href={`/village/directory/${s.id}`} className="rounded-full bg-sand px-[13px] py-[7px] text-[12.5px] font-semibold">View</Link></li>)}</ul>
        </Card>
      )}
      <p className="text-[13.5px] text-stone">Something wrong? <Link href="/report" className="font-bold text-clay">Report a concern</Link></p>
    </>
  );

  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} phone={{ back: "/village/directory", title: " " }}>
      {searchParams.error && <p role="alert" className="rounded-[18px] bg-blush px-4 py-3 text-[15px] font-semibold text-blush-ink">{searchParams.error}</p>}
      <section className="flex flex-col items-start gap-3 rounded-[28px] bg-mint p-5 text-mint-ink lg:flex-row lg:items-center lg:gap-6 lg:p-7">
        <span className="flex size-[92px] shrink-0 items-center justify-center rounded-full bg-card font-display text-[33px] font-bold">{m.initials}</span>
        <div className="flex flex-col gap-3">
          <div><h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[36px]">{m.name}</h1><p className="mt-1 text-[14.5px]">{[m.role, m.country, m.languages.join(", ")].filter(Boolean).join(" · ")}</p></div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-card px-[13px] py-[7px] text-[12.5px] font-semibold text-ink">Open to Asks this month</span>
            {m.clearedForYoung && <span className="rounded-full bg-card px-[13px] py-[7px] text-[12.5px] font-semibold text-ink">Meets under 18s with a guardian</span>}
            {m.verified && <span className="inline-flex items-center gap-1 rounded-full bg-card px-[13px] py-[7px] text-[12.5px] font-semibold text-ink"><Icon name="shieldCheck" size={14} />Background checked</span>}
          </div>
        </div>
      </section>
      {m.bio && <Card className="p-[18px] lg:p-6"><h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[22px]">About {first}</h2><p className="mt-2 text-[14.5px] leading-normal text-bark lg:text-[15.5px]">{m.bio}</p></Card>}
      {m.expertise.length > 0 && (
        <section><h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Ask me about</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">{m.expertise.map((e) => <span key={e} className="rounded-full bg-sand px-[13px] py-[7px] text-[13.5px] font-semibold">{e}</span>)}</div></section>
      )}
      <Card className="p-[18px] lg:hidden">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">How it works</h2>
        <ol className="mt-3.5 flex flex-col gap-3.5">{how.map(([a, b], i) => <li key={a} className="flex items-start gap-3.5"><span className={cn("flex size-[34px] shrink-0 items-center justify-center rounded-tile font-display text-[17px] font-extrabold", PASTEL[(["butter", "mint", "blush"] as const)[i]!].both)}>{i + 1}</span><div><p className="text-[15.5px] font-extrabold">{a}</p><p className="mt-0.5 text-[13.5px] leading-[1.4] text-bark">{b}</p></div></li>)}</ol>
      </Card>
      {p.tips.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between"><h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Tips by {first}</h2><Link href={`/village/library?q=${encodeURIComponent(m.name)}`} className="text-[13.5px] font-bold text-clay">See all</Link></div>
          <ScrollX label="tip" controlsClassName="lg:hidden" className="-mx-5 mt-2.5 flex gap-3 overflow-x-auto px-5 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0">
            {p.tips.map((t, i) => <Link key={t.id} href={`/village/library/${t.id}`} className={cn("min-h-[104px] w-[220px] shrink-0 rounded-[22px] p-4 lg:w-auto", PASTEL[(["butter", "blush", "mint"] as const)[i % 3]].both)}><span className="block font-display text-[17px] font-extrabold leading-[1.12]">{t.title}</span>{t.helped > 0 && <span className="mt-2 block text-[12.5px] opacity-80">{t.helped} found this helpful</span>}</Link>)}
          </ScrollX>
        </section>
      )}
      {p.thanks[0] && (
        <Card className="p-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-[13px] py-[7px] text-[12px] font-semibold text-mint-ink"><Icon name="shieldCheck" size={16} />Reviewed by the team</span>
          <p className="mt-2.5 font-display text-[18px] font-bold leading-[1.25]">{p.thanks[0].quote}</p>
          <p className="mt-2 text-[13px] text-stone">{p.thanks[0].who} · shared with permission</p>
        </Card>
      )}
      <PhoneBar>{ask("h-14")}<p className="mt-2 text-center text-[12px] text-stone">You name {first} in your Ask. The team confirms the match.</p></PhoneBar>
    </ParticipantShell>
  );
}
