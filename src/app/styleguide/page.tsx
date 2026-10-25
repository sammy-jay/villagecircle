import type { ReactNode } from "react";
import {
  AdminBreadcrumb, AdminMenu, AskTag, Avatar, AvatarStack, Banner, Button, Card, Count, EmptyState, Field, Icon, Input,
  Moment, PageHead, SearchInput, StoryRing, Tag, Timeline, withCounts, ADMIN_NAV, type AskTagKey,
} from "@/components/dc";
import { DemoChips, DemoCode, DemoFeedback, DemoInputs, DemoSignatures, DemoTabBars, DemoTabs, DemoToggles } from "./demos";

export const metadata = { title: "Styleguide" };

const SWATCHES: [name: string, hex: string, note: string, cls: string][] = [
  ["Clay", "#A8472B", "The one action colour", "bg-clay text-clay-ink"],
  ["Forest", "#4A7E62", "Selected, done, checks", "bg-forest text-forest-ink"],
  ["Mint", "#D5EBD9", "Calm, safe, approved", "bg-mint text-mint-ink"],
  ["Butter", "#F7E4A8", "Your turn, highlight", "bg-butter text-butter-ink"],
  ["Blush", "#F8D9CB", "Thanks, warm, caution", "bg-blush text-blush-ink"],
  ["Gold", "#C99A2E", "Story ring accent", "bg-gold text-ink"],
  ["Ink", "#1D1914", "Text and headings", "bg-ink text-paper"],
  ["Paper", "#F7F5F0", "Page background", "bg-paper text-ink border border-line"],
  ["Sand", "#EEEAE1", "Chips, quiet fills", "bg-sand text-ink border border-line"],
  ["Line", "#E4DFD5", "1px borders", "bg-line text-ink"],
];

const ASK_STATES: AskTagKey[] = ["DRAFT", "AWAITING_GUARDIAN", "IN_TEAM_REVIEW", "MENTOR_STEPPED_FORWARD", "SCHEDULED", "COMPLETE", "WITHDRAWN", "PAUSED", "NEEDS_INFO"];

function Section({ n, title, sub, children }: { n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-ink font-display text-[17px] font-extrabold text-paper">{n}</span>
        <div><h2 className="dc-h2">{title}</h2><p className="text-chip text-stone">{sub}</p></div>
      </div>
      {children}
    </section>
  );
}

