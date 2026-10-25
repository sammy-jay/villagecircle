import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { GuardianShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { guardianPage } from "@/lib/guardian-ctx";
import { recordingAccess } from "@/lib/safety-user";

export const metadata = { title: "Recording" };
export const dynamic = "force-dynamic";

/**
 * G3 "Watch recording". Access is checked (and logged) every time. Playback needs RECORDINGS_BASE_URL,
 * the private location the video service writes recordings to; without it the team sends recordings on request.
 */
export default async function Recording({ params }: { params: { id: string } }) {
  const r = await guardianPage(`/guardian/recordings/${params.id}`);
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const a = await recordingAccess(c.userId, ["GUARDIAN"], params.id);
  const base = process.env.RECORDINGS_BASE_URL?.replace(/\/$/, "");
  return (
    <GuardianShell name={c.name} of={c.kids.join(" and ") || undefined} approvals={c.needs} unread={c.unread} phone={{ back: "/guardian/recordings", title: "Recording" }}>
      <Link href="/guardian/recordings" className="dc-btn dc-btn-soft h-10 self-start px-4 text-[14.5px] max-lg:hidden"><Icon name="chevronLeft" size={18} />Calls and recordings</Link>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[36px]">Recording</h1>
      {!a ? <Card className="p-5 text-[15px] text-bark">This recording is not available. It may have passed its 90 days, or it is not ready yet.</Card>
        : base ? <video controls preload="metadata" className="aspect-video w-full rounded-card bg-ink" src={`${base}/${encodeURIComponent(a.key)}`} />
        : <Card className="p-5 text-[15px] text-bark">The recording is ready. Online playback is not switched on yet, so <Link href="/settings/contact" className="font-bold text-clay">ask the team</Link> and they will share it with you securely.</Card>}
      <p className="text-[13px] text-stone">Only you, the people in the call and our safeguarding lead can see recordings. Each view is logged.</p>
    </GuardianShell>
  );
}
