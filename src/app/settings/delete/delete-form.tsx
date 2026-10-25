"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { FieldWrap, SubmitButton, TextField } from "@/components/forms/fields";
import { deletionAction, type SelfState } from "@/app/self-actions";

/** EX15 state 1: type DELETE and the account email. On success, sign out and land on P02-D2. */
export function DeleteForm({ email }: { email: string }) {
  const [state, action] = useFormState<SelfState, FormData>(deletionAction, {});
  const [word, setWord] = useState("");
  useEffect(() => {
    if (state.ok && typeof state.until === "string") void signOut({ callbackUrl: `/signed-out?reason=deleted&until=${encodeURIComponent(state.until)}` });
  }, [state]);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldWrap label="Type DELETE to confirm" htmlFor="del-word"><TextField id="del-word" name="word" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" /></FieldWrap>
      <FieldWrap label="Your account email" htmlFor="del-email" hint={`The one you sign in with${email ? `, ending ${email.slice(email.indexOf("@"))}` : ""}.`}><TextField id="del-email" name="email" type="email" autoComplete="off" /></FieldWrap>
      {state.error && <p role="alert" className="text-[14.5px] font-semibold text-clay">{state.error}</p>}
      {state.ok && <p role="status" className="text-[14.5px] font-semibold">Signing you out…</p>}
      <div className="flex flex-col gap-2.5 lg:flex-row">
        <SubmitButton variant="primary" disabled={word.trim() !== "DELETE"} className="h-[52px]" pendingText="Scheduling…">Delete my account</SubmitButton>
        <Link href="/settings" className="dc-btn dc-btn-forest h-[52px]">Keep my account</Link>
      </div>
    </form>
  );
}
