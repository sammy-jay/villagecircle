"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Icon } from "@/components/dc/icons";
import { sendMessageAction, type ThreadState } from "@/app/asks/actions";
import { cn } from "@/lib/cn";

/** Highlights the part that looks like a phone number, email or handle so it is easy to take out. */
function marked(text: string) {
  // split() with one capture group puts the matches at the odd positions.
  const parts = text.split(/(\+?\d[\d\s-]{6,}\d|[\w.+-]+@[\w-]+\.[\w.]+|@[\w.]{3,})/);
  return parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="rounded bg-blush px-0.5 font-bold text-blush-ink">{p}</mark> : <span key={i}>{p}</span>));
}

function Send() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="dc-btn dc-btn-primary h-12 shrink-0 px-5"><Icon name="send" size={18} />Send</button>;
}

/** N08 composer. Refreshes the thread every 15 seconds while the tab is visible. */
export function Composer({ askId, open, note }: { askId: string; open: boolean; note: string }) {
  const router = useRouter();
  const [state, action] = useFormState<ThreadState, FormData>(sendMessageAction, {});
  const [text, setText] = useState("");
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) setText(""); if (state.draft) setText(state.draft); }, [state]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 15_000);
    return () => clearInterval(t);
  }, [router]);
  if (!open) return <p className="rounded-card border border-line bg-card p-4 text-center text-[14px] text-stone">This chat is closed.</p>;
  return (
    <div className="flex flex-col gap-3">
      {state.blocked && state.draft && (
        <div role="alert" className="flex flex-col gap-2 self-end rounded-[22px] border-2 border-dashed border-clay bg-card p-4 lg:max-w-[80%]">
          <p className="flex items-center gap-2 text-[14px] font-extrabold text-clay"><Icon name="alert" size={18} />We did not send this message</p>
          <p className="text-[13.5px] leading-normal text-bark">{state.error}</p>
          <p className="rounded-[14px] bg-sand px-3 py-2 text-[15px] leading-normal">{marked(state.draft)}</p>
        </div>
      )}
      {state.error && !state.blocked && <p role="alert" className="text-[14px] font-semibold text-clay">{state.error}</p>}
      <form ref={form} action={action} className="flex items-end gap-2.5 rounded-card border border-line bg-card p-2.5">
        <input type="hidden" name="askId" value={askId} />
        <label htmlFor="t-body" className="sr-only">Message</label>
        <textarea id="t-body" name="body" value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={1000}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.current?.requestSubmit(); } }}
          placeholder="Write a message" className={cn("max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2.5 py-3 text-[15.5px] leading-normal focus:outline-none")} />
        <Send />
      </form>
      <p className="text-center text-[12.5px] text-stone">{note}</p>
    </div>
  );
}
