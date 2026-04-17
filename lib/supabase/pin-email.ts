const USERNAME_REGEX = /^[a-z0-9._-]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PIN_REGEX = /^\d{4}$/;

export const SYNTHETIC_EMAIL_DOMAIN = "matheapp.internal";

function assertUuid(classId: string): void {
  if (!UUID_REGEX.test(classId)) {
    throw new Error("class_id must be a UUID");
  }
}

/**
 * Builds the synthetic email address used by Supabase Auth for a child account.
 * Pattern: `{lowercased-username}.{class_id-first-8-chars}@matheapp.internal`
 * This guarantees global uniqueness even when the same display_name appears in
 * different classes (RESEARCH Pitfall 7).
 */
export function buildSyntheticEmail(username: string, classId: string): string {
  assertUuid(classId);
  const normalized = username.toLowerCase();
  if (!USERNAME_REGEX.test(normalized)) {
    throw new Error(
      `Invalid username: must match [a-z0-9._-]+ (got ${JSON.stringify(username)})`
    );
  }
  const prefix = classId.slice(0, 8);
  return `${normalized}.${prefix}@${SYNTHETIC_EMAIL_DOMAIN}`;
}

/**
 * Pads a 4-digit PIN to satisfy Supabase's 6-char minimum password length.
 * Pattern: `{pin}-{class_id-first-8-chars}` — deterministic, reversible on the
 * server side (for login), never stored in `profiles` as plaintext.
 * See RESEARCH Assumption A1: PIN lives ONLY as bcrypt hash in auth.users.
 */
export function padPin(pin: string, classId: string): string {
  if (!PIN_REGEX.test(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }
  assertUuid(classId);
  const prefix = classId.slice(0, 8);
  return `${pin}-${prefix}`;
}
