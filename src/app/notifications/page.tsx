import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { RoleShell } from "@/components/app/app-shell";
import { AdminShell } from "@/components/app/admin-shell";
import { Card, PASTEL, type Pastel } from "@/components/app/feed";
import { settingsPage } from "@/lib/settings-ctx";
import { adminPage } from "@/lib/admin-ctx";
import { getSession } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { APP_TZ } from "@/lib/domain/scheduling";
import { db } from "@/lib/db";
import { markAllReadAction, openNotificationAction } from "@/app/participant-actions";
import { cn } from "@/lib/cn";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

type Kind = "asks" | "calls" | "events" | "library" | "other";
const KIND_OF = (e: string): Kind =>
  e.startsWith("ask.") || e.startsWith("followup.") ? "asks"
  : e.startsWith("connection.") || e.startsWith("conversation.") || e.startsWith("recording.") ? "calls"
  : e.startsWith("event.") ? "events"
  : e.startsWith("resource.") ? "library" : "other";
const LOOK: Record<Kind, [IconName, Pastel, string]> = {
  asks: ["message", "butter", "/asks"], calls: ["video", "mint", "/asks"], events: ["calendar", "mint", "/village/events"], library: ["book", "butter", "/village/library"], other: ["bell", "blush", "/home"],
};
const special = (e: string): [IconName, Pastel, string] | null =>
  e.startsWith("thanks.") ? ["heart", "blush", "/village/community"] : e === "checkin.due" || e === "review.monthly" ? ["target", "blush", "/goals"] : e.endsWith("authorized") || e.endsWith("confirmed") ? ["check", "mint", "/asks"] : null;

const FILTERS: [string, string][] = [["all", "All"], ["asks", "Asks"], ["calls", "Calls"], ["events", "Events"], ["library", "Library"]];

