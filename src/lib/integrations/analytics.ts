import { PostHog } from "posthog-node";
import { env } from "./status";

let ph: PostHog | null = null;
/** Never send names, emails, Ask text or anything about a minor. IDs and event names only. */
export function track(distinctId: string, event: string, props: Record<string, string | number | boolean> = {}) {
  const key = env("POSTHOG_API_KEY") || env("NEXT_PUBLIC_POSTHOG_KEY"); if (!key) return;
  ph ??= new PostHog(key, { host: env("NEXT_PUBLIC_POSTHOG_HOST") || undefined, flushAt: 1, flushInterval: 0 });
  ph.capture({ distinctId, event, properties: props });
}
