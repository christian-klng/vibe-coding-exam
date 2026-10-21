import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusIcon } from "@/components/tasks/status-icon";
import { Progress } from "@/components/ui/progress";
import { isLocale } from "@/i18n/config";
import { requireSession } from "@/lib/session";
import { getCatalog } from "@/lib/tasks/loader";
import { getProgress } from "@/lib/tasks/progress";

export default async function TasksPage() {
  const session = await requireSession();
  const t = await getTranslations("Tasks");
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const { modules, tasks } = getCatalog();
  const progress = await getProgress(session.user.id);
  const done = tasks.filter((task) => progress.get(task.id) === "passed").length;

  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("welcome", { name: session.user.name })} {t("intro")}
        </p>
        <div className="max-w-sm space-y-1.5">
          <Progress
            value={(done / tasks.length) * 100}
            locale={locale} // same number formatting on server and client
            aria-label={t("progress", { done, total: tasks.length })}
          />
          <p className="text-sm text-muted-foreground">{t("progress", { done, total: tasks.length })}</p>
        </div>
      </div>

      {modules.map((taskModule) => {
        const moduleTasks = tasks.filter((task) => task.module === taskModule.id);
        return (
          <section key={taskModule.id} aria-labelledby={`module-${taskModule.id}`} className="space-y-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("module", { number: taskModule.order })}
              </p>
              <h2 id={`module-${taskModule.id}`} className="text-lg font-semibold">
                {taskModule.title[locale]}
              </h2>
              <p className="text-sm text-muted-foreground">{taskModule.description[locale]}</p>
            </div>
            <ul className="divide-y rounded-xl border">
              {moduleTasks.map((task) => {
                const status = progress.get(task.id) ?? "open";
                return (
                  <li key={task.id}>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <StatusIcon status={status} label={t(`status.${status}`)} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{task.title[locale]}</p>
                        <p className="text-sm text-muted-foreground">{task.summary[locale]}</p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
