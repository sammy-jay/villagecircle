"use server";

import { getSession } from "@/lib/auth";
import { createHelpRequest } from "@/lib/admin-data";
import { submitConcern } from "@/lib/safety-user";
import { CONCERN_KINDS, type ConcernKind } from "@/lib/domain/safety-user";

export type FormState = { ok?: boolean; error?: string; escalated?: boolean; needsLogin?: boolean };

/** HP3 Contact the team. Signed-in users are linked to the request; anyone can send one. */
export async function sendHelp(_: FormState, fd: FormData): Promise<FormState> {
  const name = String(fd.get("name") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim();
  const about = String(fd.get("about") ?? "").trim();
  const message = String(fd.get("message") ?? "").trim();
  const s = await getSession();
  const uid = s?.user?.id || undefined;
  if (!uid && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Add an email so we can reply." };
  if (!about) return { error: "Pick what it is about." };
  if (message.length < 3) return { error: "Tell us what you need." };
  const r = await createHelpRequest({ fromUserId: uid, fromName: name || undefined, fromRole: uid ? "MEMBER" : "PUBLIC", email: email || undefined, about, message });
  if (!r.ok) return { error: r.error };
  return { ok: true, escalated: !!r.escalated };
}

/** HP4 Report now. Reports need an account so we know which connection to pause. */
export async function sendReport(_: FormState, fd: FormData): Promise<FormState> {
  const s = await getSession();
  const uid = s?.user?.id || undefined;
  if (!uid) return { needsLogin: true, error: "Log in first so we know which account to protect and pause." };
  const kind = String(fd.get("kind") ?? "") as ConcernKind;
  if (!CONCERN_KINDS.includes(kind)) return { error: "Pick the closest kind of concern." };
  const who = String(fd.get("who") ?? "").trim();
  const more = String(fd.get("description") ?? "").trim();
  const contact = fd.get("contact") === "yes" ? "You may contact me about this." : "Please do not contact me about this.";
  const description = [who && `About: ${who}.`, more, contact].filter(Boolean).join("\n");
  const r = await submitConcern(uid, { kind, description, askId: String(fd.get("askId") ?? "") || undefined });
  if (!r.ok) return { error: r.error };
  return { ok: true };
}
