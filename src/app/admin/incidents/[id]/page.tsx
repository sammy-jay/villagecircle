import { redirect } from "next/navigation";
import { AdminShell } from "@/components/app/admin-shell";
import { adminPage } from "@/lib/admin-ctx";
import { incidentDetail } from "@/lib/admin-incidents";
import { canActOnIncident } from "@/lib/domain/admin-safety-1";
import { IncidentDetail } from "../detail";

export const metadata = { title: "Incident" };
export const dynamic = "force-dynamic";

/** A11 record on its own (phone, and links from notifications). */
export default async function IncidentRecord({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/incidents/${params.id}`);
  if ("to" in r) redirect(r.to);
  const i = await incidentDetail(params.id, r.ctx.roles);
  if (!i) redirect("/admin/incidents");
  return (
    <AdminShell ctx={r.ctx} phone={{ back: "/admin/incidents", title: `Incident #${i.ref}` }}>
      <IncidentDetail i={i} canAct={canActOnIncident(r.ctx.roles) && r.ctx.perms.includes("safety.act")} />
    </AdminShell>
  );
}
