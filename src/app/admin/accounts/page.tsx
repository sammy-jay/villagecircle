import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, Panel, Person, Pill, Table, Td } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { accountDetail, accountList } from "@/lib/admin-accounts";
import { canDeleteData } from "@/lib/domain/admin-safety-1";
import { createAccountAction } from "../people-actions";
import { AccountDetail } from "./detail";

export const metadata = { title: "Accounts" };
export const dynamic = "force-dynamic";

const TONE = { good: "mint", warn: "butter", bad: "blush", neutral: "sand" } as const;

/** A16 Accounts: search people, see roles, status and two-step sign-in, and manage one account. */
export default async function Accounts({ searchParams }: { searchParams: { q?: string; id?: string; create?: string } }) {
  const r = await adminPage("/admin/accounts");
  if ("to" in r) redirect(r.to);
  const c = r.ctx;
  const rows = await accountList(searchParams.q);
  const sel = searchParams.id ? await accountDetail(searchParams.id) : null;
  const canSuspend = c.perms.includes("accounts.suspend");
  return (
    <AdminShell ctx={c} phone={{ title: "Accounts" }}>
      <AdminHead eyebrow="People" title="Accounts" sub="Everyone with an account. Contact details stay hidden; reveal one from Search when you need it, and it is logged." right={c.perms.includes("team") ? <Link href="/admin/accounts?create=1" className="dc-btn dc-btn-primary h-12"><Icon name="plus" size={18} />Create an account</Link> : undefined} />
      {searchParams.create === "1" && c.perms.includes("team") && (
        <Panel>
          <h2 className="font-display text-[21px] font-extrabold">Create an account</h2>
          <ActionForm action={createAccountAction} className="mt-3" ok="Created. They get an email to choose their own password.">
            <div className="grid gap-3 lg:grid-cols-3">
              <div><label htmlFor="n" className="dc-label">Name</label><input id="n" name="name" className="dc-input" /></div>
              <div><label htmlFor="e" className="dc-label">Email</label><input id="e" name="email" type="email" className="dc-input" /></div>
              <div><p className="dc-label">Role</p><Select name="role" defaultValue="MENTOR" options={[{ value: "MENTOR", label: "Mentor" }, { value: "PARTICIPANT", label: "Participant" }, { value: "GUARDIAN", label: "Guardian" }]} /></div>
            </div>
            <p className="text-[13px] text-stone">Team members are invited from Team roles. Admin and safeguarding lead are never created here.</p>
            <Submit className="self-start">Create</Submit>
          </ActionForm>
        </Panel>
      )}
      <form role="search" className="flex h-12 max-w-[460px] items-center gap-2.5 rounded-full border border-line bg-card px-4"><Icon name="search" size={18} className="text-stone" /><input name="q" type="search" defaultValue={searchParams.q ?? ""} aria-label="Search by name or email" placeholder="Search by name or email" className="min-w-0 flex-1 bg-transparent placeholder:text-stone focus:outline-none" /></form>
      <div className={sel ? "grid gap-5 lg:grid-cols-[1fr_340px]" : ""}>
        {rows.length ? (
          <Table head={["Name", "Roles", "Status", "Two-step sign-in", "Place", ""]} minWidth={720} caption="Accounts">
            {rows.map((x) => (
              <tr key={x.id} className={x.id === sel?.id ? "bg-butter/40" : "hover:bg-paper"}>
                <Td><Person name={x.name} size={34} /></Td><Td className="text-[14px]">{x.rolesLabel}</Td><Td><Pill tone={TONE[x.status.tone]}>{x.status.label}</Pill></Td>
                <Td className="text-[14px]">{x.twoStep}</Td><Td className="text-[14px]">{x.place}</Td>
                <Td><Link href={`/admin/accounts?${new URLSearchParams({ ...(searchParams.q ? { q: searchParams.q } : {}), id: x.id })}`} className="font-bold text-clay max-lg:hidden">Manage</Link><Link href={`/admin/accounts/${x.id}`} className="font-bold text-clay lg:hidden">Manage</Link></Td>
              </tr>
            ))}
          </Table>
        ) : <Empty title="Nobody found">Try part of a name or an email.</Empty>}
        {sel && <div className="max-lg:hidden"><AccountDetail a={sel} canSuspend={canSuspend} canDelete={canDeleteData(c.roles)} /></div>}
      </div>
    </AdminShell>
  );
}
