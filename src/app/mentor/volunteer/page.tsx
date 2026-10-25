import { redirect } from "next/navigation";
import { MentorShell } from "@/components/app/app-shell";
import { Card, DateTile } from "@/components/app/feed";
import { mentorPage } from "@/lib/mentor-ctx";
import { volunteerBoard } from "@/lib/village";
import { ProposeTalk, VolunteerButton } from "./forms";

export const metadata = { title: "Community" };
export const dynamic = "force-dynamic";

/** D26 Volunteer: event roles open to mentors, and "Share your story". Volunteering never changes how many Asks reach you. */
export default async function Volunteer() {
  const r = await mentorPage("/mentor/volunteer");
  if ("to" in r) redirect(r.to);
  const rows = await volunteerBoard(r.ctx.userId);
  const aside = (
    <>
      <Card className="flex flex-col gap-3 p-5"><h2 className="font-display text-[19px] font-extrabold">Share your story</h2><p className="text-[14px] leading-normal text-bark">Leadership and professional-development talks are organised by cohort. The team helps you shape yours.</p><ProposeTalk /></Card>
      <p className="rounded-card bg-butter p-5 text-[14px] leading-normal text-butter-ink">Volunteering never affects how many Asks reach you or who sees them.</p>
    </>
  );
  return (
    <MentorShell ctx={r.ctx} aside={aside} phone={{ title: "Community" }}>
      <div><h1 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-.02em] max-lg:sr-only lg:text-[40px]">Community</h1><p className="mt-1 text-[16px] text-bark">Volunteer for community events, webinars and panels. Give what you can, when you can.</p></div>
      {rows.length ? rows.map((x) => {
        const [d, mo] = x.when.split(",")[0]!.split(" ");
        return (
          <Card key={`${x.eventId}-${x.role}`} className="flex items-center gap-4 p-4 lg:p-5">
            <DateTile day={d ?? ""} month={(mo ?? "").toUpperCase()} />
            <div className="min-w-0 flex-1"><p className="text-[16px] font-extrabold leading-snug">{x.title}</p><p className="text-[13.5px] text-stone">{x.when} WAT</p><p className="mt-0.5 text-[13.5px] font-semibold">{x.role}, {x.left} place{x.left === 1 ? "" : "s"}</p></div>
            <VolunteerButton eventId={x.eventId} role={x.role} mine={x.mine} full={x.left === 0} />
          </Card>
        );
      }) : <Card className="p-6 text-center text-[15px] text-bark">No event roles are open right now. When the team plans an event that needs mentors, it appears here.</Card>}
      <div className="flex flex-col gap-4 lg:hidden">{aside}</div>
    </MentorShell>
  );
}
