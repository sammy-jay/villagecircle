"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminActor } from "@/lib/admin-ctx";
import { resourceReviewAction, saveEventAdmin, saveResourceAdmin } from "@/lib/admin-village";
import { saveBroadcastDraft, saveTopic, sendBroadcast } from "@/lib/admin-ops";
import { resetTemplate, saveTemplate } from "@/lib/templates";
import { AUDIENCES, type Audience } from "@/lib/domain/admin-ops";
import { zonedToUtc } from "@/lib/domain/scheduling";

export type CState = { ok?: boolean; error?: string; field?: string; done?: string; [k: string]: unknown };
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const list = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);

/* ───── A13 / A27 library ───── */
export async function resourceSaveAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("library.review"); if (!a.ok) return { error: a.error };
  const publish = str(fd, "intent") === "publish";
  const r = await saveResourceAdmin(a.actor.id, { id: str(fd, "id") || undefined, title: str(fd, "title"), type: str(fd, "type"), topics: [str(fd, "topic"), ...list(str(fd, "moreTopics"))].filter(Boolean), cohorts: fd.getAll("cohort").map(String), body: str(fd, "body"), fileKey: str(fd, "fileKey"), contributorId: str(fd, "contributorId") || undefined }, publish);
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/library");
  if (!str(fd, "id")) redirect(`/admin/library?id=${r.id}`);
  return { ok: true, done: publish ? "published" : "saved" };
}
export async function resourceReviewFormAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("library.review"); if (!a.ok) return { error: a.error };
  const id = str(fd, "id"); const outcome = str(fd, "outcome");
  if (outcome === "UPDATE") redirect(`/admin/library?id=${id}`);
  const r = await resourceReviewAction(a.actor.id, id, outcome === "ARCHIVE" ? "ARCHIVE" : "REVIEWED", [str(fd, "reviewer") && `Reviewer: ${str(fd, "reviewer")}`, str(fd, "note")].filter(Boolean).join(". ") || undefined);
  if (!r.ok) return { error: r.error, field: "note" };
  revalidatePath("/admin/library"); revalidatePath("/admin/library/review");
  return { ok: true, done: outcome === "ARCHIVE" ? "archived" : "reviewed" };
}

/* ───── A14 events ───── */
export async function eventSaveAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("content"); if (!a.ok) return { error: a.error };
  const cap = str(fd, "capacity");
  const at = zonedToUtc(str(fd, "startsAt")); const iso = Number.isNaN(at.getTime()) ? "" : at.toISOString();
  const r = await saveEventAdmin(a.actor.id, { id: str(fd, "id") || undefined, title: str(fd, "title"), startsAt: iso, type: str(fd, "type"), capacity: cap ? Number(cap) : null, host: str(fd, "host"), recordingKey: str(fd, "recordingKey"), description: str(fd, "description"), location: str(fd, "location") });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/events");
  return { ok: true, done: str(fd, "id") ? "saved" : "created" };
}

/* ───── A12 taxonomy ───── */
export async function topicSaveAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("content"); if (!a.ok) return { error: a.error };
  const slug = str(fd, "slug") || null;
  const r = await saveTopic(a.actor.id, slug, { name: str(fd, "name"), guidedPrompts: [str(fd, "p1"), str(fd, "p2"), str(fd, "p3")].filter(Boolean), subTopics: list(str(fd, "subTopics")), expertiseMap: fd.getAll("expertise").map(String), active: str(fd, "active") !== "no" });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/taxonomy");
  if (!slug) redirect(`/admin/taxonomy?topic=${r.slug}`);
  return { ok: true, done: "saved" };
}

/* ───── P05 templates ───── */
export async function templateSaveAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("config"); if (!a.ok) return { error: a.error };
  const key = str(fd, "key");
  if (str(fd, "intent") === "reset") { const r = await resetTemplate(key, a.actor.id); if (!r.ok) return { error: r.error }; revalidatePath("/admin/templates"); return { ok: true, done: "reset" }; }
  const r = await saveTemplate(key, { subject: fd.has("subject") ? str(fd, "subject") : undefined, preheader: fd.has("preheader") ? str(fd, "preheader") : undefined, body: String(fd.get("body") ?? ""), cta: fd.has("cta") ? str(fd, "cta") : undefined, footer: fd.has("footer") ? str(fd, "footer") : undefined }, a.actor.id);
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/templates");
  return { ok: true, done: "saved" };
}

/* ───── A17 broadcast ───── */
export async function broadcastAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("content"); if (!a.ok) return { error: a.error };
  const audience = (AUDIENCES as readonly string[]).includes(str(fd, "audience")) ? (str(fd, "audience") as Audience) : "EVERYONE";
  const base = { id: str(fd, "id") || undefined, audience, subject: str(fd, "subject"), body: str(fd, "body") };
  if (str(fd, "intent") === "draft") { const r = await saveBroadcastDraft(a.actor.id, base); if (!r.ok) return { error: r.error }; revalidatePath("/admin/broadcast"); return { ok: true, done: "draft", id: r.id }; }
  const when = str(fd, "scheduledFor") ? zonedToUtc(str(fd, "scheduledFor")) : null;
  if (when && Number.isNaN(when.getTime())) return { error: "Choose a valid date and time.", field: "scheduledFor" };
  const r = await sendBroadcast(a.actor.id, { ...base, scheduledFor: when, confirmCount: Number(str(fd, "confirmCount")) });
  if (!r.ok) return { error: r.error };
  revalidatePath("/admin/broadcast");
  return { ok: true, done: r.scheduled ? "scheduled" : "sent", recipients: r.recipients };
}

/** P05 "Send a test to my email": the template rendered with sample data, to the signed-in team member only. */
export async function templateTestAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("config"); if (!a.ok) return { error: a.error };
  const { templateDef, renderTemplate } = await import("@/lib/templates");
  const def = templateDef(str(fd, "key")); if (!def) return { error: "Template not found." };
  const { db } = await import("@/lib/db");
  const me = await db.user.findUnique({ where: { id: a.actor.id }, select: { email: true } }); if (!me) return { error: "Not found." };
  const t = await renderTemplate(def.key, def.sample);
  const { sendEmail } = await import("@/lib/integrations/email");
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  await sendEmail({ to: me.email, subject: `[Test] ${t.subject ?? def.label}`, html: `<div style="font-family:Arial,sans-serif;max-width:560px">${t.preheader ? `<p style="color:#6E655A">${esc(t.preheader)}</p>` : ""}<p>${esc(t.body).replace(/\n/g, "<br>")}</p>${t.cta ? `<p><b>[${esc(t.cta)}]</b></p>` : ""}${t.footer ? `<p style="color:#6E655A;font-size:12px">${esc(t.footer)}</p>` : ""}</div>` });
  return { ok: true, done: "test" };
}

/** A17 "Preview and send", step one: how many people the audience reaches right now. */
export async function broadcastPreviewAction(_: CState, fd: FormData): Promise<CState> {
  const a = await adminActor("content"); if (!a.ok) return { error: a.error };
  if (str(fd, "intent") !== "preview") return broadcastAction(_, fd);
  const { audienceCount } = await import("@/lib/admin-ops");
  const { validateBroadcast } = await import("@/lib/domain/admin-ops");
  const errs = validateBroadcast({ subject: str(fd, "subject"), body: str(fd, "body") }); if (errs.length) return { error: errs[0] };
  const audience = (AUDIENCES as readonly string[]).includes(str(fd, "audience")) ? (str(fd, "audience") as Audience) : "EVERYONE";
  return { ok: true, done: "preview", recipients: await audienceCount(audience), audience };
}
