import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const t = await getTranslations("Auth.login");
  return (
    <AuthCard title={t("title")} description={t("description")}>
      <LoginForm />
    </AuthCard>
  );
}
