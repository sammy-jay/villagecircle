/** Webmail inbox for the common providers, or null. Plain module so server pages (check-email) and client forms can both use it. */
export function inboxUrl(email: string) {
  const d = email.split("@")[1]?.toLowerCase() ?? "";
  if (d === "gmail.com" || d === "googlemail.com") return "https://mail.google.com/mail/u/0/#inbox";
  if (d.startsWith("yahoo.")) return "https://mail.yahoo.com";
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(d)) return "https://outlook.live.com/mail/";
  return null;
}
