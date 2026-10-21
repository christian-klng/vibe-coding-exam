import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { RepoCard } from "@/components/repo/repo-card";
import { StatusIcon } from "@/components/tasks/status-icon";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isLocale } from "@/i18n/config";
import { getPrimaryRepository } from "@/lib/repositories";
import { requireSession } from "@/lib/session";
import { getCatalog, getTask, getTaskBody } from "@/lib/tasks/loader";
import { getProgress } from "@/lib/tasks/progress";

export default async function TaskPage({ params }: PageProps<"/tasks/[id]">) {
  const { id } = await params;
  // Look the id up in the catalog first: it is used to build a file path.
  const task = getTask(id);
  if (!task) {
    notFound();
  }

  const session = await requireSession();
  const t = await getTranslations("Tasks");
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const { modules, tasks } = getCatalog();
  const taskModule = modules.find((m) => m.id === task.module)!;
  const [progress, repo] = await Promise.all([getProgress(session.user.id), getPrimaryRepository(session.user.id)]);
  const status = progress.get(task.id) ?? "open";
  const locked = task.requiresRepo && !repo;
  const prerequisites = tasks.filter((other) => task.prerequisites.includes(other.id));

  return (
    <div className="space-y-6">
      <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>

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
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{t(`checkType.${task.check.type}`)}</Badge>
          {task.requiresRepo && <Badge variant="outline">{t("requiresRepo")}</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-h2:text-lg prose-pre:overflow-x-auto prose-code:before:content-none prose-code:after:content-none [&_blockquote_p]:before:content-none [&_blockquote_p]:after:content-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{getTaskBody(task.id, locale)}</ReactMarkdown>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {task.showRepoForm && <RepoCard repo={repo} />}
          <Card>
            <CardHeader>
              <CardTitle>{t("criteria")}</CardTitle>
              <CardDescription>{t("criteriaHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {task.check.criteria.map((criterion) => (
                  <li key={criterion.id} className="space-y-1 text-sm">
                    <Badge variant={criterion.required ? "default" : "outline"} className="text-[0.7rem]">
                      {criterion.required ? t("required") : t("optional")}
                    </Badge>
                    <p>{criterion.text[locale]}</p>
                  </li>
                ))}
              </ul>
              {locked ? (
                <Alert>
                  <AlertDescription>
                    {t("locked")}.{" "}
                    <Link href="/tasks/github-repo" className="font-medium underline underline-offset-4">
                      {t("lockedLink")}
                    </Link>
                  </AlertDescription>
                </Alert>
              ) : (
                !task.showRepoForm && (
                  <>
                    <Button className="w-full" disabled>
                      {t("checkNow")}
                    </Button>
                    <p className="text-xs text-muted-foreground">{t("checkComingSoon")}</p>
                  </>
                )
              )}
            </CardContent>
          </Card>

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
