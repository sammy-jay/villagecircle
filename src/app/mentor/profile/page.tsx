import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Toggle } from "@/components/dc/client";
import { MentorShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { profileView } from "@/lib/mentor-profile";
import { EXPERTISE } from "@/lib/domain/expertise";
import { APP_TZ } from "@/lib/domain/scheduling";
import { cn } from "@/lib/cn";
import { listedAction, minorsAction } from "../actions";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Profile and privacy" };
export const dynamic = "force-dynamic";

const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: APP_TZ(), day: "numeric", month: "short", year: "numeric" }).format(d);

/** D28 Profile and privacy: what participants see, who can find you, and the five steps for under-18 Asks. */
export default async function Profile() {
  const r = await mentorPage("/mentor/profile", "profile");
  if ("to" in r) redirect(r.to);
  const p = await profileView(r.ctx.userId);
  if (!p) redirect("/mentor");
  const left = p.req.items.filter((i) => !i.done).length;
  const detail: Record<string, string> = {
    optIn: p.optedForMinors ? "You chose this." : "Not chosen yet.",
    screening: p.screening === "CLEAR" ? "Recorded by the team." : p.screening === "CONSIDER" ? "The team will contact you." : p.screeningStarted ? "In progress. We will email you." : "Not started.",
    orientation: p.orientationDone ? "Recorded by the team." : "Not recorded yet. The team records it once you attend.",
    conduct: p.codeOfConduct ? "You accepted it." : "Not accepted yet.",
    attestation: p.attestationDue ? `Valid until ${day(p.attestationDue)}.` : "Not signed yet.",
  };
  const act = (key: string) => key === "screening" && p.optedForMinors && p.approved && !p.screeningStarted ? ["screening", "Start screening"] : key === "conduct" && !p.codeOfConduct ? ["conduct", "Accept"] : key === "optIn" && !p.optedForMinors ? ["on", "Opt in"] : null;
  return (
    <MentorShell ctx={r.ctx} phone={{ back: "/mentor/settings", title: "Profile and privacy" }}>
      <div><h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] max-lg:sr-only lg:text-[40px]">Profile and privacy</h1><p className="mt-1 text-[16px] text-bark">What participants see about you, and who can be matched with you.</p></div>
      <Link href="/mentor/settings" className="flex items-center gap-3.5 rounded-card border border-line bg-card p-4 hover:bg-sand/50">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-butter text-butter-ink"><Icon name="settings" size={22} /></span>
        <span className="min-w-0 flex-1"><b className="block text-[15.5px]">Settings</b><span className="text-[13.5px] text-stone">Your hours, the yearly promise, notifications and your data</span></span>
        <Icon name="chevronRight" size={18} className="text-stone" />
      </Link>
      <Card className="flex flex-col gap-4 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[22px] font-extrabold">Your profile</h2><span className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", p.bioCleared ? "bg-mint text-mint-ink" : "bg-butter text-butter-ink")}>{p.bioCleared ? "Bio cleared" : "Bio with the team"}</span></div>
        <ProfileForm p={p} options={EXPERTISE.map(([value, label]) => ({ value, label }))} />
      </Card>
      <Card className="px-5 py-2 lg:px-6">
        <h2 className="pt-3 font-display text-[22px] font-extrabold">Privacy</h2>
        <form action={listedAction}>
          <Toggle name="listed" defaultChecked={p.listed} disabled={!p.canList} label="Show my first name and area of work" sub={p.canList ? "Participants see this in the directory and on your Ask answers." : "You can be listed once you are approved and have finished orientation."} />
          {p.canList && <button type="submit" className="mb-3 text-[13.5px] font-bold text-clay">Save</button>}
        </form>
        <p className="border-t border-line py-4 text-[13.5px] text-bark">No photo is shown. Young adults see your initials. Contact details are never shown.</p>
      </Card>
      <Card className="flex flex-col gap-3 p-5 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[22px] font-extrabold">Under-18 Asks</h2><span className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold", p.cleared ? "bg-mint text-mint-ink" : p.optedForMinors ? "bg-butter text-butter-ink" : "bg-sand")}>{p.cleared ? "Cleared" : p.optedForMinors ? "Opted in" : "Adults only"}</span></div>
        <p className="text-[14.5px] text-bark">You can be matched with under-18s once all five are done and the team clears you. Until then you only see adult Asks.</p>
        <ul className="divide-y divide-line">
          {p.req.items.map((i) => {
            const a = act(i.key);
            return (
              <li key={i.key} className="flex items-center gap-3 py-3">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", i.done ? "bg-forest text-forest-ink" : "border-2 border-dashed border-line")}>{i.done && <Icon name="check" size={16} />}</span>
                <span className="min-w-0 flex-1"><b className="block text-[15px]">{i.label}</b><span className="text-[13px] text-stone">{detail[i.key]}</span></span>
                {a ? <form action={minorsAction}><input type="hidden" name="what" value={a[0]} /><button type="submit" className="dc-btn dc-btn-soft h-10 px-4 text-[13.5px]">{a[1]}</button></form>
                  : i.key === "attestation" && !i.done ? <Link href="/mentor/reaffirm" className="text-[13.5px] font-bold text-clay">Sign</Link>
                  : <span className={cn("text-[13px] font-semibold", i.done ? "text-forest" : "text-stone")}>{i.done ? "Done" : "Outstanding"}</span>}
              </li>
            );
          })}
        </ul>
        {!p.cleared && p.optedForMinors && (
          <div className="flex flex-col gap-2">
            <form action={minorsAction}><input type="hidden" name="what" value="request" /><button type="submit" disabled={!p.req.ready || p.requested} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-50">{p.requested ? "Request sent to the team" : "Ask the team to clear me"}</button></form>
            <p className="text-[13px] text-stone">{p.requested ? "The team will tell you when they have decided." : left ? `The button turns on when every step is done. ${left} step${left === 1 ? "" : "s"} to go.` : "Every step is done. Send your request."}</p>
          </div>
        )}
        {p.optedForMinors && <form action={minorsAction}><input type="hidden" name="what" value="off" /><button type="submit" className="text-[14px] font-bold text-bark underline">Turn off under-18 Asks</button></form>}
      </Card>
    </MentorShell>
  );
}
