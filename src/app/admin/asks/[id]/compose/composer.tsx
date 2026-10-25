"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { ActionForm, Submit, type FormResult } from "@/components/app/action-form";
import { detectContactDetails } from "@/lib/domain/contact-detect";

/** Marks contact details and withheld words inside the text, the way the A8 board highlights them. */
function Marked({ text, bad }: { text: string; bad: string[] }) {
  if (!bad.length) return <>{text}</>;
  const re = new RegExp(`(${bad.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return <>{text.split(re).map((part, i) => (i % 2 ? <mark key={i} className="rounded-[6px] bg-blush px-1 font-bold text-blush-ink underline decoration-clay decoration-wavy">{part}</mark> : part))}</>;
}

/** A8 Step E: compose the mentor-facing summary with a live preview. Release stays locked while anything identifying is in it. */
export function Composer({ askId, topic, ageBand, guardian, initial, withheld, action }: {
  askId: string; topic: string; ageBand: string; guardian: string | null; withheld: string[];
  initial: { question: string; help: string; sessionLength: number; extra: string }; action: (s: FormResult, fd: FormData) => Promise<FormResult>;
}) {
  const [q, setQ] = useState(initial.question); const [help, setHelp] = useState(initial.help); const [len, setLen] = useState(String(initial.sessionLength)); const [extra, setExtra] = useState(initial.extra);
  const words = useMemo(() => [...withheld, ...extra.split(",").map((s) => s.trim())].filter((s) => s.length >= 2), [withheld, extra]);
  const hits = useMemo(() => {
    const text = `${q}\n${help}`; const lower = text.toLowerCase();
    return [...new Set([...detectContactDetails(text).map((h) => h.match), ...words.filter((w) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(lower))])];
  }, [q, help, words]);
  const ready = !hits.length && q.trim().length >= 20 && help.trim().length >= 10;
  return (
    <ActionForm action={action} ok={{ approved: "Summary approved. Choose who to release it to below.", saved: "Saved as a draft." }}>
      <input type="hidden" name="askId" value={askId} />
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5 lg:p-6">
        <h2 className="font-display text-[21px] font-extrabold">Mentor-facing summary</h2>
        <div><label htmlFor="question" className="dc-label">Question</label><textarea id="question" name="question" rows={3} value={q} onChange={(e) => setQ(e.target.value)} aria-invalid={hits.length > 0 || undefined} className="dc-textarea" placeholder="A student aged 16 to 17 asks what a realistic path into medicine looks like and what to do this year." /></div>
        <div><label htmlFor="help" className="dc-label">What would help most</label><textarea id="help" name="help" rows={2} value={help} onChange={(e) => setHelp(e.target.value)} className="dc-textarea" placeholder="An honest picture of the road, and two or three things worth doing this year." /></div>
        {hits.length > 0 && <p role="alert" className="flex items-center gap-2.5 rounded-[14px] bg-blush px-3.5 py-2.5 text-[13.5px] font-bold text-blush-ink"><Icon name="alert" size={18} />{hits.length === 1 ? "An identifying detail is" : `${hits.length} identifying details are`} in the summary. Remove {hits.length === 1 ? "it" : "them"} to release.</p>}
        <div className="grid gap-3 lg:grid-cols-4">
          <div><p className="dc-label">Topic</p><p className="dc-input flex items-center bg-sand">{topic}</p></div>
          <div><p className="dc-label">Age band</p><p className="dc-input flex items-center bg-sand">{ageBand}</p></div>
          <div><p className="dc-label">Length</p><Select name="sessionLength" value={len} onChange={setLen} options={[{ value: "30", label: "30 minutes" }, { value: "60", label: "60 minutes" }]} /></div>
          <div><p className="dc-label">Guardian</p><p className="dc-input flex items-center bg-sand">{guardian ?? "Not needed"}</p></div>
        </div>
        <div><label htmlFor="withheld" className="dc-label">Extra words to keep out (comma separated)</label><input id="withheld" name="withheld" value={extra} onChange={(e) => setExtra(e.target.value)} className="dc-input" placeholder="A school, a town, an employer" /><span className="dc-hint">The participant&apos;s and guardian&apos;s names are always kept out.</span></div>
      </section>
      <section className="rounded-card bg-butter p-5 text-butter-ink lg:p-6">
        <p className="text-[13px] font-bold">Preview. This is what the mentor sees</p>
        <p className="mt-2 font-display text-[21px] font-extrabold">{topic} · {len} min · {ageBand}</p>
        <p className="mt-1.5 text-[15px] leading-normal"><Marked text={q || "Write the question above."} bad={hits} /></p>
        {help && <p className="mt-1.5 text-[15px] leading-normal"><b>What would help: </b><Marked text={help} bad={hits} /></p>}
      </section>
      <div className="flex flex-wrap gap-2.5"><Submit name="intent" value="save" variant="soft" icon="check">Save</Submit><Submit name="intent" value="approve" icon="shieldCheck" disabled={!ready}>Approve summary</Submit></div>
      {!ready && !hits.length && <p className="text-[13px] text-stone">Write at least a sentence for each part to approve.</p>}
    </ActionForm>
  );
}
