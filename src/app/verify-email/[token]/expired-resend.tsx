"use client";

import { useFormState } from "react-dom";
import { FieldWrap, SubmitButton, TextField } from "@/components/forms/fields";
import { resendVerifyAction, type ActionState } from "@/app/account-actions";

/** M22: the old link no longer says who it was for, so ask for the address and send a fresh one. */
export function ExpiredResend() {
  const [state, action] = useFormState<ActionState, FormData>(resendVerifyAction, {});
  if (state.ok) return <p role="status" className="rounded-[18px] bg-mint px-4 py-3 text-[15px] font-semibold text-mint-ink">If that address has an account waiting, a new link is on its way. Check your spam folder too.</p>;
  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldWrap label="Email" htmlFor="v-email" error={state.error}><TextField id="v-email" name="email" type="email" icon="mail" autoComplete="email" required /></FieldWrap>
      <SubmitButton icon="send" className="h-14 w-full" pendingText="Sending…">Send a new verification email</SubmitButton>
    </form>
  );
}
