import { redirect } from "next/navigation";
import { AdminShell } from "@/components/app/admin-shell";
import { adminPage } from "@/lib/admin-ctx";
import { accountDetail } from "@/lib/admin-accounts";
import { canDeleteData } from "@/lib/domain/admin-safety-1";
import { AccountDetail } from "../detail";

export const metadata = { title: "Account" };
export const dynamic = "force-dynamic";

/** A16 account on its own (phone, and links from notifications). */
export default async function AccountRecord({ params }: { params: { id: string } }) {
  const r = await adminPage(`/admin/accounts/${params.id}`);
  if ("to" in r) redirect(r.to);
  const a = await accountDetail(params.id);
  if (!a) redirect("/admin/accounts");
  return (
    <AdminShell ctx={r.ctx} phone={{ back: "/admin/accounts", title: a.short }}>
      <AccountDetail a={a} canSuspend={r.ctx.perms.includes("accounts.suspend")} canDelete={canDeleteData(r.ctx.roles)} />
    </AdminShell>
  );
}
