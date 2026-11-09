import { getLocale, getTranslations } from "next-intl/server";
import { TaskEditor } from "@/components/admin/task-editor";
import { isLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/session";
import { listModules, listTasksForAdmin } from "@/lib/tasks/admin";

export default async function NewTaskPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.tasks");
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const [modules, tasks] = await Promise.all([listModules(), listTasksForAdmin()]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("newTitle")}</h2>
      <TaskEditor
        create
        id=""
        moduleId={modules[0]?.id ?? ""}
        order={tasks.length + 1}
        preChecksYaml=""
        modules={modules}
        otherTasks={tasks.filter((task) => !task.archivedAt)}
        locale={locale}
        criteriaDiffer={false}
      />
    </div>
  );
}
