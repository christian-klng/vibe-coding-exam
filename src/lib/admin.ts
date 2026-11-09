/**
 * Who counts as an admin: the role in the database, or an address listed in ADMIN_EMAILS.
 * The list is read on every call, so a changed variable only needs a restart, no migration.
 */
type Env = Record<string, string | undefined>;

export function configuredAdminEmails(env: Env = process.env): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isConfiguredAdmin(email: string, env?: Env) {
  return configuredAdminEmails(env).has(email.trim().toLowerCase());
}

export function isAdmin(user: { role?: string | null; email: string }, env?: Env) {
  return user.role === "admin" || isConfiguredAdmin(user.email, env);
}
