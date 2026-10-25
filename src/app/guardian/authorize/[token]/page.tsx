import Link from "next/link";
import { ArtCard, SplitShell, TiltTile } from "@/components/account/shells";
import { Note } from "@/components/forms/fields";
import { ButtonLink, initials } from "@/components/dc";
import { StepTrail } from "@/components/public/kit";
import { inviteView } from "@/lib/guardian";
import { LOCK_MINUTES } from "@/lib/domain/tokens";
import { AuthorizeFlow } from "./authorize-flow";
import { EmailCodeInstead, LockedTime, NeverShare, RenewLink } from "./invite-states";

export const metadata = { title: "Guardian authorization" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(d);
/** State icon: 76px on phone, 84px on desktop. */
const Tile = (p: Omit<Parameters<typeof TiltTile>[0], "size" | "className">) => <><TiltTile {...p} size={76} className="lg:hidden" /><TiltTile {...p} size={84} className="mt-6 max-lg:hidden" /></>;
const LogIn = ({ className }: { className?: string }) => <p className={className}>Already approved? <Link href="/login" className="font-bold text-clay">Log in</Link></p>;

/** The emailed guardian link. Valid: DK5 / M3 then M20. Expired: M19. Locked after 5 wrong codes: M21. */
export default async function Authorize({ params }: { params: { token: string } }) {
  const v = await inviteView(params.token);

  if (v.status === "OK") {
    return <AuthorizeFlow v={{ token: params.token, firstName: v.firstName, age: v.age, guardianName: v.guardianName, phoneHint: v.phoneHint, hasAccount: v.hasAccount, codeSent: v.codeSent }} />;
  }

  if (v.status === "EXPIRED") {
    const who = (size: 44 | 48) => (
      <div className="flex items-center gap-3">
        <span className="flex shrink-0 items-center justify-center rounded-full bg-blush font-display font-bold text-blush-ink" style={{ width: size, height: size, fontSize: size === 48 ? 17 : 16 }}>{initials(v.firstName)}</span>
        <div><p className="text-[16px] font-extrabold lg:text-[17px]">{v.firstName}</p><p className="text-[13px] text-stone lg:text-[13.5px]">{v.age != null && `Age ${v.age} · `}Awaiting your approval</p></div>
      </div>
    );
    const trail = (
      <StepTrail steps={[
        { title: "Link sent", sub: day(v.sentAt), state: "done" },
        { title: "Link expired", sub: day(v.expiresAt), state: "current" },
        { title: "New link", sub: "Ready when you ask", state: "next" },
      ]} />
    );
    return (
      <SplitShell panel="mint" center phone={{ title: " " }} art={
        <ArtCard rotate={-1.5} className="w-[400px] p-6">{who(48)}<div className="mt-4">{trail}</div></ArtCard>
      }>
        <Tile icon="clock" tone="butter" />
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[38px] font-extrabold leading-[1.04] lg:text-[48px] lg:leading-[1.02] lg:tracking-[-.02em]">This link has expired</h1>
          <p className="text-[16px] leading-normal text-bark lg:text-[16.5px]">For your child&apos;s safety, approval links stop working after 14 days.</p>
        </div>
        <Note tone="butter" icon="info"><b>Nothing has been approved.</b> Your child&apos;s account is on hold.</Note>
        <p className="text-[15px] leading-normal text-bark lg:hidden">We will send a new link to the email and mobile number you gave. If that is wrong, ask your child to correct it.</p>
        <div className="rounded-card border border-line bg-card p-[18px] lg:hidden">{who(44)}<div className="mt-3.5">{trail}</div></div>
        <RenewLink token={params.token} />
        <p className="text-[14.5px] leading-normal text-bark max-lg:hidden">We will send it to the email and mobile number you gave. If that is wrong, ask your child to correct it.</p>
        <LogIn className="text-center text-[13.5px] text-stone lg:text-[14.5px]" />
      </SplitShell>
    );
  }

  if (v.status === "LOCKED") {
    const until = (v.until ?? new Date()).toISOString();
    return (
      <SplitShell panel="blush" center phone={{ title: " " }} art={<LockedTime until={until} minutes={LOCK_MINUTES} variant="panel" />}>
        <Tile icon="lock" tone="blush" rotate={6} />
        <div className="flex flex-col gap-2.5">
          <h1 className="font-display text-[40px] font-extrabold leading-[1.04] lg:text-[50px] lg:leading-[1.02] lg:tracking-[-.02em]">Too many tries</h1>
          <p className="text-[16px] leading-normal text-bark lg:text-[16.5px]">To protect your child&apos;s account we have paused this step for {LOCK_MINUTES} minutes.</p>
        </div>
        <div className="max-lg:hidden"><LockedTime until={until} minutes={LOCK_MINUTES} variant="line" /></div>
        <div className="lg:hidden"><LockedTime until={until} minutes={LOCK_MINUTES} variant="card" /></div>
        <div className="lg:hidden"><NeverShare /></div>
        <EmailCodeInstead token={params.token} until={until} minutes={LOCK_MINUTES} />
        <ButtonLink href="/help#contact" variant="ghost" icon="message" className="h-[54px] w-full">Contact the team</ButtonLink>
        <div className="max-lg:hidden"><NeverShare /></div>
      </SplitShell>
    );
  }

  // USED, CLOSED or INVALID: nothing left to do on this link.
  const used = v.status === "USED";
  return (
    <SplitShell panel={used ? "mint" : "butter"} center phone={{ title: " " }} art={
      <ArtCard rotate={-2} className="w-[400px] p-6">
        <div className="flex items-center gap-3">
          <TiltTile icon={used ? "shieldCheck" : "info"} tone={used ? "mint" : "butter"} size={44} rotate={0} />
          <div><p className="text-[16px] font-extrabold">{used ? "Approval complete" : "Link closed"}</p><p className="text-[13.5px] text-stone">{used ? "You can manage everything from your guardian space" : "Ask your child to send a new invitation"}</p></div>
        </div>
      </ArtCard>
    }>
      <Tile icon={used ? "check" : "info"} tone={used ? "mint" : "butter"} />
      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[38px] font-extrabold leading-[1.04] lg:text-[48px] lg:leading-[1.02] lg:tracking-[-.02em]">{used ? "This approval is already done" : "This link no longer works"}</h1>
        <p className="text-[16px] leading-normal text-bark lg:text-[16.5px]">
          {used ? "Approval links work once. Log in to see your child's Asks, mentors and conversations."
            : "It may have been replaced by a newer invitation, or the request was declined. If your child still wants to join, they can send a new one from their account."}
        </p>
      </div>
      {used
        ? <ButtonLink href="/login" variant="primary" icon="arrowRight" className="h-14 w-full">Log in</ButtonLink>
        : <ButtonLink href="/help#contact" variant="ghost" icon="message" className="h-[54px] w-full">Contact the team</ButtonLink>}
      <NeverShare />
    </SplitShell>
  );
}
