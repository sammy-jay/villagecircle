"use client";

import { useState } from "react";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";

/**
 * A14 hosts: one dropdown per host, each listing approved mentors with their specialization (and the Village Circle
 * team). A mentor already picked in another row is left out of the other lists. Each row posts as `hostId`.
 */
export function HostPicker({ options, initial, unmatched, max }: { options: { value: string; label: string }[]; initial: string[]; unmatched: string[]; max: number }) {
  const [rows, setRows] = useState<string[]>(initial.length ? initial : [""]);
  const set = (i: number) => (v: string) => setRows((r) => r.map((x, j) => (j === i ? v : x)));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="dc-label">Hosts</legend>
      {unmatched.length > 0 && (
        <p className="rounded-[14px] bg-butter px-3.5 py-2.5 text-[13px] leading-snug text-butter-ink">
          Saved before hosts were picked from the list: <b>{unmatched.join(", ")}</b>. {unmatched.length === 1 ? "This name does" : "These names do"} not match a mentor account. Pick the hosts below; saving replaces the old names.
        </p>
      )}
      {rows.map((v, i) => (
        <div key={i} className="flex items-start gap-2">
          <Select name="hostId" className="min-w-0 flex-1" value={v} onChange={set(i)} placeholder={i === 0 ? "Choose a mentor" : "Choose another host"}
            options={options.filter((o) => o.value === v || !rows.includes(o.value))} />
          {rows.length > 1 && (
            <button type="button" onClick={() => setRows((r) => r.filter((_, j) => j !== i))} aria-label={`Remove host ${i + 1}`}
              className="flex size-[58px] shrink-0 items-center justify-center rounded-field border-2 border-line text-stone hover:text-ink">
              <Icon name="x" size={18} />
            </button>
          )}
        </div>
      ))}
      {rows.length < max && (
        <button type="button" onClick={() => setRows((r) => [...r, ""])} className="inline-flex items-center gap-1.5 self-start text-[14px] font-bold text-clay">
          <Icon name="plus" size={16} />Add another host
        </button>
      )}
      <span className="dc-hint mt-0">Approved mentors only. Participants see first names and a last initial, like the directory.</span>
    </fieldset>
  );
}
