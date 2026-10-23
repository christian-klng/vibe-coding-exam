import { createTranslator } from "next-intl";
import nodemailer, { type Transporter } from "nodemailer";
import { defaultLocale, isLocale } from "@/i18n/config";
import de from "../../messages/de.json";
import en from "../../messages/en.json";

const messages = { de, en };

type EmailKind = "verifyEmail" | "resetPassword";

// Any SMTP mailbox works, e.g. IONOS: SMTP_HOST=smtp.ionos.de, SMTP_PORT=587.
// Port 465 uses TLS from the start, port 587 must upgrade via STARTTLS; other ports (e.g. a local
// test server on 1025) upgrade only if the server offers it.
let transporter: Transporter | undefined;

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) {
    return undefined;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter ??= nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transporter;
}

/**
 * Sends a transactional e-mail in the user's language.
 * Without SMTP_HOST (local development) the link is printed to the server log instead.
 */
export async function sendAuthEmail(kind: EmailKind, to: { email: string; name: string; locale?: unknown }, url: string) {
  const locale = isLocale(to.locale) ? to.locale : defaultLocale;
  const t = createTranslator({ locale, messages: messages[locale], namespace: `Email.${kind}` });
  const subject = t("subject");
  const text = `${t("greeting", { name: to.name })}\n\n${t("body")}\n\n${url}\n\n${t("ignore")}`;

  const smtp = getTransporter();
  if (!smtp) {
    console.log(`[email] ${kind} for ${to.email}: ${url}`);
    return;
  }

  try {
    await smtp.sendMail({
      // Mailbox providers like IONOS only accept their own address as sender.
      from: process.env.EMAIL_FROM ?? process.env.SMTP_USER,
      to: to.email,
      subject,
      text,
    });
  } catch (error) {
    console.error(`[email] Sending ${kind} to ${to.email} failed`, error);
  }
}
