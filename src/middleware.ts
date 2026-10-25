import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { maintenanceDecision, maintenanceOn } from "@/lib/maintenance";

const PROTECTED = ["/home", "/me", "/notifications", "/search", "/give-back", "/asks", "/goals", "/mentor", "/guardian", "/admin", "/settings", "/village", "/onboarding", "/guardian-needed", "/paused", "/call", "/report", "/mentor/reaffirm"];
/** Open to everyone, including signed-out visitors. */
const PUBLIC = ["/recommend", "/signed-out", "/crisis", "/register", "/login", "/under-15", "/check-email", "/verify-email", "/forgot", "/reset", "/about", "/faq", "/help", "/families", "/become-a-mentor", "/policies", "/maintenance"];
const isUnder = (p: string, list: string[]) => list.some((x) => p === x || p.startsWith(x + "/"));

export async function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  // MAINTENANCE_MODE=1: everything but health, cron and webhooks gets a 503. Pages show /maintenance.
  const m = maintenanceDecision(p, maintenanceOn(process.env.MAINTENANCE_MODE));
  if (m === "api503") return NextResponse.json({ error: "The Village Circle is briefly offline for maintenance." }, { status: 503, headers: { "Retry-After": "3600" } });
  if (m === "page") return NextResponse.rewrite(new URL("/maintenance", req.url), { status: 503, headers: { "Retry-After": "3600" } });
  if (p.startsWith("/api/")) return NextResponse.next();
  if (p.startsWith("/guardian/authorize/")) return NextResponse.next(); // public single-use link
  if (isUnder(p, PUBLIC)) return NextResponse.next();
  if (!isUnder(p, PROTECTED)) return NextResponse.next();
  const t = await getToken({ req });
  if (p === "/admin/sign-in") return NextResponse.next();
  if (!t?.uid) return NextResponse.redirect(new URL(p === "/admin" || p.startsWith("/admin/") ? "/admin/sign-in" : "/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };
