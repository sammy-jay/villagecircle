"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/dc/icons";

/** D5 filter pills: each is a native select styled as a pill, and changes the address so the list is shareable and survives refresh. */
export function InboxFilters({ topics }: { topics: string[] }) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const set = (k: string, v: string) => { const q = new URLSearchParams(sp.toString()); if (v) q.set(k, v); else q.delete(k); router.replace(`${path}?${q.toString()}`, { scroll: false }); };
  const pill = (k: string, label: string, options: [string, string][]) => (
    <label className="relative inline-flex h-[34px] items-center rounded-full border border-line bg-card pl-3.5 pr-8 text-[13.5px] font-semibold">
      <span className="sr-only">{label}</span>
      <select value={sp.get(k) ?? ""} onChange={(e) => set(k, e.target.value)} className="appearance-none bg-transparent pr-1 focus:outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Icon name="chevronDown" size={15} className="pointer-events-none absolute right-3" />
    </label>
  );
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter Asks">
      {pill("topic", "Topic", [["", "Topic: all"], ...topics.map((t): [string, string] => [t, t])])}
      {pill("age", "Age band", [["", "Age band: all"], ["minor", "Under 18"], ["adult", "18 and over"]])}
      {pill("len", "Length", [["", "Length: any"], ["30", "30 min"], ["60", "60 min"]])}
      {pill("sort", "Order", [["", "Newest first"], ["old", "Oldest first"]])}
    </div>
  );
}
