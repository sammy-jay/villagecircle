import type { AskState } from "@prisma/client";
import { isOpen } from "./ask-state";

export const MAX_OPEN_ASKS = 3; // BR-14

export function openAskCount(states: AskState[]): number { return states.filter(isOpen).length; }

/** Participant cap, and the guardian cap is per linked young person. */
export function canStartAsk(states: AskState[]): { ok: boolean; error?: string } {
  return openAskCount(states) >= MAX_OPEN_ASKS
    ? { ok: false, error: "You can have up to three open Asks at a time. Finish or withdraw one to start another." }
    : { ok: true };
}
