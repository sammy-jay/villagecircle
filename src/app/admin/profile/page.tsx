import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { SignOutButton } from "@/components/app/sign-out";
import { Icon } from "@/components/dc/icons";
import { initials } from "@/components/dc";
import { adminPage } from "@/lib/admin-ctx";
import { db } from "@/lib/db";

export const metadata = { title: "My profile" };
export const dynamic = "force-dynamic";

/** The team member's own account: who they are, their team role, sign-in safety, and sign out. Open to every team role. */
export default async function AdminProfile() {
  const r = await adminPage("/admin/profile", "overview");
  if ("to" in r) redirect(r.to);
  const u = await db.user.findUnique({ where: { id: r.ctx.userId }, select: { name: true, email: true, mfaEnabled: true, createdAt: true } });
  if (!u) redirect("/admin/sign-in");
  const since = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(u.createdAt);
  const rows: [string, string][] = [["Name", u.name], ["Email", u.email], ["Team role", r.ctx.roleLabel], ["On the team since", since]];
  return (
    <AdminShell ctx={r.ctx} wide={false} phone={{ back: "/admin/more", title: "My profile" }}>
      <AdminHead eyebrow="Your account" title="My profile" sub="Your details on the team console. Ask the program lead to change your name or team role." />

      <div className="flex items-center gap-4 rounded-card border border-line bg-card p-5">
        <span className="flex size-14 items-center justify-center rounded-full bg-butter font-display text-[20px] font-bold text-butter-ink" aria-hidden="true">{initials(u.name)}</span>
        <p className="leading-tight"><b className="block text-[18px]">{u.name}</b><span className="text-[14px] text-stone">Team console · {r.ctx.roleLabel}</span></p>
      </div>

      <dl className="divide-y divide-line rounded-card border border-line bg-card px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-44 shrink-0 text-[14px] font-semibold text-stone">{k}</dt>
            <dd className="min-w-0 break-words text-[15.5px] font-semibold">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-[20px] font-extrabold">Signing in</h2>
        <p className="flex items-center gap-2.5 text-[15px]"><Icon name={u.mfaEnabled ? "shieldCheck" : "info"} size={20} className={u.mfaEnabled ? "text-forest" : "text-clay"} />{u.mfaEnabled ? "Two-step sign-in is on." : "Two-step sign-in is not set up yet. You will be asked to set it up when you next sign in."}</p>
        <p className="text-[14.5px] text-bark">To change your password, enter your email on the next page and we send you a link. It works for one hour.</p>
        <Link href="/forgot" className="dc-btn dc-btn-soft self-start">Change my password</Link>
      </section>

      <SignOutButton to="/admin/sign-in" className="h-[50px] w-full lg:w-auto lg:self-start" />
    </AdminShell>
  );
}
