import { redirect } from "next/navigation";
import { AdminShell } from "@/components/app/admin-shell";
import { adminPage } from "@/lib/admin-ctx";
import { mentorApplication } from "@/lib/admin-applications-view";
import { MentorDetail } from "../detail";

export const metadata = { title: "Mentor application" };
export const dynamic = "force-dynamic";

/** A1 record on its own (the phone view, and links from search and notifications). */
export default async function MentorRecord({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/mentors/${params.id}`);
  if ("to" in r) redirect(r.to);
  const a = await mentorApplication(params.id);
  if (!a) redirect("/admin/mentors");
  return (
    <AdminShell ctx={r.ctx} phone={{ back: "/admin/mentors", title: a.person.short }}>
      <MentorDetail a={a} canDecide={r.ctx.perms.includes("applications.decide")} canClear={r.ctx.perms.includes("minors.clear")} />
    </AdminShell>
  );
}
