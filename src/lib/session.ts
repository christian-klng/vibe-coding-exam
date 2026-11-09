import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getAuth } from "@/lib/auth";

export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

/** For protected pages: returns the session or redirects to the login page. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/** For the admin area, also in every server action. To everyone else it looks like it does not exist. */
export async function requireAdmin() {
  const session = await requireSession();
  if (!isAdmin(session.user)) {
    notFound();
  }
  return session;
}
