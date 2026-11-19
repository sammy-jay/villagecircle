import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/dc/icons";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Note, Panel, Pill, Table, Td, day } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { COHORT_LABEL, TYPE_LABEL, libraryRows } from "@/lib/admin-village";
import { resourceReviewFormAction, resourceSaveAction } from "../content-actions";
import { RichEditorField } from "@/components/app/rich-editor";
import { BODY_MAX } from "@/lib/domain/resource-templates";

export const metadata = { title: "Library" };
export const dynamic = "force-dynamic";

const STATUS = { LIVE: ["Live", "mint"], REVIEW_DUE: ["Review due", "blush"], AWAITING: ["Awaiting review", "butter"], ARCHIVED: ["Archived", "sand"] } as const;

/** A13 Library admin: every resource with its review date. Stale advice is worse than none, so overdue items leave the library unless re-confirmed. */
export default async function Library({ searchParams }: { searchParams: { q?: string; type?: string; status?: string; id?: string; new?: string } }) {
  const r = await adminPage("/admin/library");
  if ("to" in r) redirect(r.to);
  const lib = await libraryRows();
  const q = (searchParams.q ?? "").toLowerCase();
  const rows = lib.rows.filter((x) => (!q || x.title.toLowerCase().includes(q) || x.topics.join(" ").toLowerCase().includes(q)) && (!searchParams.type || x.type === searchParams.type) && (!searchParams.status || x.status === searchParams.status));
  const sel = searchParams.id ? lib.rows.find((x) => x.id === searchParams.id) : null;
  const editing = sel || searchParams.new === "1";
  const href = (o: Record<string, string | undefined>) => `/admin/library?${new URLSearchParams(Object.entries({ q: searchParams.q, type: searchParams.type, status: searchParams.status, ...o }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Library" }}>
      <AdminHead eyebrow="Content" title="Library" sub="Answers, templates and recordings, each with a review date." right={<div className="flex gap-2"><Link href="/admin/library/review" className="dc-btn dc-btn-soft h-12">Review cycle</Link><Link href={href({ new: "1", id: undefined })} className="dc-btn dc-btn-primary h-12"><Icon name="upload" size={18} />Upload a resource</Link></div>} />
      <form className="flex flex-wrap gap-2" role="search">
        <div className="flex h-12 min-w-[240px] flex-1 items-center gap-2.5 rounded-full border border-line bg-card px-4"><Icon name="search" size={18} className="text-stone" /><input name="q" type="search" defaultValue={searchParams.q ?? ""} aria-label="Search by title or topic" placeholder="Search by title or topic" className="min-w-0 flex-1 bg-transparent placeholder:text-stone focus:outline-none" /></div>
        <select name="type" defaultValue={searchParams.type ?? ""} aria-label="Type" className="h-12 rounded-full border border-line bg-card px-4 text-[14px] font-semibold"><option value="">Type: all</option>{Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select name="status" defaultValue={searchParams.status ?? ""} aria-label="Status" className="h-12 rounded-full border border-line bg-card px-4 text-[14px] font-semibold"><option value="">Status: all</option>{Object.entries(STATUS).map(([v, [l]]) => <option key={v} value={v}>{l}</option>)}</select>
        <button type="submit" className="dc-btn dc-btn-forest h-12">Filter</button>
      </form>
      {lib.dueCount > 0 && <Note tone="blush" icon="alert">{lib.dueCount} item{lib.dueCount === 1 ? " is" : "s are"} due for review. Stale advice is worse than none.{lib.earliestDue ? ` The first leaves the library on ${day(lib.earliestDue, { day: "numeric", month: "long" })} unless a reviewer re-confirms it.` : ""}</Note>}
      <div className={editing ? "grid gap-5 lg:grid-cols-[1fr_380px]" : ""}>
        {rows.length ? (
          <Table head={["Title", "Type", "Contributor", "Last reviewed", "Status", ""]} minWidth={760} caption="Library resources">
            {rows.map((x) => { const [l, t] = STATUS[x.status]; return (
              <tr key={x.id} className={x.id === sel?.id ? "bg-butter/40" : "hover:bg-paper"}>
                <Td><b className="font-semibold">{x.title}</b><span className="block text-[12.5px] text-stone">{x.topics.join(", ")}</span></Td>
                <Td>{x.typeLabel}</Td><Td>{x.contributor}</Td><Td>{x.lastReviewed ?? "Not yet"}</Td><Td><Pill tone={t}>{l}</Pill></Td>
                <Td><Link href={href({ id: x.id, new: undefined })} className="font-bold text-clay">Edit</Link></Td>
              </tr>
            ); })}
          </Table>
        ) : <Empty title="No resources found">Upload the first one, or clear the filters.</Empty>}
        {editing && (
          <Panel className="self-start">
            <h2 className="font-display text-[21px] font-extrabold">{sel ? "Edit resource" : "Upload a resource"}</h2>
            <ActionForm action={resourceSaveAction} className="mt-3" ok={{ saved: "Saved.", published: "Saved and re-confirmed. The review clock starts today." }}>
              {sel && <input type="hidden" name="id" value={sel.id} />}
              <div><label htmlFor="title" className="dc-label">Title</label><input id="title" name="title" defaultValue={sel?.title} className="dc-input" /></div>
              <div><p className="dc-label">Type</p><Select name="type" defaultValue={sel?.type ?? "ARTICLE"} options={Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }))} /></div>
              <div><p className="dc-label">Contributor</p><Select name="contributorId" defaultValue={sel?.contributorId ?? ""} options={[{ value: "", label: "Village team" }, ...lib.mentors.map((m) => ({ value: m.id, label: m.name }))]} /></div>
              <div><label htmlFor="topic" className="dc-label">Topic tag</label><input id="topic" name="topic" defaultValue={sel?.topics[0]} className="dc-input" /><input name="moreTopics" defaultValue={sel?.topics.slice(1).join(", ")} placeholder="Add another tag (optional)" aria-label="More tags" className="dc-saymore mt-[7px]" /><span className="dc-hint">Admissions, legal and immigration topics expire after six months.</span></div>
              <fieldset><legend className="dc-label">Who it is for</legend><div className="flex flex-wrap gap-1.5">{Object.entries(COHORT_LABEL).map(([v, l]) => <label key={v} className="cursor-pointer"><input type="checkbox" name="cohort" value={v} defaultChecked={sel?.cohorts.includes(v as never)} className="peer sr-only" /><span className="inline-block rounded-full bg-sand px-3 py-1.5 text-[13px] font-semibold peer-checked:bg-forest peer-checked:text-forest-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink">{l}</span></label>)}</div></fieldset>
              <div><label htmlFor="body" className="dc-label">Text</label><RichEditorField key={sel?.id ?? "new"} id="body" name="body" label="Text" defaultValue={sel?.body} max={BODY_MAX} rows={10} sections /><span className="dc-hint">Section headings become &ldquo;In this article&rdquo; on the library page.</span></div>
              <div><label htmlFor="fileKey" className="dc-label">File key or link</label><input id="fileKey" name="fileKey" defaultValue={sel?.fileKey} placeholder="resources/name.pdf" className="dc-input" /></div>
              <div className="flex flex-wrap gap-2"><Submit name="intent" value="publish" icon="check">Save and re-confirm</Submit><Submit name="intent" value="save" variant="soft">Save changes</Submit><Link href={href({ id: undefined, new: undefined })} className="dc-btn dc-btn-ghost h-[50px]">Cancel</Link></div>
            </ActionForm>
            {sel && sel.status !== "ARCHIVED" && (
              <ActionForm action={resourceReviewFormAction} className="mt-4 border-t border-line pt-4" ok="Archived. It is hidden and the record is kept." confirm={{ title: "Archive this resource?", body: "It leaves the library. The record is kept.", confirmLabel: "Archive", danger: true }}>
                <input type="hidden" name="id" value={sel.id} /><input type="hidden" name="outcome" value="ARCHIVE" />
                <input name="note" className="dc-saymore" placeholder="Why archive (10 characters or more)" aria-label="Why archive" />
                <Submit variant="outline" icon="trash" className="self-start">Archive</Submit>
              </ActionForm>
            )}
          </Panel>
        )}
      </div>
      <Note tone="butter" icon="book">Seed resources must exist at launch, or the 20% &ldquo;answered by a resource&rdquo; objective cannot be met.</Note>
    </AdminShell>
  );
}
