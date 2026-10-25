import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { BarShell, PhoneBar } from "@/components/account/shells";
import { LinkRows, OTag, StepTrail } from "@/components/public/kit";
import { initials } from "@/components/dc";
import { requireRole } from "@/lib/auth";
import { participantInvite } from "@/lib/guardian";
import { ChangeInvite, ResendInvite } from "./invite-controls";

export const metadata = { title: "Waiting for your guardian" };
export const dynamic = "force-dynamic";

const day = (d: Date, long = false) => new Intl.DateTimeFormat("en-GB", long ? { day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" }).format(d);

/** M13 / DK6 Waiting for guardian. The account is on hold until the guardian authorizes (BR-05). */
export default async function GuardianNeeded({ searchParams }: { searchParams: { change?: string } }) {
  const g = await requireRole("PARTICIPANT");
  if (!g.ok) redirect("/login?next=/guardian-needed");
  const v = await participantInvite(g.user.id);
  if (!v) redirect("/login");
  if (v.status !== "PENDING_GUARDIAN") redirect("/after-login");
  const inv = v.invite;
  const gf = inv?.guardianFirst ?? "your guardian";
  const now = Date.now();
  const trail = inv ? [
    { title: day(inv.sentAt), sub: "Details sent to your guardian", state: "done" as const },
    { title: day(inv.remindAt), sub: "We send a reminder", state: (now < inv.remindAt.getTime() ? "current" : "done") as "current" | "done" },
    { title: day(inv.expiresAt), sub: "The link expires. We will tell you both.", state: (now < inv.remindAt.getTime() ? "next" : "current") as "next" | "current" },
  ] : [];

  const wait = (
    <section className="dc-card px-[18px] pt-[18px] lg:px-6 lg:pt-6">
      <h2 className="font-display text-[19px] font-extrabold leading-[1.12] lg:text-[22px]">While you wait</h2>
      <LinkRows className="border-0 px-0" rows={[
        { href: "/library", icon: "book", tone: "mint", title: "Read tips from mentors", sub: "Short reads, no sign-up" },
        { href: "/#events", icon: "calendar", tone: "blush", title: "Join an event", sub: "Webinars and open houses" },
        { href: "/onboarding", icon: "user", tone: "butter", title: "Build your profile", sub: "Interests and a goal, if you like" },
      ]} />
    </section>
  );
  const lockNote = <div className="flex gap-3 rounded-[18px] bg-blush px-[18px] py-4 text-[14.5px] leading-[1.45] text-blush-ink lg:rounded-[20px]"><Icon name="lock" size={24} /><p>Until {gf} says yes, you cannot start an Ask or meet a mentor. The library and events are open to you.</p></div>;

  return (
    <>
      <BarShell max={1100}
        right={<div className="flex items-center gap-2.5"><span className="flex size-10 items-center justify-center rounded-full bg-blush font-display text-[14px] font-bold text-blush-ink">{initials(v.first)}</span><p className="text-[14px] leading-[1.25] text-ink"><b>{v.first}</b><br /><span className="text-stone">Account on hold</span></p></div>}
        phone={{ right: <span className="flex size-[38px] items-center justify-center rounded-full bg-blush font-display text-[14px] font-bold text-blush-ink">{initials(v.first)}</span> }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-7">
          <div className="flex min-w-0 flex-1 flex-col gap-4 lg:gap-5">
            <section className="rounded-[30px] bg-butter p-6 text-butter-ink lg:rounded-[36px] lg:px-10 lg:py-9">
              <OTag>Account on hold</OTag>
              <h1 className="mt-3.5 font-display text-[34px] font-extrabold leading-[1.04] lg:mt-4 lg:text-[54px] lg:leading-none lg:tracking-[-.02em]">Waiting for your guardian</h1>
              <p className="mt-2.5 max-w-[560px] text-[15.5px] leading-normal lg:mt-3 lg:text-[17px]">
                {inv ? <>We emailed and texted {gf} ({inv.relationship.toLowerCase()}) at {inv.emailMasked}. Once they say yes, your space opens up.</> : "Add your parent or guardian's details so we can ask them to say yes."}
              </p>
            </section>
            {inv && (
              <section className="dc-card p-5 lg:p-[26px]">
                <h2 className="mb-4 font-display text-[19px] font-extrabold leading-[1.12] lg:mb-[18px] lg:text-[22px]">Where things stand</h2>
                <StepTrail steps={trail} />
              </section>
            )}
            <div className="flex flex-wrap gap-3 max-lg:hidden">
              {inv && <ResendInvite guardianFirst={gf} />}
              <ChangeInvite initial={{ guardianName: inv?.guardianName ?? "", relationship: inv?.relationship ?? "" }} startOpen={!inv || !!searchParams.change} />
            </div>
            <div className="lg:hidden">{wait}</div>
            <div className="lg:hidden">{lockNote}</div>
            <p className="text-center text-[13.5px] leading-normal text-stone lg:hidden">Wrong email? <Link href="?change=1#change" className="font-bold text-clay">Change it</Link></p>
            {searchParams.change && <div id="change" className="flex flex-wrap gap-3 lg:hidden"><ChangeInvite initial={{ guardianName: inv?.guardianName ?? "", relationship: inv?.relationship ?? "" }} startOpen /></div>}
          </div>
          <div className="flex w-[380px] flex-none flex-col gap-5 max-lg:hidden">
            {wait}
            {lockNote}
            <section className="dc-card p-6">
              <span className="dc-pill bg-mint text-caption text-mint-ink"><Icon name="check" size={16} />After {gf} says yes</span>
              <h2 className="mt-3 font-display text-[22px] font-extrabold leading-[1.12]">Waiting for our team</h2>
              <p className="mt-1.5 text-[15px] leading-normal text-bark">Our team does a quick check, then opens your account. This usually takes up to two business days. We will email you.</p>
            </section>
          </div>
        </div>
      </BarShell>
      {inv && <PhoneBar><ResendInvite guardianFirst={gf} block /></PhoneBar>}
    </>
  );
}
