"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { CodeInput } from "@/components/dc/client";
import { mfaCodeAction, mfaEnableAction, type AuthState } from "./actions";

function Go({ label, busy, icon }: { label: string; busy: string; icon?: "shieldCheck" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-14 w-full disabled:opacity-60">{icon && <Icon name={icon} size={18} />}{pending ? busy : label}</button>;
}

/** A18 step one: email and password. The server page then shows the second step (or setup). */
export function PasswordStep({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setPending(true); setError(null);
    const fd = new FormData(e.currentTarget);
    const r = await signIn("credentials", { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""), redirect: false });
    setPending(false);
    if (!r || r.error) { setError("That email and password did not match a team account."); return; }
    router.replace(`/admin/sign-in?next=${encodeURIComponent(next)}`); router.refresh();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div><label htmlFor="email" className="dc-label">Team email</label><input id="email" name="email" type="email" autoComplete="username" required className="dc-input" /></div>
      <div><label htmlFor="password" className="dc-label">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="dc-input" /></div>
      {error && <p role="alert" className="text-[14px] font-semibold text-clay">{error}</p>}
      <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-14 w-full disabled:opacity-60">{pending ? "Checking…" : "Continue"}</button>
      <Link href="/forgot" className="text-center text-[14px] font-bold text-clay">Forgot your password?</Link>
    </form>
  );
}

/** After a good code: refresh the session so it reads the fresh check, then go on. */
function useContinue(ok: boolean | undefined, next: string, hold = false) {
  const { update } = useSession(); const router = useRouter();
  useEffect(() => { if (ok && !hold) void update().then(() => { router.replace(next); router.refresh(); }); }, [ok, hold, next, router, update]);
}

/** A18 step two: the six-digit code, or a backup code. */
export function CodeStep({ email, next }: { email: string; next: string }) {
  const [state, action] = useFormState<AuthState, FormData>(mfaCodeAction, {});
  const [backup, setBackup] = useState(false);
  useContinue(state.ok, next);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[20px] bg-mint px-4 py-3 text-mint-ink">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest text-forest-ink"><Icon name="check" size={16} /></span>
        <p className="min-w-0 flex-1 leading-tight"><b className="block truncate text-[14.5px]">{email}</b><span className="text-[13.5px]">Password accepted</span></p>
        <button type="button" onClick={() => signOut({ callbackUrl: "/admin/sign-in" })} className="text-[14px] font-bold text-clay">Change</button>
      </div>
      <form action={action} className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2.5 font-display text-[20px] font-extrabold"><span className="flex size-7 items-center justify-center rounded-full bg-clay text-[13px] text-clay-ink">2</span>Second step</h2>
        {backup ? (
          <div><label htmlFor="backup" className="dc-label">Backup code</label><input id="backup" name="backup" autoComplete="off" placeholder="XXXXX-XXXXX" className="dc-input font-mono uppercase" /></div>
        ) : (
          <>
            <p className="text-[15px] text-bark">Enter the 6 digit code from your authenticator app.</p>
            <CodeInput autoFocus invalid={!!state.error} />
            <p className="text-[13px] text-stone">Codes change every 30 seconds.</p>
          </>
        )}
        {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
        <Go label={state.ok ? "Signing in…" : "Sign in"} busy="Checking…" />
        <button type="button" onClick={() => setBackup((b) => !b)} className="text-[14px] font-bold text-clay">{backup ? "Use my authenticator app" : "Lost your phone? Use a backup code"}</button>
      </form>
    </div>
  );
}

/** A25 setup: confirm the first code, then show the backup codes once before going on. */
export function SetupStep({ next, qr, setupKey }: { next: string; qr: string; setupKey: string }) {
  const [state, action] = useFormState<AuthState, FormData>(mfaEnableAction, {});
  const [saved, setSaved] = useState(false);
  useContinue(state.ok, next, !saved);
  const text = (state.codes ?? []).join("\n");
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
        <h2 className="flex items-center gap-2.5 font-display text-[19px] font-extrabold"><span className="flex size-7 items-center justify-center rounded-full bg-forest text-[13px] text-forest-ink">1</span>Scan with your authenticator app</h2>
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code to add The Village Circle to your authenticator app" width={156} height={156} className="rounded-[14px] border border-line" />
          <div className="min-w-0"><p className="text-[14.5px] text-bark">Open your authenticator app and scan this code.</p><p className="mt-2 text-[13px] text-stone">Cannot scan? Enter the setup key</p><p className="font-mono text-[17px] font-bold tracking-[.06em]">{setupKey}</p></div>
        </div>
      </section>
      {!state.ok ? (
        <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-extrabold"><span className="flex size-7 items-center justify-center rounded-full bg-forest text-[13px] text-forest-ink">2</span>Enter the six-digit code</h2>
          <CodeInput autoFocus invalid={!!state.error} />
          <p className="text-[13px] text-stone">It changes every 30 seconds.</p>
          {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
          <Go label="Turn on and continue" busy="Checking…" icon="shieldCheck" />
        </form>
      ) : (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5">
          <h2 className="flex items-center gap-2.5 font-display text-[19px] font-extrabold"><span className="flex size-7 items-center justify-center rounded-full bg-forest text-[13px] text-forest-ink">3</span>Save your backup codes</h2>
          <p className="text-[14.5px] text-bark">Keep these somewhere safe. Each works once if you lose your phone. They are not shown again.</p>
          <ul className="grid grid-cols-2 gap-2">{state.codes!.map((c) => <li key={c} className="rounded-[14px] bg-sand py-2.5 text-center font-mono text-[15.5px] font-bold tracking-[.06em]">{c}</li>)}</ul>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void navigator.clipboard?.writeText(text)} className="dc-btn dc-btn-outline h-11"><Icon name="clipboard" size={17} />Copy codes</button>
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(`The Village Circle backup codes\n\n${text}\n`)}`} download="village-circle-backup-codes.txt" className="dc-btn dc-btn-outline h-11"><Icon name="download" size={17} />Download</a>
          </div>
          <button type="button" onClick={() => setSaved(true)} disabled={saved} className="dc-btn dc-btn-primary h-14 disabled:opacity-60">{saved ? "Opening the console…" : "I have saved them, continue"}</button>
        </section>
      )}
    </div>
  );
}
