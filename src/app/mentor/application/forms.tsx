"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { appealAction, infoReplyAction, type MState } from "../actions";

function Btn({ label, busy, icon }: { label: string; busy: string; icon: "send" | "arrowRight" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-[52px] disabled:opacity-60"><Icon name={icon} size={18} />{pending ? busy : label}</button>;
}

/** DK11 "If we need one more thing": answer the reviewer's question. */
export function InfoReply({ reviewer }: { reviewer: string }) {
  const [state, action] = useFormState<MState, FormData>(infoReplyAction, {});
  if (state.ok) return <p role="status" className="rounded-[16px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink">Thank you. Your reply is with {reviewer}. We will email you.</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="reply" className="dc-label mb-0">Your reply</label>
      <textarea id="reply" name="reply" rows={3} maxLength={2000} placeholder={`Tell ${reviewer} a little about it`} aria-invalid={state.field === "reply" || undefined} className="dc-textarea" />
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <div className="flex flex-wrap items-center gap-3"><Btn label="Send reply" busy="Sending…" icon="send" /><span className="text-[13px] text-stone">Replies within 14 days keep your place.</span></div>
    </form>
  );
}

/** EX10 "Ask us to look again": one appeal, read by a different reviewer. */
export function Appeal({ kinds }: { kinds: readonly string[] }) {
  const [state, action] = useFormState<MState, FormData>(appealAction, {});
  if (state.ok) return <p role="status" className="rounded-[16px] bg-mint px-4 py-3 text-[14.5px] font-semibold text-mint-ink">Your appeal is sent. A different reviewer will read it, and you will hear back within 5 business days.</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <div><p className="dc-label">What is your appeal about?</p><Select name="kind" options={kinds.map((k) => ({ value: k, label: k }))} placeholder="Choose one" /></div>
      <div><label htmlFor="note" className="sr-only">Tell us more</label><textarea id="note" name="note" rows={3} maxLength={2000} placeholder="Tell us what has changed or what we missed" className="dc-textarea" /><span className="dc-hint">We count appeal types to improve our process. Your note stays private.</span></div>
      {state.error && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <p className="text-[13.5px] text-bark">You will hear back within 5 business days.</p>
      <div className="flex flex-wrap items-center gap-2.5"><Btn label="Send my appeal" busy="Sending…" icon="send" /><Link href="/" className="dc-btn dc-btn-soft h-[52px]">Not now</Link></div>
    </form>
  );
}
