import { redirect } from "next/navigation";
import { POLICIES } from "@/lib/public-content";

/** /policies opens the first policy, as on the PO-1 board. */
export default function Policies() {
  redirect(`/policies/${POLICIES[0]!.slug}`);
}
