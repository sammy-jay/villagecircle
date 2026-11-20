import Link from "next/link";
import { redirect } from "next/navigation";
import { Select } from "@/components/dc/client";
import { AdminHead, AdminShell } from "@/components/app/admin-shell";
import { Empty, FilterPills, Note, Panel, Pill, Table, Td } from "@/components/app/admin-kit";
import { ActionForm, Submit } from "@/components/app/action-form";
import { adminPage } from "@/lib/admin-ctx";
import { EVENT_TYPE_LABEL, eventHostOptions, eventRows } from "@/lib/admin-village";
import { hostLabel, MAX_HOSTS, TEAM_HOST, TEAM_HOST_NAME } from "@/lib/domain/event-hosts";
import { HostPicker } from "./host-picker";
import { APP_TZ, tzLabel } from "@/lib/domain/scheduling";
import { eventSaveAction } from "../content-actions";

export const metadata = { title: "Events" };
export const dynamic = "force-dynamic";

const STATUS = { OPEN: ["Open", "mint"], FULL: ["Full", "butter"], HELD: ["Held", "sand"] } as const;
const REC = { NONE: "After the event", PENDING: "With the team", LIVE: "Added to library" };
/** "2026-11-03T19:00" in the app's zone, for a datetime-local field. */
const localValue = (iso: string) => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: APP_TZ(), hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; };

/** A14 Events: workshops, panels, office hours and orientation. Recordings go to the library after the event, through moderation. */
export default async function Events({ searchParams }: { searchParams: { show?: string; id?: string } }) {
  const r = await adminPage("/admin/events");
  if ("to" in r) redirect(r.to);
  const [all, mentors] = await Promise.all([eventRows(), eventHostOptions()]);
  const hostOptions = [...mentors.map((m) => ({ value: m.id, label: hostLabel(m) })), { value: TEAM_HOST, label: TEAM_HOST_NAME }];
  const show = searchParams.show as keyof typeof STATUS | undefined;
  const rows = show ? all.filter((e) => e.status === show) : all;
  const sel = searchParams.id ? all.find((e) => e.id === searchParams.id) : undefined;
  const zone = tzLabel(new Date());
  return (
    <AdminShell ctx={r.ctx} phone={{ title: "Events" }}>
      <AdminHead eyebrow="Content" title="Events" sub="Community events, webinars and panels." />
      <FilterPills items={[{ href: "/admin/events", label: "All", n: all.length, on: !show }, ...(Object.keys(STATUS) as (keyof typeof STATUS)[]).map((k) => ({ href: `/admin/events?show=${k}`, label: STATUS[k][0], n: all.filter((e) => e.status === k).length, on: show === k }))]} />
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {rows.length ? (
          <Table head={["Event", "Date", "Registered", "Status", "Recording", ""]} minWidth={700} caption="Events">
            {rows.map((e) => (
              <tr key={e.id} className={e.id === sel?.id ? "bg-butter/40" : "hover:bg-paper"}>
                <Td><b className="font-semibold">{EVENT_TYPE_LABEL[e.type]}: {e.title}</b><span className="block text-[12.5px] text-stone">{e.host}</span></Td>
                <Td>{e.dateLabel}</Td><Td>{e.registered} / {e.capacity ?? "no limit"}</Td><Td><Pill tone={STATUS[e.status][1]}>{STATUS[e.status][0]}</Pill></Td><Td className="text-[14px]">{REC[e.recording]}</Td>
                <Td><Link href={`/admin/events?id=${e.id}`} className="font-bold text-clay">Edit</Link></Td>
              </tr>
            ))}
          </Table>
        ) : <Empty title="No events">Create the first one on the right.</Empty>}
        <Panel className="self-start">
          <div className="flex items-center justify-between gap-2"><h2 className="font-display text-[21px] font-extrabold">{sel ? "Edit event" : "Create an event"}</h2>{sel && <Link href="/admin/events" className="text-[14px] font-bold text-clay">New</Link>}</div>
          <ActionForm key={sel?.id ?? "new"} action={eventSaveAction} className="mt-3" ok={{ created: "Created.", saved: "Saved." }}>
            {sel && <input type="hidden" name="id" value={sel.id} />}
            <div><label htmlFor="title" className="dc-label">Title</label><input id="title" name="title" defaultValue={sel?.title} className="dc-input" /></div>
            <div><label htmlFor="startsAt" className="dc-label">Date and time ({zone})</label><input id="startsAt" name="startsAt" type="datetime-local" defaultValue={sel ? localValue(sel.startsAtISO) : undefined} className="dc-input" /></div>
            <div><p className="dc-label">Type</p><Select name="type" defaultValue={sel?.type ?? "WORKSHOP"} options={Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => ({ value, label }))} /></div>
            <div><label htmlFor="capacity" className="dc-label">Capacity</label><input id="capacity" name="capacity" type="number" min={1} defaultValue={sel?.capacity ?? undefined} className="dc-input" /><span className="dc-hint">Leave empty for no limit.</span></div>
            <HostPicker options={hostOptions} initial={sel?.hostValues ?? []} unmatched={sel?.hostUnmatched ?? []} max={MAX_HOSTS} />
            <div><label htmlFor="location" className="dc-label">Where (optional)</label><input id="location" name="location" defaultValue={sel?.location} placeholder="Online, link sent to people who register" className="dc-input" /></div>
            <div><label htmlFor="description" className="dc-label">Description (optional)</label><textarea id="description" name="description" rows={2} defaultValue={sel?.description} className="dc-textarea" /></div>
            <div><label htmlFor="rec" className="dc-label">Recording file key (after the event)</label><input id="rec" name="recordingKey" defaultValue={sel?.recordingKey} className="dc-input" /><span className="dc-hint">The recording goes to the library as a draft, and a person reads it first.</span></div>
            <Submit className="self-start">{sel ? "Save changes" : "Create event"}</Submit>
          </ActionForm>
        </Panel>
      </div>
      <Note tone="sand" icon="info">Times are shown in {zone}, the platform&apos;s time zone.</Note>
    </AdminShell>
  );
}
