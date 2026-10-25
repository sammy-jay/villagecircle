"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { markHelped, registerForEvent, saveResource, startAskNaming, unsaveResource } from "@/lib/village";
import { markAllRead, markRead } from "@/lib/notifications";

export type FeedState = { ok?: boolean; error?: string; on?: boolean };
const uid = async () => (await getSession())?.user?.id || redirect("/login");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** D1 tip card "Save" toggle. */
export async function saveAction(_: FeedState, fd: FormData): Promise<FeedState> {
  const id = await uid(); const on = fd.get("on") === "1";
  const r = on ? await saveResource(id, str(fd, "id")) : await unsaveResource(id, str(fd, "id"));
  revalidatePath("/village/saved");
  return r.ok ? { ok: true, on } : { error: r.error, on: !on };
}

/** D1 tip card "Helpful". One mark per person; it cannot be taken back. */
export async function helpedAction(_: FeedState, fd: FormData): Promise<FeedState> {
  const r = await markHelped(await uid(), str(fd, "id"));
  return r.ok ? { ok: true, on: true } : { error: r.error };
}

/** D1 and D20 "I am going". */
export async function goingAction(_: FeedState, fd: FormData): Promise<FeedState> {
  const on = fd.get("on") === "1";
  const r = await registerForEvent(await uid(), str(fd, "id"), on);
  revalidatePath("/home");
  return r.ok ? { ok: true, on } : { error: r.error, on: !on };
}

/** NT1: open a notification. Marks it read, then goes where it points. */
export async function openNotificationAction(fd: FormData) {
  const id = await uid();
  await markRead(id, str(fd, "id"));
  const to = str(fd, "to");
  redirect(to.startsWith("/") && !to.startsWith("//") ? to : "/notifications");
}
export async function markAllReadAction() {
  await markAllRead(await uid());
  revalidatePath("/notifications");
}

/** D18 "Ask Dr Bisi": starts a draft that names the mentor, then opens the wizard. */
export async function askMentorAction(fd: FormData) {
  const id = await uid();
  const r = await startAskNaming(id, str(fd, "mentorId"));
  if (!r.ok) redirect(`/village/directory/${str(fd, "mentorId")}?error=${encodeURIComponent(r.error)}`);
  redirect(`/asks/${r.id}/edit?step=tell`);
}
