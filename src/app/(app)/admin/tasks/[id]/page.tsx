import { Eye } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { archiveTask, discardTaskDraft } from "@/app/actions/tasks-admin";
import { TaskEditor } from "@/components/admin/task-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/session";
import { getTaskForEditor, listModules, listTasksForAdmin, listVersions } from "@/lib/tasks/admin";
import { preChecksToYaml } from "@/lib/tasks/form";

export default async function EditTaskPage({ params }: PageProps<"/admin/tasks/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const task = await getTaskForEditor(id);
  if (!task) notFound();

  const t = await getTranslations("Admin.tasks");
  const format = await getFormatter();
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const [modules, tasks, versions] = await Promise.all([listModules(), listTasksForAdmin(), listVersions(id)]);
  const formatDate = (date: Date) => format.dateTime(date, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{task.definition?.title[locale] ?? id}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{id}</span>
            <Badge variant={task.currentVersion ? "default" : "outline"}>
              {task.currentVersion ? t("version", { version: task.currentVersion }) : t("unpublished")}
            </Badge>
            {task.archivedAt && <Badge variant="outline">{t("archived")}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {task.currentVersion && (
            <Link href={`/tasks/${id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
              {t("openTask")}
            </Link>
          )}
          {task.source !== "none" && (
            <Link href={`/admin/tasks/${id}/preview`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Eye data-icon="inline-start" aria-hidden />
              {t("preview")}
            </Link>
          )}
          <form action={archiveTask.bind(null, id, !task.archivedAt)}>
            <Button type="submit" variant="outline" size="sm">
              {task.archivedAt ? t("unarchive") : t("archive")}
            </Button>
          </form>
        </div>
      </div>

      {task.source === "draft" && task.draftUpdatedAt && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("editingDraft", { date: formatDate(task.draftUpdatedAt) })}</span>
            <form action={discardTaskDraft.bind(null, id)}>
              <Button type="submit" variant="ghost" size="sm">
                {t("discardDraft")}
              </Button>
            </form>
          </AlertDescription>
        </Alert>
      )}

      <TaskEditor
        create={false}
        id={id}
        moduleId={task.moduleId}
        order={task.order}
        definition={task.definition}
        body={task.body}
        preChecksYaml={task.definition ? preChecksToYaml(task.definition) : ""}
        modules={modules}
        otherTasks={tasks.filter((other) => other.id !== id && !other.archivedAt)}
        locale={locale}
        criteriaDiffer={task.criteriaDiffer}
      />

      {versions.length > 0 && (
        <section className="space-y-2 text-sm">
          <h3 className="font-medium">{t("versions")}</h3>
          <ul className="divide-y rounded-xl border">
            {versions.map((version) => (
              <li key={version.version} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
                <span className="font-medium">{t("version", { version: version.version })}</span>
                <span className="text-muted-foreground">{formatDate(version.publishedAt)}</span>
                {version.criteriaChanged && <Badge variant="secondary">{t("criteriaChanged")}</Badge>}
                <Link href={`/admin/tasks/${id}/preview?version=${version.version}`} className="ml-auto underline-offset-4 hover:underline">
                  {t("preview")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
