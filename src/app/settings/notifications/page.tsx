import { redirect } from "next/navigation";
import { RoleShell } from "@/components/app/app-shell";
import { settingsPage } from "@/lib/settings-ctx";
import { getPrefs } from "@/lib/notifications";
import { PrefsForm } from "./prefs-form";

export const metadata = { title: "Notification preferences" };
export const dynamic = "force-dynamic";

/** N10 Notification preferences. */
export default async function Prefs() {
  const r = await settingsPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/settings/notifications" : r.to);
  const prefs = await getPrefs(r.ctx.userId);
  return (
    <RoleShell c={r.ctx} phone={{ back: "/settings", title: "Notifications" }}>
      <div className="max-lg:hidden"><h1 className="font-display text-[40px] font-extrabold leading-[1.12] tracking-[-.01em]">Notification preferences</h1><p className="mt-1 text-[16px] text-bark">Only what you need. Never a message from a stranger.</p></div>
      <h1 className="sr-only lg:hidden">Notification preferences</h1>
      <PrefsForm prefs={prefs} />
    </RoleShell>
  );
}
