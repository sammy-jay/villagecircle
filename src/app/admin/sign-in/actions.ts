"use server";

import { getSession } from "@/lib/auth";
import { checkMfa, enableMfa } from "@/lib/admin-auth";

export type AuthState = { ok?: boolean; error?: string; codes?: string[] };

const uid = async () => {
  const s = await getSession();
  return s?.user?.id && (s.user.roles.includes("ADMIN") || s.user.roles.includes("SAFEGUARDING_LEAD")) ? s.user.id : null;
};

/** A18 second step. On success the client refreshes the session, which reads the fresh mfaVerifiedAt. */
export async function mfaCodeAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const id = await uid(); if (!id) return { error: "Sign in with your email and password first." };
  const code = String(fd.get("backup") ?? "").trim() || String(fd.get("code") ?? "").trim();
  const r = await checkMfa(id, code);
  return r.ok ? { ok: true } : { error: r.error };
}

/** A25 "Turn on and continue". Returns the backup codes once. */
export async function mfaEnableAction(_: AuthState, fd: FormData): Promise<AuthState> {
  const id = await uid(); if (!id) return { error: "Sign in with your email and password first." };
  const r = await enableMfa(id, String(fd.get("code") ?? ""));
  return r.ok ? { ok: true, codes: r.codes } : { error: r.error };
}
