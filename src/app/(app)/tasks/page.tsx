import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/session";

export default async function TasksPage() {
  const session = await requireSession();
  const t = await getTranslations("Tasks");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p>{t("welcome", { name: session.user.name })}</p>
      <p className="text-muted-foreground">{t("comingSoon")}</p>
    </div>
  );
}
