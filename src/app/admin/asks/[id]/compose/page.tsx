import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, Pill } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { getReviewDetail } from "@/lib/review";
import { cn } from "@/lib/cn";
import { releaseAction, stepAction, summaryAction } from "../../../asks-actions";
import { StepBar } from "../step-bar";
import { Composer } from "./composer";

export const metadata = { title: "Compose summary" };
export const dynamic = "force-dynamic";

const ageText = (b: string) => (b === "15" ? "15" : b === "16-17" ? "16 to 17" : "18 and over");

/** A8 Steps E and F: compose the mentor-facing summary, then release it to chosen mentors from the shortlist. */
export default async function Compose({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/asks/${params.id}/compose`, "asks.release");
  if ("to" in r) redirect(r.to);
  const id = params.id;
  const d = await getReviewDetail(id);
  if (!d) redirect("/admin/asks");
  if (d.ask.state !== "IN_TEAM_REVIEW") redirect(`/admin/asks/${id}`);
  const approved = !!d.review?.summaryApprovedAt;
  const pending = d.shortlist.filter((s) => !s.releasedAt);
  const aside = (
    <>
      <Panel>
        <h2 className="font-display text-[19px] font-extrabold">What the participant wrote</h2>
        <p className="mt-2 text-[14.5px] leading-normal">{d.answers.q1}</p>
        {d.answers.q3 && <p className="mt-2 text-[14.5px] leading-normal text-bark">{d.answers.q3}</p>}
        <p className="mt-2 text-[12.5px] text-stone">Visible to the team{d.participant.minor ? " and the guardian" : ""} only.</p>
      </Panel>
      <Panel>
        <h2 className="font-display text-[19px] font-extrabold">What never goes through</h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[14px]">{["First name only, never a last name", "No school, employer or town", "No phone, email or social handle", "Age band, never a birth date"].map((x) => <li key={x} className="flex gap-2"><Icon name="lock" size={16} className="mt-0.5 shrink-0 text-forest" />{x}</li>)}</ul>
      </Panel>
    </>
  );
  return (
    <AdminShell ctx={r.ctx} aside={aside} phone={{ back: `/admin/asks/${id}`, title: "Compose summary" }}>
      <AdminHead eyebrow="Asks · Ask review" title="Compose the mentor summary" sub="Mentors see exactly what is in the preview. Names, schools, employers and contact details never go through." />
      <StepBar askId={id} done={d.review?.stepsDone ?? []} editable action={stepAction} />
      <Composer askId={id} topic={d.ask.topic} ageBand={ageText(d.participant.ageBand)} guardian={d.participant.minor ? (d.guardian?.attends ? "Will attend" : "Approves") : null} withheld={d.withheldAuto}
        initial={{ question: d.review?.summary?.question ?? "", help: d.review?.summary?.whatWouldHelp ?? "", sessionLength: d.review?.sessionLength ?? d.answers.sessionLength ?? 30, extra: (d.review?.withheld ?? []).join(", ") }} action={summaryAction} />
      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-[21px] font-extrabold">Step F. Release to mentors</h2><Pill tone={approved ? "mint" : "sand"} icon={approved ? "check" : "lock"}>{approved ? "Summary approved" : "Approve the summary first"}</Pill></div>
        {pending.length ? (
          <ActionForm action={releaseAction} className="mt-3" ok="Released. The mentors are told, with no names.">
            <input type="hidden" name="askId" value={id} />
            <ul className="divide-y divide-line">
              {pending.map((s, i) => (
                <li key={s.id}><label className="flex cursor-pointer items-center gap-3 py-3">
                  <input type="checkbox" name="mentor" value={s.mentorId} defaultChecked={i < 3} disabled={!approved} className="size-[22px] accent-[#2F6B4F]" />
                  <span className="min-w-0 flex-1"><b className="block text-[15.5px]">{s.name}</b><span className="text-[13px] text-bark">{s.headline} · fit {Math.round(s.score)} · {s.hoursLeft} hour{s.hoursLeft === 1 ? "" : "s"} left</span></span>
                  {s.minorsOk && <Pill tone="mint" icon="shieldCheck">Cleared for minors</Pill>}
                </label></li>
              ))}
            </ul>
            <Submit icon="send" disabled={!approved} className={cn("self-start")}>Release to the chosen mentors</Submit>
          </ActionForm>
        ) : <Note tone="sand" icon="users" className="mt-3">Nobody on the shortlist is waiting for release. Build or widen it on the review page.</Note>}
      </Panel>
    </AdminShell>
  );
}
