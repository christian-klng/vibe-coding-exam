import { ArrowLeft, History, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { RepoCard } from "@/components/repo/repo-card";
import { CheckPanel } from "@/components/tasks/check-panel";
import { StatusIcon } from "@/components/tasks/status-icon";
import { TaskArticle } from "@/components/tasks/task-article";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { isLocale } from "@/i18n/config";
import { isAdmin } from "@/lib/admin";
import { getTaskChecks } from "@/lib/checks";
import { getPrimaryRepository } from "@/lib/repositories";
import { requireSession } from "@/lib/session";
import { getCatalog, getTask, getTaskVersion } from "@/lib/tasks/catalog";
import { getTaskProgress } from "@/lib/tasks/progress";

export default async function TaskPage({ params, searchParams }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  const task = await getTask(id);
  if (!task) {
    notFound();
  }

  const session = await requireSession();
  const t = await getTranslations("Tasks");
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const [{ modules, tasks }, progress, repo, checks] = await Promise.all([
    getCatalog(),
    getTaskProgress(session.user.id, task.id),
    getPrimaryRepository(session.user.id),
    getTaskChecks(session.user.id, task.id),
  ]);
  const taskModule = modules.find((m) => m.id === task.module)!;
  const status = progress?.status ?? "open";

  // A passed task stays passed. When newer versions exist, the passed one can still be read.
  const passedOlder = status === "passed" && progress?.passedVersion != null && progress.passedVersion < task.version;
  const { version } = await searchParams;
  const requested = typeof version === "string" ? Number(version) : undefined;
  if (requested && requested !== task.version) {
    // Only the version the student passed is available to them, not every past version.
    const older = passedOlder && requested === progress?.passedVersion ? await getTaskVersion(task.id, requested) : undefined;
    if (!older) notFound();
    return (
      <div className="space-y-6">
        <Link href={`/tasks/${task.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("backToCurrent")}
        </Link>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <h1 className="flex-1 text-2xl font-semibold tracking-tight">{older.title[locale]}</h1>
            <Badge variant="secondary" className="mt-1 gap-1">
              <History className="size-3.5" aria-hidden />
              {t("passedVersion", { version: older.version })}
            </Badge>
          </div>
          <p className="text-muted-foreground">{older.summary[locale]}</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <TaskArticle markdown={older.body[locale]} />
          <aside className="space-y-2 text-sm lg:sticky lg:top-6 lg:self-start">
            <p className="font-medium">{t("criteria")}</p>
            <ul className="list-disc space-y-2 pl-4">
              {older.check.criteria.map((criterion) => (
                <li key={criterion.id}>
                  {criterion.text[locale]}
                  {criterion.required && <span aria-label={t("required")}> *</span>}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    );
  }
  const locked = task.requiresRepo && !repo;
  const prerequisites = tasks.filter((other) => task.prerequisites.includes(other.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
        {isAdmin(session.user) && (
          <Link href={`/admin/tasks/${task.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Pencil data-icon="inline-start" aria-hidden />
            {t("edit")}
          </Link>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("module", { number: taskModule.order })} · {taskModule.title[locale]}
        </p>
        <div className="flex items-start gap-3">
          <h1 className="flex-1 text-2xl font-semibold tracking-tight">{task.title[locale]}</h1>
          <Badge variant={status === "passed" ? "default" : "secondary"} className="mt-1 gap-1">
            <StatusIcon status={status} label="" className="size-3.5 text-current" />
            {t(`status.${status}`)}
          </Badge>
        </div>
        <p className="text-muted-foreground">{task.summary[locale]}</p>
      </div>

      {passedOlder && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("olderVersionPassed", { passed: progress.passedVersion!, current: task.version })}</span>
            <Link href={`/tasks/${task.id}?version=${progress.passedVersion}`} className="font-medium underline-offset-4 hover:underline">
              {t("viewPassedVersion")}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <TaskArticle markdown={task.body[locale]} />

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {task.showRepoForm && <RepoCard repo={repo} />}
          <CheckPanel task={task} locale={locale} locked={locked} runs={checks.runs} queuePosition={checks.queuePosition} />

          {prerequisites.length > 0 && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{t("prerequisites")}</p>
              <ul className="space-y-1">
                {prerequisites.map((other) => (
                  <li key={other.id}>
                    <Link href={`/tasks/${other.id}`} className="text-muted-foreground underline-offset-4 hover:underline">
                      {other.title[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
