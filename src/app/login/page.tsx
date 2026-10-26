import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { ArtCard, SplitShell } from "@/components/account/shells";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

const NOTICES: Record<string, string> = { verified: "Your email is confirmed. Log in to carry on.", reset: "Your password is changed. Log in with the new one." };

function Art() {
  return (
    <div className="flex flex-col items-center gap-[22px]">
      <div className="w-[420px] -rotate-2 rounded-card bg-butter p-[26px] text-butter-ink shadow-[0_14px_30px_rgba(40,30,10,.10)]">
        <div className="flex items-center gap-2.5"><span className="dc-otag">Your Ask</span><span className="text-[12.5px] font-bold">Step 3 of 4</span></div>
        <p className="mt-3.5 font-display text-[30px] font-extrabold leading-[1.12]">Dr Bisi stepped forward for your Ask</p>
        <p className="mt-2 text-[15px] leading-normal">Log in to pick a time.</p>
      </div>
      <ArtCard rotate={2} className="w-[380px]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-16 w-[58px] flex-none flex-col items-center justify-center rounded-[15px] bg-forest font-display text-forest-ink">
            <span className="text-[10.5px] font-bold tracking-[.06em]">SAT</span><span className="text-[21px] font-extrabold leading-none">24</span>
          </div>
          <div>
            <p className="text-caption font-extrabold text-clay">TOMORROW · 5:00 PM WAT</p>
            <p className="mt-0.5 font-display text-[20px] font-extrabold">Careers in tech: ask anything</p>
            <p className="mt-[3px] text-[13px] text-stone">64 going</p>
          </div>
        </div>
      </ArtCard>
      <div className="w-[340px] -rotate-[1.5deg] rounded-card bg-mint p-5 text-mint-ink shadow-[0_14px_30px_rgba(40,30,10,.10)]">
        <p className="font-display text-[21px] font-bold leading-[1.2]">&quot;Kind and direct. I left with a plan.&quot;</p>
        <p className="mt-2.5 text-[13px]"><b>Kemi, 16</b> thanked Dr Bisi</p>
      </div>
    </div>
  );
}

/** M9 / DK3 Log in. Already signed-in visitors go straight to their place. */
export default async function Login({ searchParams }: { searchParams: { next?: string; verified?: string; reset?: string } }) {
  if ((await getSession())?.user?.id) redirect("/after-login");
  const notice = searchParams.verified ? NOTICES.verified : searchParams.reset ? NOTICES.reset : undefined;
  return (
    <>
      <SplitShell width="half" panel="blush" art={<Art />}>
        <div className="lg:mt-11">
          <p className="text-[13px] font-extrabold tracking-[.04em] text-clay max-lg:hidden">LOG IN</p>
          <h1 className="font-display text-[42px] font-extrabold leading-none tracking-[-.01em] lg:mt-2 lg:text-[52px] lg:tracking-[-.02em]">Welcome back.</h1>
          <p className="mt-4 text-[16px] leading-normal text-bark lg:mt-2.5 lg:text-[17px]">Your Asks, mentors and approvals are where you left them.</p>
        </div>
        <LoginForm next={searchParams.next} notice={notice} />
        <div className="flex gap-3 rounded-[20px] bg-butter px-4 py-3.5 text-[13.5px] leading-[1.45] text-butter-ink">
          <Icon name="info" size={22} /><p><b>Guardian or mentor?</b> You log in here too. We take you to the right place.</p>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-caption text-stone"><Icon name="lock" size={14} />Using a shared computer? Log out when you finish.</p>
        <div className="h-24 lg:hidden" aria-hidden="true" />
      </SplitShell>
    </>
  );
}
