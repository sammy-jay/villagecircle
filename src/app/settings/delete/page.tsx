import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { RoleShell } from "@/components/app/app-shell";
import { Card } from "@/components/app/feed";
import { settingsPage } from "@/lib/settings-ctx";
import { settingsData } from "@/lib/safety-user";
import { DELETE_GRACE_DAYS } from "@/lib/domain/safety-user";
import { cancelDeletionAction } from "@/app/self-actions";
import { DeleteForm } from "./delete-form";

export const metadata = { title: "Delete my account" };
export const dynamic = "force-dynamic";

/** EX15 Delete my account: confirm, then a 30-day grace period. If one is already pending, show it with "Keep my account". */
export default async function Delete() {
  const r = await settingsPage();
  if ("to" in r) redirect(r.to === "/login" ? "/login?next=/settings/delete" : r.to);
  const s = await settingsData(r.ctx.userId);
  if (!s) redirect("/settings");
  const pending = s.deletionPending;
  const left = pending ? Math.max(0, Math.ceil((pending.getTime() - Date.now()) / 86400_000)) : DELETE_GRACE_DAYS;
  return (
    <RoleShell c={r.ctx} phone={{ back: "/settings", title: "Delete account" }}>
      {pending ? (
        <section className="flex flex-col gap-3 rounded-[30px] bg-butter p-6 text-butter-ink lg:p-8">
          <p className="text-[12.5px] font-extrabold tracking-[.06em]">SCHEDULED</p>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.08] tracking-[-.02em] lg:text-[38px]">Deletion starts on {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(pending)}</h1>
          <p className="text-[15.5px]">{left} days left. Change your mind any time before then. Nothing is lost until the {DELETE_GRACE_DAYS} days are over.</p>
          {r.ctx.minor && <p className="text-[14px]">We have told your guardian by email.</p>}
          <form action={cancelDeletionAction}><button type="submit" className="dc-btn dc-btn-forest h-[52px]">Keep my account</button></form>
        </section>
      ) : (
        <>
          <p className="text-[12.5px] font-extrabold tracking-[.04em] text-clay">DELETE MY ACCOUNT</p>
          <h1 className="font-display text-[30px] font-extrabold leading-[1.12] tracking-[-.01em] lg:text-[40px]">Delete your account?</h1>
          <Card className="flex flex-col gap-3 p-5 lg:p-6">
            <p className="text-[15px] text-bark">This cannot be undone once the {DELETE_GRACE_DAYS} days are over. Here is what happens:</p>
            <ul className="flex flex-col gap-2.5 text-[15px]">
              {["Your profile, goals and notes are deleted", "Open Asks and booked conversations are cancelled, and mentors are told kindly", "Thanks you sent stay on mentors' profiles without your name", "Records we must keep by law are kept for the legal period, then deleted"].map((x) => <li key={x} className="flex gap-2.5"><Icon name="check" size={18} className="mt-0.5 shrink-0 text-forest" />{x}</li>)}
            </ul>
            <p className="rounded-field bg-sand px-4 py-3 text-[14px]">You have {DELETE_GRACE_DAYS} days to change your mind.{r.ctx.minor ? " Your guardian is told, because you are under 18." : ""}</p>
          </Card>
          <DeleteForm email={s.email} />
        </>
      )}
    </RoleShell>
  );
}
