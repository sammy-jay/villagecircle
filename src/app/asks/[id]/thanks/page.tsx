import { redirect } from "next/navigation";
import { ParticipantShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { participantPage } from "@/lib/participant-ctx";
import { afterParticipantView } from "@/lib/connections";
import { ThanksForm } from "../after/after-form";

export const metadata = { title: "Say thanks" };
export const dynamic = "force-dynamic";

/** N04 Thank a mentor, once the conversation has happened. */
export default async function Thanks({ params }: { params: { id: string } }) {
  const r = await participantPage({ allowPaused: true });
  if ("to" in r) redirect(r.to === "/login" ? `/login?next=/asks/${params.id}/thanks` : r.to);
  const v = await afterParticipantView(r.ctx.userId, params.id);
  if (!v || !["HELD", "COMPLETE"].includes(v.state)) redirect(`/asks/${params.id}`);
  if (v.thanked) redirect(`/asks/${params.id}?thanked=1`);
  const band = v.minor ? "ages 15 to 17" : "18 and over";
  const aside = (
    <Card className="p-[18px]">
      <h2 className="font-display text-[18px] font-extrabold leading-[1.12] tracking-[-.01em]">Who sees what</h2>
      <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-5 text-[13.5px] text-bark">
        <li>{v.mentorFirst} sees your first name, the chips and your message.</li>
        {v.minor && <li>Your guardian can read it too, because you are under 18.</li>}
        <li>Nobody sees your surname, school or contact details.</li>
        <li>The team reads every thank-you before it is seen by anyone else.</li>
      </ul>
    </Card>
  );
  return (
    <ParticipantShell ctx={{ name: r.ctx.name, openCount: r.ctx.openCount, unread: r.ctx.unread }} aside={aside} tabs={false} phone={{ back: `/asks/${params.id}`, title: `Thank ${v.mentorFirst}` }}>
      <div>
        <p className="text-[12.5px] font-extrabold tracking-[.04em] text-clay lg:text-[13px]">ASK CLOSED</p>
        <h1 className="mt-1.5 font-display text-[32px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">Say thanks to {v.mentorFirst}</h1>
        <p className="mt-1.5 text-[15.5px] text-bark">A thank-you takes under a minute and means a lot to a volunteer. The team reads it first.</p>
      </div>
      <ThanksForm askId={params.id} mentor={v.mentorFirst} me={r.ctx.first} band={band} />
    </ParticipantShell>
  );
}
