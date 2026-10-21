import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const t = await getTranslations("Auth.reset");
  const { token, error } = await searchParams;
  // Better Auth redirects here with ?error=INVALID_TOKEN when the link is invalid or expired.
  const validToken = typeof token === "string" && !error ? token : null;

  return (
    <AuthCard title={t("title")}>
      <ResetPasswordForm token={validToken} />
    </AuthCard>
  );
}
