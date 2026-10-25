import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { RoleShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { settingsPage } from "@/lib/settings-ctx";
import { exportStatus } from "@/lib/safety-user";
import { RequestExport } from "./export-form";

export const metadata = { title: "Download my data" };
export const dynamic = "force-dynamic";

const size = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

/** EX14 Data export: request, then download as JSON or CSV for 7 days. Only this account's own data. */
export default async function DataExport() {
  const r = await settingsPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/settings/data" : r.to);
  const s = await exportStatus(r.ctx.userId);
  const rows: [string, string, string][] = [
    ["Profile and goals", "Name, interests, goals, visibility settings", "Included"],
    ["Your Asks and notes", "Every answer and next step you saved", "Included"],
    ["Conversation records", r.ctx.minor ? "Dates, mentors' first names, outcomes. Recordings stay with your guardian and the team." : "Dates, mentors' first names, outcomes", "Summary only"],
  ];
  const d = (x: Date) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(x);
  return (
    <RoleShell c={r.ctx} phone={{ back: "/settings", title: "Your data" }}>
      <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">{s ? "Your data export is ready" : "Download my data"}</h1>
      <p className="text-[15.5px] text-bark">{s ? `Requested ${d(s.requestedAt)}. The link works until ${d(s.expiresAt)}, and only on this account.` : "A file of everything we hold about you. It is ready straight away and works for 7 days."}</p>
      <Card className="p-5 lg:p-6">
        <h2 className="font-display text-[20px] font-extrabold leading-[1.12] tracking-[-.01em]">What is in your export</h2>
        <ul className="mt-2">{rows.map(([t, sub, tag], i) => <li key={t} className={i ? "flex items-center gap-3 border-t border-line py-3.5" : "flex items-center gap-3 py-3.5"}><div className="min-w-0 flex-1"><p className="text-[15.5px] font-bold">{t}</p><p className="text-[13.5px] text-stone">{sub}</p></div><span className={tag === "Included" ? "rounded-full bg-mint px-[11px] py-1.5 text-[12px] font-semibold text-mint-ink" : "rounded-full bg-butter px-[11px] py-1.5 text-[12px] font-semibold text-butter-ink"}>{tag}</span></li>)}</ul>
      </Card>
      {s ? (
        <div className="flex flex-wrap gap-2.5">
          <a href="/settings/export?format=json" className="dc-btn dc-btn-primary h-[52px]"><Icon name="download" size={18} />Download my data ({size(s.bytes)})</a>
          <a href="/settings/export?format=csv" className="dc-btn dc-btn-soft h-[52px]">As a spreadsheet (CSV)</a>
          <Link href="/settings" className="dc-btn dc-btn-ghost h-[52px]">Back</Link>
        </div>
      ) : <RequestExport />}
      {r.ctx.minor && <section className="rounded-card bg-mint p-[18px] text-[13.5px] leading-normal text-mint-ink">Because you are under 18, your guardian is told that you requested an export, and the file is also shared with them.</section>}
    </RoleShell>
  );
}
