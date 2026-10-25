import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon, type IconName } from "@/components/dc/icons";
import { RoleShell } from "@/components/app/app-shell";
import { Card, PASTEL, type Pastel } from "@/components/app/feed";
import { SignOutButton } from "@/components/app/sign-out";
import { settingsPage } from "@/lib/settings-ctx";
import { settingsData } from "@/lib/safety-user";
import { profileView } from "@/lib/participant-profile";
import { getPrefs } from "@/lib/notifications";
import { STAGES } from "@/components/account/options";
import { cancelDeletionAction } from "@/app/self-actions";
import { cn } from "@/lib/cn";

export const metadata = { title: "Settings and privacy" };
export const dynamic = "force-dynamic";

function Row({ href, icon, tone, title, sub, tail }: { href: string; icon: IconName; tone: Pastel; title: string; sub: string; tail?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3.5 py-3.5">
      <span className={cn("flex size-[46px] shrink-0 items-center justify-center rounded-[15px]", PASTEL[tone].both)}><Icon name={icon} size={23} /></span>
      <span className="min-w-0 flex-1"><span className="block text-[15.5px] font-bold">{title}</span><span className="mt-0.5 block text-[13.5px] text-stone">{sub}</span></span>
      {tail ? <span className="text-[13.5px] font-bold text-clay">{tail}</span> : <Icon name="chevronRight" size={18} className="text-stone" />}
    </Link>
  );
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="px-5 pb-1.5 pt-5"><h2 className="mb-1 font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">{title}</h2><div className="divide-y divide-line">{children}</div></Card>
);

/** D21 Settings and privacy. Participants get the full page; mentors and guardians see account, data and help. */
export default async function Settings() {
  const r = await settingsPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/settings" : r.to);
  const c = r.ctx;
  const [s, prof, prefs] = await Promise.all([settingsData(c.userId), c.role === "PARTICIPANT" ? profileView(c.userId) : null, getPrefs(c.userId)]);
  if (!s) redirect("/login");
  const stage = STAGES.find(([v]) => v === prof?.cohort)?.[1];
  const on = Object.values(prefs).filter(Boolean).length;

  const body = (
    <>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Settings and privacy</h1></div>
      <h1 className="sr-only lg:hidden">Settings and privacy</h1>
      {s.deletionPending && (
        <section className="flex flex-col gap-2.5 rounded-card bg-blush p-5 text-blush-ink">
          <h2 className="font-display text-[20px] font-extrabold">Your account is set to be deleted</h2>
          <p className="text-[14.5px]">On {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(s.deletionPending)}. You can change your mind until then.</p>
          <form action={cancelDeletionAction}><button type="submit" className="dc-btn dc-btn-forest h-11">Keep my account</button></form>
        </section>
      )}
      <Card className="flex items-center gap-4 p-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-blush font-display text-[22px] font-bold text-blush-ink">{s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
        <div className="min-w-0">
          <p className="font-display text-[24px] font-extrabold leading-[1.12] tracking-[-.01em]">{s.name.split(" ")[0]}</p>
          <p className="text-[13.5px] text-bark">{[prof && `Age ${prof.band}`, prof?.region].filter(Boolean).join(" · ")}{prof ? " · Mentors see your first name and age band only" : s.email}</p>
        </div>
      </Card>
      {prof && (
        <Section title="About you">
          <Row href="/settings/profile" icon="user" tone="mint" title="My profile and privacy" sub={[stage, prof.region, prof.interests.slice(0, 2).join(", ")].filter(Boolean).join(" · ") || "Choose what mentors see about you"} />
        </Section>
      )}
      <Section title="Notifications">
        <Row href="/settings/notifications" icon="bell" tone="butter" title="Notification preferences" sub={`${on} of 3 optional emails on. Ask updates and safety messages always come through.`} />
      </Section>
      <Section title="Your data">
        <Row href="/settings/data" icon="download" tone="mint" title="Download my data" sub="A file of everything we hold about you" tail="Request" />
        <Row href="/settings/delete" icon="trash" tone="blush" title="Delete my account" sub="30 days to change your mind" tail="Start" />
        {c.role === "PARTICIPANT" && c.minor && <Row href="/settings/turning-18" icon="sparkle" tone="butter" title="Turning 18?" sub="What changes and what you keep" tail="Read" />}
      </Section>
      {s.family && (
        <section className="flex items-center gap-3.5 rounded-card bg-mint p-5 text-mint-ink">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-butter font-display text-[17px] font-bold text-butter-ink">{s.family.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
          <div><p className="text-[16px] font-bold">{s.family.name}, your guardian</p><p className="mt-0.5 text-[13.5px] leading-[1.4]">Approves your Asks and calls. They can see your Asks and join your calls. They cannot see your private notes.</p></div>
        </section>
      )}
      <section className="rounded-card border border-line bg-card p-5 text-[13.5px] leading-normal text-bark"><b className="text-ink">Your privacy.</b> Mentors never see your last name, school or contact details. Nobody can message you directly.</section>
      <Section title="Help">
        <Row href="/settings/contact" icon="message" tone="butter" title="Talk to the team" sub="A real person replies within 1 working day" />
        <Row href="/faq" icon="info" tone="mint" title="FAQ" sub="Answers to common questions" />
        <Row href="/report" icon="flag" tone="blush" title="Report a concern" sub="Goes straight to our safeguarding lead" />
        <Row href="/crisis" icon="heart" tone="blush" title="Get support" sub="Call 112 in an emergency" />
      </Section>
      <SignOutButton className="h-[50px] w-full lg:w-auto lg:self-start" />
    </>
  );
  const phone = { back: c.role === "PARTICIPANT" ? "/me" : c.role === "MENTOR" ? "/mentor/settings" : undefined, title: "Settings" };
  return <RoleShell c={c} phone={phone} tabs={c.role !== "MENTOR"}>{body}</RoleShell>;
}
