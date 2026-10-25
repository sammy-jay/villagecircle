import { integrationStatus } from "../src/lib/integrations/status";
import { PrismaClient } from "@prisma/client";

(async () => {
  console.log("\nThe Village Circle — connection check\n");
  for (const i of integrationStatus()) console.log(`${i.configured ? "✔" : "·"} ${i.name.padEnd(34)} ${i.configured ? "configured" : "missing " + i.missing.join(", ")}`);
  if (process.env.DATABASE_URL) {
    try { const p = new PrismaClient(); await p.$runCommandRaw({ ping: 1 }); console.log("\n✔ MongoDB reachable"); await p.$disconnect(); }
    catch (e) { console.log("\n✘ MongoDB unreachable:", (e as Error).message); process.exitCode = 1; }
  } else console.log("\n· Set DATABASE_URL to test the database connection");
  console.log("\nUnconfigured integrations run in safe development mode (logged, not sent).\n");
})();
