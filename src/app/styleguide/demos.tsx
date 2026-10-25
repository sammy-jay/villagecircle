"use client";

import { useState } from "react";
import {
  Button, Checkbox, Chip, CodeInput, CountedTextarea, Field, Modal, PillTabs, RadioCard, Select, Signature, TabBar, Toggle, UnderlineTabs,
  useToast, PARTICIPANT_TABS, MENTOR_TABS, ADMIN_TABS,
} from "@/components/dc";

const BACKGROUND = ["Rural or small town", "Single-parent home", "Migrant or relocated", "First in my family to go to college", "Prefer not to say", "Other"].map((l) => ({ value: l, label: l }));
const STATEMENT = "I confirm everything above is true, that I have read and agree to the Code of Conduct and Safeguarding Policy, and that typing my legal name is my signature.";

function Chips() {
  const [on, setOn] = useState("All");
  return <div className="flex flex-wrap gap-2">{["All", "Careers", "Money talk", "Interview prep"].map((c) => <Chip key={c} on={on === c} onClick={() => setOn(c)}>{c}</Chip>)}</div>;
}

function Inputs() {
  return (
    <>
      <div className="space-y-4">
        <Field label="Stage" htmlFor="sg-stage"><Select id="sg-stage" options={[{ value: "final", label: "Final year of secondary school" }, { value: "uni", label: "At university" }]} defaultValue="final" /></Field>
        <Field label="Community background" htmlFor="sg-bg" hint="Open list with Say more filled in. Only used for counts."><Select id="sg-bg" options={BACKGROUND} defaultValue="Migrant or relocated" sayMore={{ defaultValue: "Moved to Ibadan for school" }} /></Field>
      </div>
      <div className="space-y-4">
        <Field label="Community background" htmlFor="sg-bg2" hint="Only used for counts. Never shown on your profile."><Select id="sg-bg2" options={BACKGROUND} defaultValue="First in my family to go to college" sayMore={{}} /></Field>
        <Field label="Your Ask" htmlFor="sg-ask"><CountedTextarea id="sg-ask" max={600} defaultValue="I do not know whether to choose medicine or engineering." /></Field>
      </div>
    </>
  );
}

function Signatures() {
  return (
    <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
      <Signature statement={STATEMENT} />
      <Signature statement={STATEMENT} defaultName="Kwame Mensah" />
    </div>
  );
}

function Code() { return <CodeInput name="sg-code" />; }

function Tabs() {
  const [pill, setPill] = useState("open");
  const [under, setUnder] = useState("overview");
  const [count, setCount] = useState("open");
  return (
    <div className="dc-panel space-y-5 p-[22px]">
      <div><p className="dc-kicker mb-2">Pill tabs</p><PillTabs label="Ask status" value={pill} onChange={setPill} items={[{ value: "open", label: "Open" }, { value: "stepped", label: "Stepped forward" }, { value: "scheduled", label: "Scheduled" }, { value: "done", label: "Done" }]} /></div>
      <div><p className="dc-kicker mb-2">Underline tabs</p><UnderlineTabs label="Sections" value={under} onChange={setUnder} items={[{ value: "overview", label: "Overview" }, { value: "notes", label: "Notes" }, { value: "goals", label: "Goals" }]} /></div>
      <div><p className="dc-kicker mb-2">Tabs with counts</p><UnderlineTabs label="Queue" value={count} onChange={setCount} items={[{ value: "open", label: "Open", count: 7 }, { value: "waiting", label: "Waiting" }, { value: "done", label: "Done" }]} /></div>
      <p className="text-label text-stone">Pill tabs filter one list. Underline tabs switch a panel on the same page. Moving between pages uses the side menu.</p>
    </div>
  );
}

function Toggles() {
  return (
    <div className="dc-panel p-[22px]">
      <p className="dc-kicker">Toggles and choices</p>
      <Toggle label="Email me about my Asks" sub="Safeguarding messages are always on" defaultChecked />
      <Toggle label="Weekly tips" sub="Short, on Mondays" defaultChecked className="border-t border-line" />
      <div className="mt-2 space-y-2.5">
        <Checkbox label="I have read the Code of Conduct" defaultChecked />
        <Checkbox label="Remind me an hour before" />
        <RadioCard name="sg-len" label="30 minutes" sub="A quick, focused chat" defaultChecked />
        <RadioCard name="sg-len" label="60 minutes" />
      </div>
    </div>
  );
}

function TabBars() {
  return (
    <div className="dc-panel space-y-4 p-4">
      {([["Participant tab bar", PARTICIPANT_TABS], ["Mentor tab bar", MENTOR_TABS], ["Admin tab bar", ADMIN_TABS]] as const).map(([l, items]) => (
        <div key={l}>
          <p className="dc-kicker mb-2">{l}</p>
          {/* The real bar is fixed to the viewport bottom on phones; this frame previews it in place. */}
          <div className="relative h-[88px] overflow-visible rounded-field border border-line [&_nav]:absolute [&_nav]:block [&_nav]:rounded-field">
            <TabBar items={items} />
          </div>
        </div>
      ))}
      <p className="text-label text-stone">The Ask button is raised, tilted and the only clay element in the bar.</p>
    </div>
  );
}

function Feedback() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <div className="dc-card space-y-3 p-[19px]">
      <p className="dc-kicker">Toasts, gone after 6 seconds</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => toast({ title: "Guardian approved an Ask", sub: "Careers · Ada", tone: "mint", action: { label: "View", onClick: () => {} } })}>Mint toast</Button>
        <Button size="sm" onClick={() => toast({ title: "We could not save that", sub: "Your changes are kept. Try again.", tone: "blush", action: { label: "Retry", onClick: () => {} } })}>Blush toast</Button>
        <Button size="sm" onClick={() => toast({ title: "You will be signed out in 2 min", sub: "Save your draft to stay in.", tone: "butter", action: { label: "Stay", onClick: () => {} } })}>Butter toast</Button>
      </div>
      <p className="dc-kicker pt-2">Modal (desktop) / bottom sheet (phone)</p>
      <Button size="sm" onClick={() => setOpen(true)}>Withdraw this Ask?</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Withdraw this Ask?"
        actions={<><Button onClick={() => setOpen(false)}>Keep my Ask</Button><Button variant="primary" onClick={() => setOpen(false)}>Withdraw Ask</Button></>}>
        <p>Nothing more is needed from you. You can start a new Ask any time.</p>
        <Field label="Why are you withdrawing? (optional)" htmlFor="sg-why" className="mt-4">
          <Select id="sg-why" options={[{ value: "self", label: "I found the answer myself" }, { value: "time", label: "The timing no longer works" }]} defaultValue="self" sayMore={{}} />
        </Field>
      </Modal>
    </div>
  );
}

// Named exports only: a server page can render client components from a client file, but not reach into an object of them.
export { Chips as DemoChips, Inputs as DemoInputs, Signatures as DemoSignatures, Code as DemoCode, Tabs as DemoTabs, Toggles as DemoToggles, TabBars as DemoTabBars, Feedback as DemoFeedback };
