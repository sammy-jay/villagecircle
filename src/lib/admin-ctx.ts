import type { Role } from "@prisma/client";
import { getSession } from "./auth";
import { db } from "./db";
import { adminCounts } from "./admin-counts";
import { safetyCounts } from "./admin-counts-5a";
import { moderationCounts } from "./admin-counts-4";
import { PERMS, allows, permForPath, teamRoleOf, type Perm } from "./domain/admin-perms";
import { TEAM_ROLE_LABEL, type TeamRole } from "./domain/admin-safety-1";
import { shortName } from "./domain/views";

export interface ACtx {
  userId: string; name: string; short: string; roles: Role[]; teamRole: TeamRole; roleLabel: string; perms: Perm[];
  counts: { mentors: number; guardians: number; asks: number; incidents: number; help: number; moderation: number };
}

async function actorFor() {
  const s = await getSession();
  if (!s?.user?.id) return { to: "/admin/sign-in" } as const;
  if (!s.user.roles.includes("ADMIN") && !s.user.roles.includes("SAFEGUARDING_LEAD")) return { to: "/after-login" } as const;
  if (s.user.mfaRequired && !s.user.mfaPassed) return { to: "/admin/sign-in" } as const;
  const [u, m] = await Promise.all([
    db.user.findUnique({ where: { id: s.user.id }, select: { id: true, name: true, roles: true, status: true } }),
    db.teamMember.findUnique({ where: { userId: s.user.id } }),
  ]);
  if (!u || u.status === "SUSPENDED" || u.status === "CLOSED") return { to: "/admin/sign-in" } as const;
  const teamRole = teamRoleOf(u.roles, m?.teamRole);
  return { actor: { id: u.id, name: u.name, roles: u.roles, teamRole } } as const;
}

/**
 * Guard for every console page. Checks sign-in, the second step, and the team role's permission for this address
 * (or `perm` when given). A page the role cannot open sends them to the overview with a note.
 */
export async function adminPage(path: string, perm?: Perm): Promise<{ to: string } | { ctx: ACtx }> {
  const a = await actorFor();
  if ("to" in a) return { to: a.to === "/admin/sign-in" ? `/admin/sign-in?next=${encodeURIComponent(path)}` : a.to! };
  const { actor } = a;
  const need = perm ?? permForPath(path);
  if (!allows(actor.teamRole, actor.roles, need)) return { to: need === "overview" ? "/after-login" : "/admin?denied=1" };
  const [c, s, m] = await Promise.all([adminCounts(), safetyCounts(), moderationCounts()]);
  return {
    ctx: {
      userId: actor.id, name: actor.name, short: shortName(actor.name), roles: actor.roles, teamRole: actor.teamRole, roleLabel: TEAM_ROLE_LABEL[actor.teamRole],
      perms: (Object.keys(PERMS) as Perm[]).filter((p) => allows(actor.teamRole, actor.roles, p)),
      counts: { mentors: c.mentors, guardians: c.guardians, asks: c.asks, incidents: s.incidents, help: s.help, moderation: m.total },
    },
  };
}

/** Guard for console server actions: the same checks, returning the actor or an error message. */
export async function adminActor(perm: Perm): Promise<{ ok: true; actor: { id: string; name: string; roles: Role[]; teamRole: TeamRole } } | { ok: false; error: string }> {
  const a = await actorFor();
  if ("to" in a) return { ok: false, error: "Sign in to the console again." };
  if (!allows(a.actor.teamRole, a.actor.roles, perm)) return { ok: false, error: "Your team role does not allow this. Ask the program lead." };
  return { ok: true, actor: a.actor };
}
