import { Icon } from "@/components/dc/icons";

/** ST2 "Planned maintenance" strip, shown ahead of a window on every page. Set MAINTENANCE_NOTICE to the sentence; empty hides it. */
export function MaintenanceNotice() {
  const text = process.env.MAINTENANCE_NOTICE?.trim();
  if (!text) return null;
  return <p role="status" className="flex items-center justify-center gap-2 bg-butter px-4 py-2.5 text-center text-[14px] text-butter-ink"><Icon name="info" size={17} className="shrink-0" />{text}</p>;
}
