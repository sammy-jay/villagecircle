"use client";

import { Icon } from "@/components/dc/icons";

export function TryAgain() {
  return (
    <button type="button" onClick={() => (history.length > 1 ? history.back() : location.assign("/"))} className="dc-btn dc-btn-primary h-[54px]">
      <Icon name="refresh" size={18} />Try again
    </button>
  );
}
