import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("Auth.login");
  const { link } = await searchParams;
  return (
    <AuthCard title={t("title")} description={t("description")}>
      <div className="space-y-4">
        {link === "invalid" && (
          <Alert>
            <AlertDescription>{t("linkInvalid")}</AlertDescription>
          </Alert>
        )}
        <LoginForm />
      </div>
    </AuthCard>
  );
}
