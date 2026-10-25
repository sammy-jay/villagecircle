import { redirect } from "next/navigation";
import { ParticipantShell } from "@/components/app/app-shell";
import { participantPage } from "@/lib/participant-ctx";
import { profileView } from "@/lib/participant-profile";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "My profile and privacy" };
export const dynamic = "force-dynamic";

/** N07 My profile and privacy. */
export default async function Profile() {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/settings/profile" : r.to);
  const p = await profileView(r.ctx.userId);
  if (!p) redirect("/settings");
  const updatedAt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(p.updatedAt);
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} tabs={false} phone={{ back: "/settings", title: "Profile and privacy" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">My profile and privacy</h1><p className="mt-1 text-[16px] text-bark">Choose what mentors see about you.</p></div>
      <h1 className="sr-only lg:hidden">My profile and privacy</h1>
      <ProfileForm p={{ ...p, updatedAt }} minor={r.ctx.minor} />
    </ParticipantShell>
  );
}
