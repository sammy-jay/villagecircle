import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Note, Panel, Person, Pill, Table, Td } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { teamList } from "@/lib/admin-accounts";
import { MATRIX, can } from "@/lib/domain/admin-perms";
import { TEAM_ROLES, TEAM_ROLE_LABEL } from "@/lib/domain/admin-safety-1";
import { changeRoleAction, inviteAction, resendInviteAction } from "../people-actions";

export const metadata = { title: "Team roles" };
export const dynamic = "force-dynamic";

const ROLE_OPTS = TEAM_ROLES.map((r) => ({ value: r, label: TEAM_ROLE_LABEL[r] }));

/** A19 Team roles: invite people, the permission matrix that the console enforces, and each member's role and two-step status. */
export default async function Roles() {
  const r = await adminPage("/admin/roles");
  if ("to" in r) redirect(r.to);
  const team = await teamList();
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Team roles" }}>
      <AdminHead eyebrow="People" title="Team roles" sub="Each role opens only the pages and actions it needs. This table is the rule the console follows." />
      <Panel>
        <h2 className="font-display text-[21px] font-extrabold">Invite a team member</h2>
        <ActionForm action={inviteAction} className="mt-3" ok="Invited. They get an email to set a password, then set up two-step sign-in.">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
            <div><label htmlFor="iname" className="dc-label">Name</label><input id="iname" name="name" className="dc-input" /></div>
            <div><label htmlFor="iemail" className="dc-label">Email</label><input id="iemail" name="email" type="email" className="dc-input" /></div>
            <div><p className="dc-label">Role</p><Select name="teamRole" defaultValue="REVIEWER" options={ROLE_OPTS} /></div>
          </div>
          <input name="note" className="dc-saymore" placeholder="Note (optional), for example: training in progress" aria-label="Note" />
          <Submit icon="send" className="self-start">Send invite</Submit>
        </ActionForm>
      </Panel>
      <Table head={["Permission", ...TEAM_ROLES.map((x) => TEAM_ROLE_LABEL[x])]} minWidth={760} caption="What each team role can do">
        {MATRIX.map(([label, perm]) => (
          <tr key={label}><Td className="font-semibold">{label}</Td>{TEAM_ROLES.map((role) => <Td key={role} className="text-center">{can(role, perm) ? <><Icon name="check" size={18} className="mx-auto text-forest" /><span className="sr-only">Yes</span></> : <><span aria-hidden="true" className="text-stone">–</span><span className="sr-only">No</span></>}</Td>)}</tr>
        ))}
      </Table>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-[23px] font-extrabold">Team members</h2><Pill tone="sand">{team.length} {team.length === 1 ? "person" : "people"}</Pill></div>
        <Table head={["Team member", "Role", "Status", "Two-step", ""]} minWidth={820} caption="Team members">
          {team.map((m) => (
            <tr key={m.id}>
              <Td><Person name={m.name} size={36} sub={m.note ?? m.roleLabel} /></Td>
              <Td>{m.id === r.ctx.userId ? m.roleLabel : (
                <ActionForm action={changeRoleAction} ok="Changed." className="flex-row items-center gap-2"><input type="hidden" name="id" value={m.id} /><div className="w-[200px]"><Select name="teamRole" defaultValue={m.teamRole} options={ROLE_OPTS} /></div><Submit variant="soft" className="h-11">Change role</Submit></ActionForm>
              )}</Td>
              <Td><Pill tone={m.suspended ? "blush" : m.invited ? "butter" : "mint"}>{m.suspended ? "Suspended" : m.invited ? "Invited" : "Active"}</Pill></Td>
              <Td>{m.mfa ? "On" : <span className="text-clay">Not set up</span>}</Td>
              <Td>{m.invited && <ActionForm action={resendInviteAction} ok="Sent."><input type="hidden" name="id" value={m.id} /><Submit variant="ghost" className="h-10">Resend invite</Submit></ActionForm>}</Td>
            </tr>
          ))}
        </Table>
      </section>
      <Note tone="butter" icon="shieldCheck">Two-step sign-in is required for every team account. People without it cannot open the console. You cannot change your own role.</Note>
      <Note tone="sand" icon="lock">Recordings are visible only to the safeguarding lead, the guardian and the parties, so no other role gets that permission (NFR-05).</Note>
    </AdminShell>
  );
}
