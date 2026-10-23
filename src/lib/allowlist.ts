// ALLOWED_EMAILS is a comma-separated list; matching ignores case and spacing.
export function parseEmailList(value: string) {
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | undefined, allowed: string[]) {
  return email !== undefined && allowed.includes(email.toLowerCase());
}
