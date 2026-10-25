import { PrismaClient } from "@prisma/client";
import { appendOnlyExtension } from "./append-only";

const make = () => new PrismaClient().$extends(appendOnlyExtension);
const g = globalThis as unknown as { prisma?: ReturnType<typeof make> };
export const db = g.prisma ?? make();
if (process.env.NODE_ENV !== "production") g.prisma = db;