/** Short time like the board: "12 min", "2 h", "Thu", "Mon 19". */
function short(d: Date, now: Date) {
  const mins = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)} h`;
  const days = Math.floor(mins / 1440);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), ...o }).format(d);
  return days < 7 ? f({ weekday: "short" }) : `${f({ weekday: "short" })} ${f({ day: "numeric" })}`;
}
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ() }).format(d);

/** NT1 Notifications, for every role: filters, grouped by day, and each one opens where it was sent from. Team members see it inside the console. */
export default async function Notifications({ searchParams }: { searchParams: { f?: string } }) {
  const s = await getSession();
  const team = !!s?.user?.roles.some((x) => x === "ADMIN" || x === "SAFEGUARDING_LEAD");
  const member = !!s?.user?.roles.some((x) => x === "PARTICIPANT" || x === "MENTOR" || x === "GUARDIAN");
  const t = team && !member ? await adminPage("/notifications", "overview") : null;
  if (t && "to" in t) redirect(t.to);
  const r = t ? null : await settingsPage();
  if (r && "to" in r) redirect(r.to === "/login" ? "/login?next=/notifications" : r.to);
  const userId = t && "ctx" in t ? t.ctx.userId : r && "ctx" in r ? r.ctx.userId : "";
  const role = t ? "TEAM" : r && "ctx" in r ? r.ctx.role : "PARTICIPANT";
  const home = role === "TEAM" ? "/admin" : role === "MENTOR" ? "/mentor" : role === "GUARDIAN" ? "/guardian" : "/home";
  const all = await listNotifications(userId, 60);
  const now = new Date();
  const f = FILTERS.some(([k]) => k === searchParams.f) ? searchParams.f! : "all";
  const rows = all.filter((n) => f === "all" || KIND_OF(n.event) === f);
  const unreadBy = (k: string) => all.filter((n) => n.unread && (k === "all" || KIND_OF(n.event) === k)).length;

  const today = dayKey(now); const yesterday = dayKey(new Date(now.getTime() - 86400_000));
  const groups: [string, typeof rows][] = [];
  for (const n of rows) {
    const k = dayKey(n.createdAt);
    const label = k === today ? "TODAY" : k === yesterday ? "YESTERDAY" : "EARLIER";
    const g = groups.at(-1);
    if (g && g[0] === label) g[1].push(n); else groups.push([label, [n]]);
  }

  const guardian = r && "ctx" in r && r.ctx.role === "PARTICIPANT" && r.ctx.minor ? await db.guardianLink.findFirst({ where: { active: true, participant: { userId } }, include: { guardian: { include: { user: true } } } }) : null;
  const aside = (
    <>
      <Card className="p-5">
        <h2 className="font-display text-[19px] font-extrabold leading-[1.12] tracking-[-.01em]">What we send</h2>
        <p className="mt-2 text-[14.5px] leading-normal text-bark">{role === "PARTICIPANT" ? "Only what you need: updates on your Ask, calls and a weekly tip. Never a message from a stranger." : role === "TEAM" ? "Queue alerts, incidents and anything waiting for a person on the team." : "Only what you need: updates on conversations and anything waiting for you."}</p>
        {role !== "TEAM" && <Link href="/settings/notifications" className="mt-3 inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="settings" size={16} />Change settings</Link>}
      </Card>
      {guardian && <div className="flex gap-3 rounded-[22px] bg-mint px-[18px] py-[15px] text-[13.5px] leading-[1.45] text-mint-ink"><Icon name="shieldCheck" size={22} className="shrink-0" /><p><b>Under 18?</b> {guardian.guardian.user.name.split(" ")[0]} also gets a note when a call is booked or changed.</p></div>}
    </>
  );

  const body = (
    <>
      <div className="flex items-center justify-between max-lg:hidden">
        <h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Notifications</h1>
        {unreadBy("all") > 0 && <form action={markAllReadAction}><button type="submit" className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line px-[13px] py-[7px] text-[13.5px] font-semibold"><Icon name="check" size={16} />Mark all as read</button></form>}
      </div>
      <nav aria-label="Filter" className="flex flex-wrap items-center gap-2">
        {FILTERS.map(([k, label]) => {
          const n = unreadBy(k); const on = k === f;
          return <Link key={k} href={k === "all" ? "/notifications" : `/notifications?f=${k}`} aria-current={on ? "page" : undefined} className={cn("rounded-full px-[13px] py-[7px] text-[13.5px] font-semibold", on ? "bg-forest text-forest-ink" : "bg-sand", k === "calls" && "max-lg:hidden")}>{label}{n > 0 && <span className="max-lg:hidden"> {n}</span>}</Link>;
        })}
      </nav>
      {groups.map(([label, list]) => (
        <section key={label} className="flex flex-col gap-2.5 lg:gap-[18px]">
          <h2 className="mt-1.5 text-[12.5px] font-extrabold tracking-[.06em] text-stone lg:-mb-1.5 lg:text-[13px] lg:tracking-[.05em]">{label}</h2>
          {list.map((n) => {
            const kind = KIND_OF(n.event); const [icon, tone, guess] = special(n.event) ?? LOOK[kind];
            const to = n.link ?? (role === "PARTICIPANT" ? guess : home);
            return (
              <form key={n.id} action={openNotificationAction}>
                <input type="hidden" name="id" value={n.id} /><input type="hidden" name="to" value={to} />
                <button type="submit" className="flex w-full items-center gap-3 rounded-[22px] border border-line bg-card p-3.5 text-left lg:gap-4 lg:px-[18px] lg:py-4">
                  <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-[16px] lg:size-[52px]", PASTEL[tone].both)}><Icon name={icon} size={24} /></span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-[15.5px] leading-[1.25] lg:text-[16.5px]", n.unread ? "font-extrabold" : "font-bold")}>{n.title}</span>
                    <span className="mt-0.5 block text-[13.5px] text-stone">{n.body}</span>
                  </span>
                  <span className="flex flex-col items-end gap-2 text-[12.5px] text-stone lg:flex-row lg:items-center lg:gap-3">
                    {short(n.createdAt, now)}{n.unread && <span className="size-2.5 rounded-full bg-clay" aria-label="Unread" />}
                  </span>
                </button>
              </form>
            );
          })}
        </section>
      ))}
      {rows.length ? <p className="py-1.5 text-center text-[13.5px] text-stone">You are all caught up. We keep 30 days of notifications.</p> : <Card className="flex flex-col items-center gap-2 p-6 text-center"><Icon name="bell" size={28} className="text-stone" /><p className="text-[15px] text-bark">Nothing here yet. Updates on your Asks, calls and events will show up here.</p></Card>}
      {role !== "TEAM" && (
        <div className="rounded-card border border-line bg-card p-3.5 lg:hidden">
          <div className="flex items-center gap-3"><Icon name="bell" size={22} className="text-stone" /><p className="flex-1 text-[13.5px] leading-[1.4]">Choose what we send you and how.</p><Link href="/settings/notifications" className="text-[13.5px] font-bold text-clay">Change</Link></div>
        </div>
      )}
    </>
  );
  if (t && "ctx" in t) return <AdminShell ctx={t.ctx} aside={aside} phone={{ back: "/admin", title: "Notifications" }}>{body}</AdminShell>;
  return <RoleShell c={(r as { ctx: Parameters<typeof RoleShell>[0]["c"] }).ctx} aside={aside} phone={{ back: role === "PARTICIPANT" ? "/home" : home, title: "Notifications" }} tabs={role !== "MENTOR"}>{body}</RoleShell>;
}
