import { createTranslator } from "next-intl";
import { Resend } from "resend";
import { defaultLocale, isLocale } from "@/i18n/config";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

const messages = { de, en };

type EmailKind = "verifyEmail" | "resetPassword";

/**
 * Sends a transactional e-mail in the user's language.
 * Without RESEND_API_KEY (local development) the link is printed to the server log instead.
 */
export async function sendAuthEmail(kind: EmailKind, to: { email: string; name: string; locale?: unknown }, url: string) {
  const locale = isLocale(to.locale) ? to.locale : defaultLocale;
  const t = createTranslator({ locale, messages: messages[locale], namespace: `Email.${kind}` });
  const subject = t("subject");
  const text = `${t("greeting", { name: to.name })}\n\n${t("body")}\n\n${url}\n\n${t("ignore")}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email] ${kind} for ${to.email}: ${url}`);
    return;
  }

  const { error } = await new Resend(apiKey).emails.send({
    from: process.env.EMAIL_FROM ?? "Vibe Coding Exam <noreply@example.com>",
    to: to.email,
    subject,
    text,
  });
  if (error) {
    console.error(`[email] Sending ${kind} to ${to.email} failed`, error);
  }
}
