"use client";

import { useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { useConfirmSubmit } from "@/components/app/confirm";
import { cn } from "@/lib/cn";
import { deleteDraftAction } from "./actions";

function Btn({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={cn("inline-flex items-center gap-1.5 text-[14px] font-bold text-clay disabled:opacity-55", className)}><Icon name="trash" size={16} />{pending ? "Deleting…" : "Delete draft"}</button>;
}

/** "Delete draft" with the app's own confirmation. Drafts only; nothing was sent, so nobody else is told. */
export function DeleteDraft({ askId, className }: { askId: string; className?: string }) {
  const ask = useConfirmSubmit({ title: "Delete this draft?", body: "Your answers are removed for good. Nothing was sent, so nobody else is told.", confirmLabel: "Delete draft", cancelLabel: "Keep it", danger: true });
  return (
    <form action={deleteDraftAction} onSubmit={ask.onSubmit}>
      {ask.dialog}
      <input type="hidden" name="askId" value={askId} />
      <Btn className={className} />
    </form>
  );
}
