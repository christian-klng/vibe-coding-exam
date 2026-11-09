import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createEmailVerificationToken } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { defaultLocale, locales } from "@/i18n/config";
import { isConfiguredAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendAuthEmail } from "@/lib/email";

/**
 * Someone registers with an address that already has an account, often because the first mail
 * got lost. The response must not reveal this, but the mailbox owner still gets a useful mail.
 */
async function notifyExistingUser(user: { email: string; name: string; emailVerified: boolean }) {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (user.emailVerified) {
    return sendAuthEmail("existingAccount", user, `${baseURL}/login`);
  }
  const token = await createEmailVerificationToken(process.env.BETTER_AUTH_SECRET!, user.email);
  return sendAuthEmail("verifyEmail", user, `${baseURL}/api/auth/verify-email?token=${token}&callbackURL=%2F`);
}

function createAuth() {
  return betterAuth({
    database: drizzleAdapter(getDb(), { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      onExistingUserSignUp: async ({ user }) => {
        // Not awaited on purpose, like the other mails below.
        void notifyExistingUser(user).catch((error) => console.error("[email] Existing user mail failed", error));
      },
      sendResetPassword: async ({ user, url }) => {
        // Not awaited on purpose: response time must not reveal whether an account exists.
        void sendAuthEmail("resetPassword", user, url);
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        void sendAuthEmail("verifyEmail", user, url);
      },
    },
    databaseHooks: {
      user: {
        create: {
          // Addresses from ADMIN_EMAILS are admins from the start, so the user list shows them as such.
          before: async (user) => (isConfiguredAdmin(user.email) ? { data: { ...user, role: "admin" } } : undefined),
        },
      },
    },
    user: {
      additionalFields: {
        locale: { type: [...locales], required: false, defaultValue: defaultLocale, input: true },
        role: { type: ["student", "instructor", "admin"], required: false, defaultValue: "student", input: false },
      },
    },
    plugins: [nextCookies()], // must stay last
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth["$Infer"]["Session"];

// Created on first use, not at import: `next build` loads this module but has no
// database URL or auth secret, and needs neither.
let instance: Auth | undefined;

export function getAuth() {
  instance ??= createAuth();
  return instance;
}
