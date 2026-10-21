"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useAuthError } from "./use-auth-error";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations("Auth");
  const authError = useAuthError();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t("reset.invalidLink")}{" "}
          <Link href="/forgot-password" className="underline">
            {t("forgot.title")}
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.resetPassword({ newPassword: String(form.get("password")), token: token! });
    setPending(false);
    if (error) {
      setError(authError(error));
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm">{t("reset.done")}</p>
        <Link href="/login" className="text-sm font-medium underline-offset-4 hover:underline">
          {t("register.toLogin")}
        </Link>
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
        <Label htmlFor="password">{t("newPassword")}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {t("reset.submit")}
      </Button>
    </form>
  );
}
