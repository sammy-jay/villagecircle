"use client";

import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/fields";
import { exportAction, type SelfState } from "@/app/self-actions";

export function RequestExport() {
  const [state, action] = useFormState<SelfState, FormData>(exportAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <SubmitButton icon="download" className="h-[52px] self-start" pendingText="Preparing…">Request my data</SubmitButton>
    </form>
  );
}
