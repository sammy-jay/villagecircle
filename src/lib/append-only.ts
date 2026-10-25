import { Prisma } from "@prisma/client";

/** Collections that must never be updated or deleted (BRD §11, audit + consent integrity). */
export const APPEND_ONLY_MODELS = ["AuditEvent", "Attestation", "ConsentRecord", "AskStateChange"] as const;
const BLOCKED = ["update", "updateMany", "upsert", "delete", "deleteMany"];

export function assertAppendOnly(model: string | undefined, operation: string) {
  if (model && (APPEND_ONLY_MODELS as readonly string[]).includes(model) && BLOCKED.includes(operation)) {
    throw new Error(`${model} is append-only: ${operation} is not permitted.`);
  }
}

export const appendOnlyExtension = Prisma.defineExtension({
  name: "append-only",
  query: { $allModels: { async $allOperations({ model, operation, args, query }) { assertAppendOnly(model, operation); return query(args); } } },
});
