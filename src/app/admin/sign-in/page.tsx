import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { SplitShell } from "@/components/account/shells";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { pendingMfa } from "@/lib/admin-auth";
import { teamRoleOf } from "@/lib/domain/admin-perms";
import { TEAM_ROLE_LABEL } from "@/lib/domain/admin-safety-1";
import { shortName } from "@/lib/domain/views";
import { CodeStep, PasswordStep, SetupStep } from "./forms";

export const metadata = { title: "Team sign-in" };
export const dynamic = "force-dynamic";

/** A18 Team sign-in (password, then the second step) and A25 Set up two-step sign-in, which has no skip. */
export default async function TeamSignIn({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next?.startsWith("/admin") ? searchParams.next : "/admin";
  const s = await getSession();
  const team = !!s?.user?.id && (s.user.roles.includes("ADMIN") || s.user.roles.includes("SAFEGUARDING_LEAD"));
  if (s?.user?.id && !team) redirect("/after-login");
  if (team && s!.user.mfaPassed) redirect(next);
  const u = team ? await db.user.findUnique({ where: { id: s!.user.id }, select: { name: true, email: true, roles: true, mfaEnabled: true } }) : null;

  if (u && !u.mfaEnabled) {
    const m = await pendingMfa(s!.user.id);
    const member = await db.teamMember.findUnique({ where: { userId: s!.user.id } });
    return (
      <SplitShell width={700} panel="mint" center phone={{ title: "Team sign-in" }} art={
        <div className="flex w-full max-w-[440px] flex-col gap-4">
          <section className="rounded-[26px] bg-card p-6"><h2 className="font-display text-[20px] font-extrabold">Backup codes come next</h2><p className="mt-1.5 text-[14.5px] leading-normal text-bark">Once your first code works, you get eight backup codes. Each works once if you lose your phone.</p></section>
          <section className="flex gap-3 rounded-[24px] bg-butter p-5 text-butter-ink"><Icon name="lock" size={20} className="mt-0.5 shrink-0" /><div><h2 className="text-[16px] font-extrabold">Why every time?</h2><p className="mt-1 text-[14px] leading-normal">The team handles children&apos;s stories and contact details. A second step keeps them safe even if a password leaks.</p></div></section>
        </div>
      }>
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-sand px-3.5 py-2 text-[13.5px] font-semibold"><Icon name="user" size={15} />Signed in as {shortName(u.name)}, {TEAM_ROLE_LABEL[teamRoleOf(u.roles, member?.teamRole)]}</span>
        <h1 className="font-display text-[32px] font-extrabold leading-[1.08] tracking-[-.02em] lg:text-[44px]">Set up two-step sign-in</h1>
        <p className="text-[16px] leading-normal text-bark">Team accounts need a second step every time you sign in. It takes about two minutes. There is no skip.</p>
        {m ? <SetupStep next={next} qr={m.qr} setupKey={m.key} /> : <p className="text-[15px] text-clay">Refresh the page to continue.</p>}
      </SplitShell>
    );
  }

  return (
    <SplitShell panel="sand" center phone={{ title: "Team sign-in" }} art={
      <div className="flex w-full max-w-[430px] flex-col gap-4">
        <section className="rounded-[28px] bg-butter p-7 text-butter-ink">
          <div className="flex gap-2"><span className="rounded-full bg-card/70 px-3 py-1.5 text-[13px] font-semibold">Team only</span><span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3 py-1.5 text-[13px] font-semibold text-mint-ink"><Icon name="shieldCheck" size={14} />MFA on</span></div>
          <h2 className="mt-4 font-display text-[30px] font-extrabold leading-[1.1]">Every action you take is recorded.</h2>
          <p className="mt-3 text-[15px] leading-normal">So the whole team can trust the console, and so every family can trust us.</p>
        </section>
        <section className="rounded-[24px] bg-blush p-6 text-blush-ink"><h2 className="flex items-center gap-2 font-display text-[21px] font-extrabold"><Icon name="lock" size={19} />Names stay inside.</h2><p className="mt-1.5 text-[14.5px] leading-normal">Admin pages show names. Never copy them out of the console.</p></section>
      </div>
    }>
      <p className="text-[13px] font-extrabold uppercase tracking-[.06em] text-clay max-lg:hidden">Team sign-in</p>
      <h1 className="font-display text-[32px] font-extrabold leading-[1.08] tracking-[-.02em] lg:text-[44px]">Welcome back to the console.</h1>
      <p className="text-[16px] text-bark">For Village Circle staff and trusted volunteers.</p>
      {u ? <CodeStep email={u.email} next={next} /> : <PasswordStep next={next} />}
      <p className="text-[13.5px] leading-normal text-bark">Signing in means you have signed the confidentiality undertaking. Every action you take is recorded.</p>
      <p className="text-center text-[14.5px] text-bark">Need help? <Link href="/help" className="font-bold text-clay">Contact the team</Link></p>
    </SplitShell>
  );
}
