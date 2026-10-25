"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select, type Option } from "@/components/dc/client";

/** Phone-only policy switcher (the desktop board uses the side menu). */
export function PolicyPicker({ current, options }: { current: string; options: Option[] }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-[7px] lg:hidden">
      <label htmlFor="policy-pick" className="text-label font-bold text-bark">Policy</label>
      <Select id="policy-pick" options={options} value={current} onChange={(v) => router.push(`/policies/${v}`)} className="[&>button]:h-[54px]" />
    </div>
  );
}

/** "Download as PDF": the browser's print dialog saves the page as a PDF. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="dc-btn dc-btn-ghost h-[52px] w-full">
      <Icon name="download" size={18} />Download as PDF
    </button>
  );
}
