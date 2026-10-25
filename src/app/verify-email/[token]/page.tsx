import { redirect } from "next/navigation";
import { ArtCard, SplitShell, TiltTile } from "@/components/account/shells";
import { Note } from "@/components/forms/fields";
import { Icon } from "@/components/dc/icons";
import { consumeToken } from "@/lib/account";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ExpiredResend } from "./expired-resend";

export const metadata = { title: "Confirm your email" };
export const dynamic = "force-dynamic";

/** Opens the emailed verification link. Valid: confirm and continue. Used or old: M22. */
export default async function VerifyEmail({ params }: { params: { token: string } }) {
  const email = await consumeToken("verify", params.token);
  if (email) {
    const u = await db.user.update({ where: { email }, data: { emailVerified: new Date() } });
    await audit(u.id, "account.email.verified", "User", u.id);
    redirect((await getSession())?.user?.id ? "/after-login" : "/login?verified=1");
  }
  return (
    <SplitShell panel="butter" center phone={{}} art={
      <div className="flex w-[400px] flex-col gap-3.5">
        <ArtCard rotate={-2} className="p-5"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-[15px] bg-mint text-mint-ink"><Icon name="check" size={22} /></span><div><p className="text-[16px] font-extrabold">Guardian approval</p><p className="text-[13.5px] text-stone">Not affected</p></div></div></ArtCard>
        <ArtCard rotate={1.5} className="p-5"><div className="flex items-center gap-3"><span className="flex size-11 items-center justify-center rounded-[15px] bg-butter text-butter-ink"><Icon name="mail" size={22} /></span><div><p className="text-[16px] font-extrabold">Email check</p><p className="text-[13.5px] text-stone">Link expired. New one needed.</p></div></div></ArtCard>
      </div>
    }>
      <TiltTile icon="mail" tone="butter" className="lg:mt-6" />
      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[40px] font-extrabold leading-[1.04] lg:text-[50px] lg:leading-[1.02] lg:tracking-[-.02em]">That link has expired</h1>
        <p className="text-[16px] leading-normal text-bark lg:text-[16.5px]">Verification links work for 24 hours, and only once.</p>
      </div>
      <ExpiredResend />
      <Note tone="mint" icon="shieldCheck">Your guardian&apos;s approval is not affected.</Note>
    </SplitShell>
  );
}
