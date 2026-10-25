"use client";

import { useState } from "react";
import { Icon } from "@/components/dc/icons";
import { FieldWrap, SelectField } from "@/components/forms/fields";

/** Emergency numbers by country. Only used to pick the number shown; never sent or saved. */
const PLACES: Record<string, { label: string; call: string; note: string; more: string }> = {
  NG: { label: "Nigeria", call: "112", note: "Nigeria emergency number. Free, any hour", more: "In the US? Call or text 988, the Suicide and Crisis Lifeline. In another country, ask a trusted adult or search for your local helpline." },
  GH: { label: "Ghana", call: "112", note: "Ghana emergency number. Free, any hour", more: "In Nigeria, call 112. In another country, ask a trusted adult or search for your local helpline." },
  KE: { label: "Kenya", call: "999", note: "Kenya emergency number. 112 also works", more: "In Nigeria, call 112. In another country, ask a trusted adult or search for your local helpline." },
  GB: { label: "United Kingdom", call: "999", note: "UK emergency number. Free, any hour", more: "To talk to someone, call Samaritans free on 116 123, any hour." },
  US: { label: "United States", call: "988", note: "Suicide and Crisis Lifeline. Call or text, any hour", more: "If someone is in immediate danger, call 911." },
  XX: { label: "Somewhere else", call: "112", note: "Works on most mobile phones in many countries", more: "Ask a trusted adult or search for your local helpline. In the US, call or text 988." },
};

export function WhereAreYou() {
  const [where, setWhere] = useState("NG");
  const p = PLACES[where]!;
  return (
    <>
      <FieldWrap label="Where are you?" htmlFor="cr-where" hint="We only use this to show the right number. It is not saved.">
        <SelectField id="cr-where" value={where} onChange={setWhere} options={Object.entries(PLACES).map(([value, v]) => ({ value, label: v.label }))} />
      </FieldWrap>
      <section className="flex flex-col gap-3.5 rounded-card border border-line bg-card p-[18px]">
        <a href={`tel:${p.call}`} className="flex items-center gap-3.5">
          <span className="flex size-[52px] shrink-0 -rotate-[5deg] items-center justify-center rounded-[17px] bg-mint text-mint-ink"><Icon name="phone" size={26} /></span>
          <span className="flex flex-col gap-0.5">
            <span className="font-display text-[21px] font-extrabold">Call {p.call}</span>
            <span className="text-[12.5px] leading-[1.4] text-stone">{p.note}</span>
          </span>
        </a>
        <div className="h-px bg-line" />
        <p className="text-[14px] leading-normal text-bark">{p.more}</p>
      </section>
    </>
  );
}
