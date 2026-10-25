import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { guardianAuthorizations } from "@/lib/guardian-app";
import { APP_TZ } from "@/lib/domain/scheduling";
import { attendancePrefAction } from "../actions";
import { cn } from "@/lib/cn";

export const metadata = { title: "Authorizations" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "short", year: "numeric" }).format(d);

/** Authorizations: every yes and no this guardian has given, with the family attendance default. No board of its own; built from G1's side cards. */
export default async function Authorizations() {
  const r = await guardianPage("/guardian/authorizations");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const a = await guardianAuthorizations(c.userId);
  if (!a) redirect("/guardian");
  const aside = (
    <>
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">Family settings</h2>
        <p className="text-[13.5px] text-stone">Attendance preference for future conversations</p>
        <form action={attendancePrefAction} className="flex flex-col gap-2">
          {([["ATTEND", "I will attend each conversation"], ["REACHABLE", "I will be reachable, not present"]] as const).map(([v, l]) => (
            <button key={v} type="submit" name="pref" value={v} aria-pressed={a.pref === v} className={cn("flex items-center gap-3 rounded-field border-2 px-3.5 py-3 text-left text-[14.5px] font-semibold", a.pref === v ? "border-forest bg-mint/40" : "border-line bg-card")}>
              <span className={cn("flex size-[22px] shrink-0 items-center justify-center rounded-full border-2", a.pref === v ? "border-forest" : "border-line")}>{a.pref === v && <span className="size-2.5 rounded-full bg-forest" />}</span>{l}
            </button>
          ))}
        </form>
        <p className="text-[12.5px] text-stone">You can still change it for any single conversation from your overview.</p>
      </Card>
      <Card className="p-5"><h2 className="font-display text-[18px] font-extrabold">Withdraw consent</h2><p className="mt-1.5 text-[14px] text-bark">Pauses the account and any open Asks straight away. Nothing is deleted.</p><Link href="/guardian/withdraw" className="mt-3 inline-block text-[14.5px] font-bold text-clay">Learn what happens</Link></Card>
    </>
  );
  return (
    <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} aside={aside} phone={{ back: "/guardian", title: "Authorizations" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Authorizations</h1><p className="mt-1 text-[16px] text-bark">Every decision you have made, newest first.</p></div>
      <h1 className="sr-only lg:hidden">Authorizations</h1>
      {a.rows.length ? (
        <Card className="px-5 py-0">
          <ul className="divide-y divide-line">
            {a.rows.map((x) => (
              <li key={x.id}><Link href={`/guardian/approvals/${x.askId}`} className="flex items-center gap-3.5 py-3.5">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px]", x.approved ? "bg-mint text-mint-ink" : "bg-blush text-blush-ink")}><Icon name={x.approved ? "check" : "x"} size={22} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold">{x.kind === "ASK" ? `${x.approved ? "Authorized" : "Declined"} ${x.first}'s ${x.topic} Ask` : `${x.approved ? "Approved" : "Declined"} ${x.mentor ?? "the mentor"}${x.approved && x.scheduledAt ? ` for ${day(x.scheduledAt)}` : ""}`}</span>
                  <span className="mt-0.5 block text-[13px] text-stone">{day(x.at)}</span>
                </span>
                <Icon name="chevronRight" size={18} className="text-stone" />
              </Link></li>
            ))}
          </ul>
        </Card>
      ) : <Card className="p-5 text-[15px] text-bark">No decisions yet. When you authorize an Ask or approve a mentor and time, it is listed here.</Card>}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </GuardianShell>
  );
}
