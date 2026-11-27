import { NextResponse } from "next/server";
import { requireRole } from "./auth";
import type { Role } from "@prisma/client";

export async function withRole(...roles: Role[]) {
  const g = await requireRole(...roles);
  if (!g.ok) return { err: NextResponse.json({ error: g.reason === "unauthenticated" ? "Sign in first" : g.reason === "mfa" ? "Two-step sign-in required" : g.reason === "email" ? "Email verification required" : "Not allowed" }, { status: g.reason === "unauthenticated" ? 401 : 403 }) } as const;
  return { user: g.user } as const;
}
export const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
