import { db } from "./db";
export async function audit(actorId: string | null, action: string, object: string, objectId?: string, before?: unknown, after?: unknown) {
  await db.auditEvent.create({ data: { actorId: actorId ?? undefined, action, object, objectId, before: before as never, after: after as never } });
}
