import { redirect } from "next/navigation";

/** Every guard sends a signed-in team member who still needs the second step here; it lives on the team sign-in page. */
export default function Mfa() {
  redirect("/admin/sign-in");
}
