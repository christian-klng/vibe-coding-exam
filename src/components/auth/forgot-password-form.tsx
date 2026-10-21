"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    // The response is the same whether or not the account exists.
    await authClient.requestPasswordReset({ email: String(form.get("email")), redirectTo: "/reset-password" });
    setPending(false);
    setSent(true);
  }

  return (
    <div className="space-y-4">
      {sent ? (
        <p className="text-sm">{t("forgot.sent")}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {t("forgot.submit")}
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground underline-offset-4 hover:underline">
          {t("forgot.back")}
        </Link>
      </p>
    </div>
  );
}
