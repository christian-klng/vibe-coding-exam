"use server";

import { cookies, headers } from "next/headers";
import { isLocale, localeCookie } from "@/i18n/config";
import { getAuth } from "@/lib/auth";
import { getSession } from "@/lib/session";

/** Stores the language in a cookie and, for signed-in users, in their profile. */
export async function setLocale(locale: string) {
  if (!isLocale(locale)) {
    return;
  }
  (await cookies()).set(localeCookie, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  if (await getSession()) {
    await getAuth().api.updateUser({ body: { locale }, headers: await headers() });
  }
}
