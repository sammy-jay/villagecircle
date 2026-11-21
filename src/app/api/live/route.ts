import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { liveVersion } from "@/lib/live";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Live updates: the signed-in person's change fingerprint (lib/live.ts), polled by <LiveUpdates /> in every dashboard
 * frame. A route rather than a server action on purpose: Next runs a page's server actions one at a time, so a poll in
 * flight would hold up the person's own form submits. It says only that something changed, never what.
 * 401 when signed out or suspended, so the page re-renders and its guard sends them to the right place.
 */
export async function GET() {
  const s = await getSession();
  if (!s?.user?.id) return NextResponse.json({ v: null }, { status: 401, headers: NO_STORE });
  try {
    const v = await liveVersion(s.user.id, s.user.roles, !s.user.mfaRequired || s.user.mfaPassed);
    return NextResponse.json({ v }, { headers: NO_STORE });
  } catch (e) {
    console.error("live", e);
    return NextResponse.json({ v: null }, { status: 503, headers: NO_STORE });
  }
}