export default function Styleguide() {
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-4 pb-24 pt-12 sm:px-14">
      <PageHead eyebrow="Design system" title="Village Square foundations v2"
        sub="Everything the screens use: colour, type, buttons, status tags, inputs with Say more, the legal-name signature, the nested admin menu and breadcrumb, tab bars, empty states, toasts, modals and bottom sheets." />

      <Section n={1} title="Colour" sub="Clay leads. Forest is the softer green. Pastels carry meaning.">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-5">
          {SWATCHES.map(([name, hex, note, cls]) => (
            <div key={name}>
              <div className={`flex h-[104px] items-end rounded-card p-3.5 font-display text-[19px] font-extrabold ${cls}`}>{name}</div>
              <p className="mt-2 text-caption font-bold text-ink">{hex}</p><p className="text-caption text-stone">{note}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Tag tone="butter">Butter text #4B3A08</Tag><Tag tone="mint">Mint text #1F4733</Tag><Tag tone="blush">Blush text #6E2A14</Tag>
        </div>
      </Section>

      <Section n={2} title="Type scale" sub="Bricolage Grotesque for headings, Figtree for everything you read.">
        <div className="dc-panel space-y-4 p-6">
          <p className="dc-display max-sm:text-h1">Ask the village</p>
          <p className="dc-h1">Your Asks</p>
          <p className="dc-h2">Dr Bisi stepped forward</p>
          <p className="dc-h3">Pick a time that works</p>
          <p className="text-body font-bold">Figtree 17 body. A short question about school, work or life. A person on our team reads it first.</p>
          <p className="dc-support">Figtree 14.5 supporting copy sits under headings and in cards.</p>
          <p className="dc-caption">Figtree 12.5 captions, times and hints</p>
          <p className="dc-eyebrow">Eyebrow 12 / 800 / caps</p>
        </div>
      </Section>

      <Section n={3} title="Buttons" sub="Fully rounded, 50px tall, bold.">
        <div className="dc-panel p-[22px]">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" icon="plus">Ask the village</Button>
            <Button variant="forest">Save</Button>
            <Button>Not now</Button>
            <Button variant="soft">Skip</Button>
            <Button variant="soft" disabled>Disabled</Button>
            <Button size="sm">Small</Button>
          </div>
          <Button variant="primary" size="lg" icon="send" className="mt-3.5">Full width primary</Button>
          <p className="mt-3 text-label text-stone">One clay button per view. Ghost and soft for everything else. Touch height 44 or more.</p>
        </div>
      </Section>

      <Section n={4} title="Pills, status tags and counts" sub="Chips, status and badges.">
        <div className="dc-panel space-y-5 p-[22px]">
          <div><p className="dc-kicker mb-2">Filters and choices</p><DemoChips /></div>
          <div>
            <p className="dc-kicker mb-2">Tone and status</p>
            <div className="flex flex-wrap gap-2">
              <Tag tone="mint" icon="check">Approved</Tag><Tag tone="butter" icon="clock">Waiting</Tag><Tag tone="blush" icon="alert">Needs you</Tag>
              <Tag>Draft</Tag><Tag tone="mint" icon="shieldCheck" className="text-chip">Reviewed by the team</Tag><Tag tone="outline">Your Ask</Tag>
            </div>
          </div>
          <div><p className="dc-kicker mb-2">Ask status tags</p><div className="flex flex-wrap gap-2">{ASK_STATES.map((s) => <AskTag key={s} state={s} />)}</div></div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Count n={7} /><Count n={12} /><Count n={3} />
            <span className="text-chip text-stone">Clay count badges sit on nav items. Green, amber and rose tags carry meaning; grey is for plain state.</span>
          </div>
        </div>
      </Section>

      <Section n={5} title="Inputs" sub="Fields, a closed dropdown, an open dropdown with Say more, and the legal-name signature (empty and signed).">
        <div className="dc-panel grid gap-5 p-[22px] md:grid-cols-3">
          <div className="space-y-4">
            <Field label="First name" htmlFor="sg-first"><Input id="sg-first" defaultValue="Amara" /></Field>
            <Field label="Email" htmlFor="sg-email" hint="Add the part after the @ sign"><Input id="sg-email" icon="mail" defaultValue="amara@example" aria-invalid /></Field>
            <SearchInput placeholder="Search mentors, tips and events" aria-label="Search" />
          </div>
          <DemoInputs />
        </div>
        <DemoSignatures />
        <div className="dc-panel mt-3.5 p-[22px]"><p className="dc-kicker mb-3">Code entry</p><DemoCode /></div>
      </Section>

      <Section n={6} title="Cards" sub="White 24px cards on paper. Pastel blocks for the big moments.">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-[19px]">
            <div className="flex items-center gap-2.5"><Avatar name="Bisi O" size="lg" tone="mint" /><div className="text-caption"><p className="font-bold text-ink">Dr Bisi O.</p><p className="text-stone">Medicine · Quick tip · 2 h</p></div></div>
            <p className="mt-3 rounded-field bg-mint px-4 py-[15px] font-display text-[21px] font-extrabold leading-[1.2] text-mint-ink">5 things I wish I knew before choosing a degree</p>
            <div className="mt-3 flex gap-5 text-chip font-semibold text-bark"><span className="flex items-center gap-1.5"><Icon name="heart" className="text-clay" />Helpful 128</span><span className="flex items-center gap-1.5"><Icon name="bookmark" />Save</span></div>
          </Card>
          <Moment tag="Your Ask" title="Dr Bisi stepped forward for your Ask" sub="Pick a time that works." progress={0.75} />
          <div className="dc-moment dc-moment-blush">
            <p className="font-display text-[21px] font-extrabold leading-[1.2]">&ldquo;I finally know what to do this year. I almost did not ask.&rdquo;</p>
            <p className="mt-2 text-chip font-semibold">Tunde, 17 thanked Sam E.</p>
          </div>
        </div>
      </Section>

      <Section n={7} title="Tabs, toggles and avatars" sub="Chips for tabs, forest for on, rings for stories.">
        <div className="grid gap-4 md:grid-cols-3">
          <DemoTabs />
          <DemoToggles />
          <div className="dc-panel p-[22px]">
            <p className="dc-kicker mb-3">Avatars and story rings</p>
            <div className="flex items-center gap-3.5"><Avatar name="Amara O" size="xs" /><Avatar name="Bisi O" size="lg" /><Avatar name="Sam E" size="xl" /></div>
            <div className="mt-4 flex gap-1.5"><StoryRing name="Amara O" caption="Your Ask" ring="clay" /><StoryRing name="Bisi O" caption="Dr Bisi" /><StoryRing name="Sam E" caption="Sam E." /></div>
            <div className="mt-4"><AvatarStack names={["Amara O", "Bisi O", "Sam E", "Tomi A"]} more={12} /></div>
          </div>
        </div>
      </Section>

      <Section n={8} title="Tables, banners and timeline" sub="Tables stay calm. Banners use pastel tones.">
        <div className="dc-panel overflow-x-auto p-0">
          <table className="w-full min-w-[560px] border-collapse">
            <thead><tr><th className="dc-th">Name</th><th className="dc-th">Role</th><th className="dc-th">Joined</th><th className="dc-th">Status</th></tr></thead>
            <tbody>
              {([["Tomi A", "Lagos", "14 Oct", "Approved", "mint"], ["Ife B", "Ibadan", "16 Oct", "In review", "grey"], ["Sam E", "Abuja", "19 Oct", "Needs info", "blush"]] as const).map(([n, city, d, s, tone]) => (
                <tr key={n}>
                  <td className="dc-td"><div className="flex items-center gap-3"><Avatar name={n} size="sm" /><div><p className="font-semibold">{n}.</p><p className="text-caption text-stone">{city}</p></div></div></td>
                  <td className="dc-td">Mentor</td><td className="dc-td">{d}</td><td className="dc-td"><Tag tone={tone}>{s}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2.5">
            <Banner tone="mint">Your guardian approved this time.</Banner>
            <Banner tone="butter">Waiting for your guardian to approve.</Banner>
            <Banner tone="blush">Please remove the phone number.</Banner>
          </div>
          <Card className="p-[23px]">
            <Timeline steps={[
              { title: "Ask sent", meta: "Mon 19 Oct", state: "done" },
              { title: "Team review", meta: "Done in 2 days", state: "done" },
              { title: "Mentor stepped forward", meta: "Today", state: "current" },
              { title: "Pick a time", meta: "Next", state: "next" },
            ]} />
          </Card>
        </div>
      </Section>

      <Section n={9} title="Navigation" sub="Side menu on desktop, breadcrumb plus menu and tab bar on the phone. Admin never uses tabs to change page.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="dc-panel p-4"><p className="dc-kicker mb-3">Admin side menu (desktop)</p><AdminMenu groups={withCounts(ADMIN_NAV, { "/admin/mentors": 7, "/admin/asks": 12, "/admin/incidents": 1, "/admin/moderation": 4, "/admin/help": 2 })} /></div>
          <div className="dc-panel p-4"><p className="dc-kicker mb-3">Admin breadcrumb (phone)</p><AdminBreadcrumb /></div>
          <DemoTabBars />
        </div>
      </Section>

      <Section n={10} title="Empty states, toasts, modals and sheets" sub="Quiet feedback first. A modal asks one question. On the phone it becomes a bottom sheet.">
        <div className="grid gap-4 md:grid-cols-2">
          <Card><EmptyState title="You haven't asked the village anything yet" action={<Button variant="primary" icon="plus">Start an Ask</Button>}>An Ask is a short question about school, work or life. The team reads it first.</EmptyState></Card>
          <DemoFeedback />
        </div>
      </Section>

      <Section n={11} title="Dark theme" sub="Same shapes, softer colours.">
        <div data-theme="dark" className="rounded-panel p-[22px]">
          <h3 className="dc-h3 mb-4">In the dark</h3>
          <div className="grid gap-3.5 md:grid-cols-3">
            <Card className="p-4"><div className="flex items-center gap-2.5"><Avatar name="Bisi O" /><p className="text-support font-semibold">Dr Bisi O. shared a tip</p></div><Button variant="primary" icon="plus" className="mt-3 w-full">Ask the village</Button></Card>
            <Moment title="Dr Bisi stepped forward for your Ask" sub="Pick a time that works." />
            <Card className="p-4"><DemoChips /><Banner tone="mint" className="mt-3">Your guardian approved this time.</Banner></Card>
          </div>
        </div>
      </Section>
    </main>
  );
}
