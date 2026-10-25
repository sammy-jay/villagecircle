import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { landingFor } from "@/lib/register";

export const dynamic = "force-dynamic";

/** Routes a freshly signed-in person to the right place for their role and account state. */
export default async function AfterLogin({ searchParams }: { searchParams: { next?: string } }) {
  const s = await getSession();
  if (!s?.user?.id) redirect("/login");
  const next = searchParams.next;
  const land = await landingFor(s.user.id);
  // Honour a safe in-app `next` only when the account is fully set up.
  if (next && next.startsWith("/") && !next.startsWith("//") && ["/home", "/mentor", "/guardian", "/admin"].includes(land)) redirect(next);
  redirect(land);
}
