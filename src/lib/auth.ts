import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { defaultLocale, locales } from "@/i18n/config";
import { getDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendAuthEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
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
  user: {
    additionalFields: {
      locale: { type: [...locales], required: false, defaultValue: defaultLocale, input: true },
      role: { type: ["student", "instructor", "admin"], required: false, defaultValue: "student", input: false },
    },
  },
  plugins: [nextCookies()], // must stay last
});

export type Session = typeof auth.$Infer.Session;
