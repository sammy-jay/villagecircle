import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { ParticipantShell, PhoneIcons } from "@/components/app/app-shell";
import { Card, PASTEL, Pill, type Pastel } from "@/components/app/feed";
import { initials } from "@/components/dc";
import { participantPage } from "@/lib/participant-ctx";
import { db } from "@/lib/db";
import { unreadCount } from "@/lib/notifications";
import { listSavedResources, publicLibrary, upcomingEvents } from "@/lib/village";
import { goalsAndNotes } from "@/lib/insight";
import { cn } from "@/lib/cn";
import { SignOutButton } from "@/components/app/sign-out";

export const metadata = { title: "Me" };
export const dynamic = "force-dynamic";

const BAND: Record<string, string> = { AGE_13_15: "Age 15", AGE_16_17: "Age 16 to 17", ADULT: "18 and over" };

/** N06 Me: the phone hub for profile, goals, saved, settings and help. Desktop uses the side menu instead, so it sends people to Settings. */
export default async function Me() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/me" : r.to);
  const c = r.ctx;
  const u = await db.user.findUnique({ where: { id: c.userId }, include: { participant: true } });
  if (!u?.participant) redirect("/login");
  const [goals, saved, lib, events, unread, link] = await Promise.all([
    goalsAndNotes(c.userId), listSavedResources(c.userId), publicLibrary(), upcomingEvents(c.userId, 1), unreadCount(c.userId),
    db.guardianLink.findFirst({ where: { participantId: u.participant.id, active: true }, include: { guardian: { include: { user: true } } } }),
  ]);
  const p = u.participant;
  const parts = [!!p.cohort, p.interests.length > 0, (goals?.goals.length ?? 0) > 0, !!p.onboardedAt, !!u.region];
  const pct = Math.round((parts.filter(Boolean).length / parts.length) * 100);
  const missing = !parts[2] ? "Add a goal to finish" : !parts[1] ? "Add your interests" : !parts[0] ? "Pick your stage" : "";
  const where = [u.town, u.region].filter(Boolean).join(", ");
  const gName = link?.guardian.user.name.split(" ")[0];

  const tiles: [string, string, IconName, Pastel, string][] = [
    ["My goals", goals?.goals.length ? `${goals.goals.length} ${goals.goals.length === 1 ? "goal" : "goals"}` : "Set your first goal", "target", "mint", "/goals"],
    ["Saved", saved.length ? `${saved.length} saved tips and talks` : "Nothing saved yet", "bookmark", "butter", "/village/saved"],
    ["Library", lib[0] ? `New: ${lib[0].title}` : "Tips from mentors", "book", "blush", "/village/library"],
    ["Events", events[0] ? events[0].title : "Webinars and open houses", "calendar", "butter", "/village/events"],
  ];
  const rows: [string, string, IconName, Pastel, string, string?][] = [
    ["Notifications", unread ? `${unread} new` : "All caught up", "bell", "butter", "/notifications", unread ? String(unread) : undefined],
    ["My profile and privacy", "What mentors see about you", "user", "mint", "/settings/profile"],
    ["Notification preferences", "Email and in-app", "mail", "blush", "/settings/notifications"],
    ["Settings and account", "Guardian, data, turning 18", "settings", "butter", "/settings"],
    ["Help and contact the team", "We reply within 1 working day", "info", "mint", "/settings/contact"],
    ["Safety and crisis help", "Call 911 now, or report a concern", "shieldCheck", "blush", "/crisis"],
  ];

  return (
    <ParticipantShell ctx={{ name: c.name, openCount: c.openCount, unread: c.unread }} phone={{ title: "Me", right: <PhoneIcons unread={c.unread} search={false} /> }}>
      <h1 className="sr-only">Me</h1>
      <Card className="flex flex-col gap-3.5 p-[18px]">
        <div className="flex items-center gap-3.5">
          <span className="rounded-full bg-[linear-gradient(135deg,rgb(var(--clay)),#C99A2E)] p-[3px]"><span className="block rounded-full bg-paper p-[3px]"><span className="flex size-[76px] items-center justify-center rounded-full bg-blush font-display text-[27px] font-bold text-blush-ink">{initials(c.name)}</span></span></span>
          <div className="flex flex-col gap-1">
            <p className="font-display text-[26px] font-extrabold leading-[1.12] tracking-[-.01em]">{c.first}</p>
            <p className="text-[14px] text-bark">{[(u.ageBand && BAND[u.ageBand]) || "", where].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-[7px]">
          <div className="flex justify-between text-[13px]"><b>Profile {pct}% done</b>{missing && <span className="text-stone">{missing}</span>}</div>
          <div className="h-2.5 overflow-hidden rounded-[10px] bg-sand"><div className="h-full rounded-[inherit] bg-forest" style={{ width: `${pct}%` }} /></div>
        </div>
        <Link href="/settings/profile" className="dc-btn dc-btn-soft h-12 w-full"><Icon name="pencil" size={18} />Edit what mentors see</Link>
      </Card>
      {gName && link && (
        <Link href="/settings" className="flex items-center gap-3.5 rounded-card bg-mint px-[18px] py-4 text-mint-ink">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-butter font-display text-[17px] font-bold text-butter-ink">{initials(link.guardian.user.name)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><b className="text-[16px]">{gName} is linked</b><Pill icon="check" className="px-0">Linked</Pill></div>
            <p className="mt-[3px] text-[13.5px] leading-[1.4]">Your guardian. Approves your calls and times. Linked {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(link.createdAt)}.</p>
          </div>
          <Icon name="chevronRight" size={18} />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(([t, s, icon, tone, href]) => (
          <Link key={t} href={href} className={cn("rounded-card p-[18px]", PASTEL[tone].both)}>
            <span className="flex size-11 items-center justify-center rounded-[14px] bg-card"><Icon name={icon} size={24} /></span>
            <p className="mt-3 font-display text-[19px] font-extrabold leading-[1.15]">{t}</p>
            <p className="mt-1 line-clamp-2 text-[13.5px] leading-[1.4] opacity-85">{s}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-card border border-line bg-card px-4">
        {rows.map(([t, s, icon, tone, href, badge], i) => (
          <Link key={t} href={href} className={cn("flex items-center gap-3.5 py-3.5", i > 0 && "border-t border-line")}>
            <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", PASTEL[tone].both)}><Icon name={icon} size={23} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[15.5px] font-bold">{t}</span><span className="mt-0.5 block text-[13.5px] text-stone">{s}</span></span>
            {badge ? <span className="rounded-full bg-blush px-[13px] py-[7px] text-[13.5px] font-semibold text-blush-ink">{badge}</span> : <Icon name="chevronRight" size={18} className="text-stone" />}
          </Link>
        ))}
      </div>
      <SignOutButton className="h-[50px] w-full" />
      <p className="px-3 pt-0.5 text-center text-[12.5px] leading-[1.4] text-stone">The Village Circle · Not an emergency service. Call 911 in an emergency.</p>
    </ParticipantShell>
  );
}
