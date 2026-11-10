"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { FieldWrap, PasswordField, TextField } from "@/components/forms/fields";

/** M9 / DK3 sign-in. Wrong details and a locked account get the same message (no hints about which emails exist). */
export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true); setError(null);
    const r = await signIn("credentials", { email: String(fd.get("email") ?? ""), password: String(fd.get("password") ?? ""), redirect: false });
    setPending(false);
    if (!r || r.error) { setError("That email and password do not match. After 5 tries we pause sign-in for 15 minutes."); return; }
    router.push(next ? `/after-login?next=${encodeURIComponent(next)}` : "/after-login");
    router.refresh();
  }

  return (
    <form id="login-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
      {notice && <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink">{notice}</p>}
      <FieldWrap label="Email" htmlFor="l-email"><TextField id="l-email" name="email" type="email" icon="mail" autoComplete="email" required /></FieldWrap>
      <FieldWrap label="Password" htmlFor="l-pass"><PasswordField id="l-pass" name="password" autoComplete="current-password" required /></FieldWrap>
      <Link href="/forgot" className="self-end text-[14.5px] font-bold text-clay">Forgot password?</Link>
      {error && <p role="alert" className="text-[14px] font-semibold text-clay">{error}</p>}
      <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-14 w-full max-lg:hidden">{pending ? "Logging in…" : "Log in"}</button>
      <p className="text-center text-[14.5px] text-stone max-lg:hidden">New here? <Link href="/register" className="font-bold text-clay">Join now</Link></p>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden">
        <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-14 w-full">{pending ? "Logging in…" : "Log in"}</button>
        <p className="mt-3 text-center text-[14.5px] text-stone">New here? <Link href="/register" className="font-bold text-clay">Join now</Link></p>
      </div>
    </form>
  );
}
