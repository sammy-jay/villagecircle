import { redirect } from "next/navigation";
import { requireRole } from "./auth";
import { MobileFrame, MHead, ConcernForm } from "@/components/dc/safety-user";

/** M16 Report a concern: any participant, mentor or guardian, from anywhere. */
export async function ReportPage({ askId }: { askId?: string }) {
  const g = await requireRole("PARTICIPANT", "MENTOR", "GUARDIAN"); if (!g.ok) redirect(g.reason === "mfa" ? "/mfa" : "/login");
  return (
    <MobileFrame>
      <MHead title="Report a concern" sub="You can do this from any Ask or conversation. You won't get in trouble for speaking up." />
      <ConcernForm askId={askId} />
    </MobileFrame>
  );
}
