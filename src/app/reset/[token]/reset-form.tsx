"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { FieldWrap, PasswordField, SubmitButton } from "@/components/forms/fields";
import { resetAction, type ActionState } from "@/app/account-actions";

/** M11-M2: the save button wakes up when both passwords match. */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, action] = useFormState<ActionState, FormData>(resetAction, {});
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const mismatch = b.length > 0 && a !== b;
  useEffect(() => { if (state.expired) router.replace("/forgot?expired=1"); }, [state.expired, router]);
  return (
    <form id="reset-form" action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <FieldWrap label="New password" htmlFor="p-new" hint="Use at least 10 characters, with a letter and a number." error={state.field === "password" ? state.error : undefined}>
        <PasswordField id="p-new" name="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} required />
      </FieldWrap>
      <FieldWrap label="Confirm password" htmlFor="p-confirm" error={mismatch ? "These two do not match. Type the same password again." : state.field === "confirm" ? state.error : undefined}>
        <PasswordField id="p-confirm" name="confirm" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} aria-invalid={mismatch || undefined} required />
      </FieldWrap>
      {state.error && !state.field && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="max-lg:hidden">
        <SubmitButton className="h-[54px] w-full" disabled={!a || a !== b} pendingText="Saving…">Save new password</SubmitButton>
        <p className="mt-4 text-center text-[13.5px] leading-normal text-stone">The button wakes up when both match. Pick something you have not used on other sites.</p>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper px-4 pb-4 pt-3 lg:hidden">
        <SubmitButton className="h-14 w-full" disabled={!a || a !== b} pendingText="Saving…">Save new password</SubmitButton>
        <p className="mt-2 text-center text-caption text-stone">Both passwords must match first.</p>
      </div>
    </form>
  );
}
