import Link from "next/link";
import { redirect } from "next/navigation";
import { BarShell, PhoneBar } from "@/components/account/shells";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { MIN_AGE } from "@/lib/domain/age";
import { parseBackground } from "@/components/account/options";
import { OnboardingPhoneBar, OnboardingStep } from "./onboarding-form";

export const metadata = { title: "Build your profile" };
export const dynamic = "force-dynamic";

/** M12 / M12-D Profile builder, steps 1 to 3 (`?step=`). Works while waiting for a guardian too. */
export default async function Onboarding({ searchParams }: { searchParams: { step?: string } }) {
  const g = await requireRole("PARTICIPANT");
  if (!g.ok) redirect(g.reason === "mfa" ? "/mfa" : "/login?next=/onboarding");
  const u = await db.user.findUnique({ where: { id: g.user.id }, include: { participant: true } });
  if (!u?.participant) redirect("/login");
  const step = (Math.min(3, Math.max(1, Number(searchParams.step) || 1))) as 1 | 2 | 3;
  const first = u.name.split(" ")[0] || "friend";
  const band = u.ageBand === "ADULT" ? "18 or older" : `${MIN_AGE} to 17`;
  const finishLater = u.status === "PENDING_GUARDIAN" ? "/guardian-needed" : "/home";
  const bg = parseBackground(u.participant.communityBackground);
  return (
    <>
      <BarShell max={1080} className="lg:pt-9"
        right={<span>Welcome, {first}. <Link href={finishLater} className="font-bold text-clay">Save and finish later</Link></span>}
        phone={{ back: step > 1 ? `/onboarding?step=${step - 1}` : undefined, title: `Step ${step} of 3`, right: <Link href={finishLater} className="text-[13.5px] font-bold text-clay">Finish later</Link> }}>
        <div className="px-1 pt-2 lg:px-0 lg:pt-0">
          <OnboardingStep step={step} data={{ first, band, cohort: u.participant.cohort, country: u.countryOfResidence, region: u.region, town: u.town, interests: u.participant.interests, goal: u.participant.goalsText[0], goalMore: u.participant.goalsText[1], background: bg.picks, backgroundMore: bg.more, languages: u.languages }} />
        </div>
      </BarShell>
      <PhoneBar><OnboardingPhoneBar step={step} /></PhoneBar>
    </>
  );
}
