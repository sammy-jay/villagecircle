import { redirect } from "next/navigation";
import { AdminMenu } from "@/components/dc/nav";
import { AdminShell, adminNav } from "@/components/app/admin-shell";
import { SignOutButton } from "@/components/app/sign-out";
import { adminPage } from "@/lib/admin-ctx";

export const metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

/** Phone "More" tab: the same nested menu as the desktop sidebar (ADMIN-MENU-M), for the groups the bar does not hold. */
export default async function More() {
  const r = await adminPage("/admin/more", "overview");
  if ("to" in r) redirect(r.to);
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Menu" }}>
      <div className="flex items-center gap-3 rounded-card border border-line bg-card p-4"><span className="flex size-12 items-center justify-center rounded-full bg-butter font-display text-[17px] font-bold text-butter-ink">{r.ctx.short.slice(0, 1)}</span><p className="leading-tight"><b className="block text-[16px]">{r.ctx.short}</b><span className="text-[13px] text-stone">Team console · {r.ctx.roleLabel}</span></p></div>
      <div className="rounded-card border border-line bg-card p-2"><AdminMenu groups={adminNav(r.ctx)} /></div>
      <SignOutButton to="/admin/sign-in" className="self-start" />
    </AdminShell>
  );
}
