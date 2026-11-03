import { getFormatter, getTranslations } from "next-intl/server";
import { LlmForm } from "@/components/admin/llm-form";
import { LlmTest } from "@/components/admin/llm-test";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/session";
import { getLlmSettingsForForm } from "@/lib/settings";

export default async function AdminLlmPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.llm");
  const format = await getFormatter();
  const { updatedAt, ...settings } = await getLlmSettingsForForm();

  return (
    <div className="grid max-w-xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>
            {t("description")}
            {updatedAt && ` ${t("updatedAt", { date: format.dateTime(updatedAt, { dateStyle: "short", timeStyle: "short" }) })}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LlmForm {...settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("testTitle")}</CardTitle>
          <CardDescription>{t("testDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LlmTest />
        </CardContent>
      </Card>
    </div>
  );
}
