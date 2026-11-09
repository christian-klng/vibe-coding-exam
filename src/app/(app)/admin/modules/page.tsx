import { getTranslations } from "next-intl/server";
import { ModuleForm } from "@/components/admin/module-form";
import { requireAdmin } from "@/lib/session";
import { listModules } from "@/lib/tasks/admin";

export default async function AdminModulesPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.modules");
  const modules = await listModules();

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <div className="space-y-4">
        {modules.map((module) => (
          <ModuleForm key={module.id} module={module} />
        ))}
      </div>
      <section className="space-y-2">
        <h2 className="font-semibold">{t("newTitle")}</h2>
        <ModuleForm create />
      </section>
    </div>
  );
}
