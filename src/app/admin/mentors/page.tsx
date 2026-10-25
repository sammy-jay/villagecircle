import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Person, day } from "@/components/app/admin-kit";
import { adminPage } from "@/lib/admin-ctx";
import { mentorApplication, mentorApplications, type MentorTab } from "@/lib/admin-applications-view";
import { cn } from "@/lib/cn";
import { MentorDetail } from "./detail";

export const metadata = { title: "Mentor applications" };
export const dynamic = "force-dynamic";

const TABS: [MentorTab, string][] = [["PENDING", "Pending"], ["MORE_INFO", "More info requested"], ["APPROVED", "Approved"], ["DECLINED", "Declined"]];
const TONES = ["butter", "mint", "blush"] as const;

/** A1 Mentor applications: oldest first on the left, the open record on the right (its own page on the phone). */
export default async function Mentors({ searchParams }: { searchParams: { tab?: string; id?: string } }) {
  const r = await adminPage("/admin/mentors");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const tab = (TABS.find(([t]) => t === searchParams.tab)?.[0] ?? "PENDING") as MentorTab;
  const list = await mentorApplications(tab);
  const selId = searchParams.id ?? list.rows[0]?.id;
  const sel = selId ? await mentorApplication(selId) : null;
  const q = (t: MentorTab, id?: string) => `/admin/mentors?${new URLSearchParams({ ...(t !== "PENDING" ? { tab: t } : {}), ...(id ? { id } : {}) }).toString()}`;
  return (
    <AdminShell ctx={c} phone={{ title: "Mentors" }}>
      <AdminHead eyebrow="Applications" title="Mentor applications" sub="Bio and expertise first. Everything else is optional unless you need it." />
      <FilterPills items={TABS.map(([t, l]) => ({ href: q(t), label: `${l} (${list.counts[t]})`, on: t === tab }))} />
      {list.rows.length ? (
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div>
            <ul className="flex flex-col gap-1 rounded-card border border-line bg-card p-2">
              {list.rows.map((x, i) => (
                <li key={x.id}>
                  <Link href={q(tab, x.id)} aria-current={x.id === selId ? "true" : undefined} className={cn("block rounded-[18px] px-3 py-2.5 max-lg:hidden", x.id === selId ? "border border-ink/20 bg-sand" : "hover:bg-sand/60")}><Person name={x.name} tone={TONES[i % 3]} sub={<>{x.headline}<br />{x.appeal ? "Appeal · " : ""}Sent {day(x.sent)}</>} /></Link>
                  <Link href={`/admin/mentors/${x.id}`} className="block rounded-[18px] px-3 py-2.5 lg:hidden"><Person name={x.name} tone={TONES[i % 3]} sub={<>{x.headline}<br />{x.appeal ? "Appeal · " : ""}Sent {day(x.sent)}</>} /></Link>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px] text-stone">{tab === "PENDING" ? "Oldest first. The team decides within 5 business days." : "Newest first."}</p>
          </div>
          <div className="max-lg:hidden">{sel ? <MentorDetail a={sel} canDecide={c.perms.includes("applications.decide")} canClear={c.perms.includes("minors.clear")} /> : null}</div>
        </div>
      ) : <Empty title="Nothing here">{tab === "PENDING" ? "No mentor applications are waiting. New ones appear here oldest first." : "No applications in this list."}</Empty>}
    </AdminShell>
  );
}
