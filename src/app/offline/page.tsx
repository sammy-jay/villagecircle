import { StateCard, SystemShell } from "@/components/public/system-state";
import { TryAgain } from "./try-again";

export const metadata = { title: "You are offline" };

/** HP8 offline state. */
export default function Offline() {
  return (
    <SystemShell>
      <StateCard tone="butter" icon="globe" struck title="You are offline" body="Check your connection. Anything you typed is kept on this device and will send when you are back online.">
        <TryAgain />
      </StateCard>
    </SystemShell>
  );
}
