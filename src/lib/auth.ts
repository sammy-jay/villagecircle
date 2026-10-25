import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import type { Role } from "@prisma/client";
import { db } from "./db";
import { verifyPassword, MAX_FAILED, LOCK_MINUTES, lockState } from "./password";
import { requiresMfa } from "./domain/permissions";

// Auth.js: JWT sessions (credentials need them). MFA state lives in the token and is set only after a TOTP check.
declare module "next-auth" {
  interface Session { user: { id: string; name?: string | null; email?: string | null; roles: Role[]; mfaRequired: boolean; mfaPassed: boolean } }
}
declare module "next-auth/jwt" { interface JWT { uid?: string; roles?: Role[]; mfaPassed?: boolean } }

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db as never),
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" })] : []),
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: {}, password: {} },
      async authorize(cred) {
        if (!cred?.email || !cred.password) return null;
        const user = await db.user.findUnique({ where: { email: cred.email.toLowerCase().trim() } });
        if (!user?.passwordHash || user.status === "CLOSED" || user.status === "SUSPENDED") return null;
        if (lockState(user.failedLogins, user.lockedUntil).locked) return null;
        const ok = await verifyPassword(cred.password, user.passwordHash);
        if (!ok) {
          const failed = user.failedLogins + 1;
          await db.user.update({ where: { id: user.id }, data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null } });
          return null;
        }
        await db.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) { token.uid = user.id; token.mfaPassed = false; }
      if (token.uid) {
        const u = await db.user.findUnique({ where: { id: token.uid }, select: { roles: true, status: true } });
        if (!u || u.status === "CLOSED" || u.status === "SUSPENDED") return {} as never;
        token.roles = u.roles;
      }
      // Client-supplied update data is NOT trusted: MFA passes only if the server recorded a fresh TOTP check.
      if (trigger === "update" && token.uid) {
        const u = await db.user.findUnique({ where: { id: token.uid }, select: { mfaVerifiedAt: true } });
        if (u?.mfaVerifiedAt && Date.now() - u.mfaVerifiedAt.getTime() < 2 * 60_000) token.mfaPassed = true;
      }
      return token;
    },
    async session({ session, token }) {
      const roles = token.roles ?? [];
      session.user = { ...session.user, id: token.uid ?? "", roles, mfaRequired: requiresMfa(roles), mfaPassed: !!token.mfaPassed };
      return session;
    },
  },
};

export const getSession = () => getServerSession(authOptions);

/** Server-side guard: redirect-free; callers decide what to do with null. Admin areas also require a passed second factor. */
export async function requireRole(...allowed: Role[]) {
  const s = await getSession();
  if (!s?.user?.id) return { ok: false as const, reason: "unauthenticated" as const };
  if (!s.user.roles.some((r) => allowed.includes(r))) return { ok: false as const, reason: "forbidden" as const };
  if (s.user.mfaRequired && !s.user.mfaPassed) return { ok: false as const, reason: "mfa" as const };
  return { ok: true as const, user: s.user };
}
