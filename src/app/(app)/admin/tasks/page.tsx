import { Download, Plus } from "lucide-react";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/session";
import { listModules, listTasksForAdmin } from "@/lib/tasks/admin";

export default async function AdminTasksPage() {
  await requireAdmin();
  const t = await getTranslations("Admin.tasks");
  const format = await getFormatter();
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const [tasks, modules] = await Promise.all([listTasksForAdmin(), listModules()]);
  const moduleTitle = new Map(modules.map((m) => [m.id, m.title[locale]]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        <div className="flex gap-2">
          <a href="/api/admin/tasks.zip" className={buttonVariants({ variant: "outline", size: "sm" })} download>
            <Download data-icon="inline-start" aria-hidden />
            {t("export")}
          </a>
          <Link href="/admin/tasks/new" className={buttonVariants({ size: "sm" })}>
            <Plus data-icon="inline-start" aria-hidden />
            {t("new")}
          </Link>
        </div>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link href={`/admin/tasks/${task.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className={task.archivedAt ? "font-medium text-muted-foreground line-through" : "font-medium"}>{task.title[locale]}</p>
                  <p className="text-muted-foreground">
                    {moduleTitle.get(task.moduleId) ?? task.moduleId} · {task.order} · <span className="font-mono">{task.id}</span>
                  </p>
                </div>
                {task.archivedAt && <Badge variant="outline">{t("archived")}</Badge>}
                {task.draftUpdatedAt && (
                  <Badge variant="secondary">{t("draftSince", { date: format.dateTime(task.draftUpdatedAt, { dateStyle: "short", timeStyle: "short" }) })}</Badge>
                )}
                <Badge variant={task.currentVersion ? "default" : "outline"}>
                  {task.currentVersion ? t("version", { version: task.currentVersion }) : t("unpublished")}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
