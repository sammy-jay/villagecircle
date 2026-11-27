/** Email verification and admin MFA stay required unless explicitly disabled. */
export function authChecksEnabled(value = process.env.ADMIN_AUTH_CHECKS_ENABLED): boolean {
  return value !== "false";
}
