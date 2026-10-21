"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isLocale } from "@/i18n/config";
import { authClient } from "@/lib/auth-client";
import { useAuthError } from "./use-auth-error";

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const authError = useAuthError();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    setPending(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(form.get("name")),
      email,
      password: String(form.get("password")),
      locale: isLocale(locale) ? locale : undefined,
      callbackURL: "/tasks",
    });
    setPending(false);
    if (error) {
      setError(authError(error));
    } else {
      setRegisteredEmail(email);
    }
  }

  async function resend() {
    if (!registeredEmail) return;
    await authClient.sendVerificationEmail({ email: registeredEmail, callbackURL: "/tasks" });
    setResent(true);
  }

  if (registeredEmail) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{t("checkEmail.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("checkEmail.description", { email: registeredEmail })}</p>
        {resent ? (
          <p className="text-sm">{t("checkEmail.resent")}</p>
        ) : (
          <Button variant="outline" onClick={resend}>
            {t("checkEmail.resend")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {t("register.submit")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("register.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t("register.toLogin")}
        </Link>
      </p>
    </form>
  );
}
