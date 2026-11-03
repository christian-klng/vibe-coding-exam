import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/config";
import type { CheckRun } from "@/lib/db/schema";
import type { Task } from "@/lib/tasks/schema";
import { CheckButton } from "./check-button";
import { CheckPoller } from "./check-poller";

type Props = { task: Task; locale: Locale; locked: boolean; runs: CheckRun[]; queuePosition: number };

function isFinished(run?: CheckRun) {
  return run?.status === "passed" || run?.status === "failed";
}

function commitUrl(run: CheckRun) {
  return `https://github.com/${run.repoOwner}/${run.repoName}/commit/${run.commitSha}`;
}

export async function CheckPanel({ task, locale, locked, runs, queuePosition }: Props) {
  const t = await getTranslations("Tasks");
  const tc = await getTranslations("Checks");
  const format = await getFormatter();
  const formatDate = (date: Date) => format.dateTime(date, { dateStyle: "short", timeStyle: "short" });

  const latest = runs.at(0);
  const active = latest?.status === "queued" || latest?.status === "running";
  const result = isFinished(latest) ? latest : undefined;
  const results = new Map(result?.criteriaResults?.map((criterion) => [criterion.id, criterion]));
  const canCheck = task.check.type === "ai" || task.check.type === "url";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("criteria")}</CardTitle>
          <CardDescription>{t("criteriaHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result && (
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-medium text-foreground">{tc(result.status === "passed" ? "passed" : "failed")}</p>
                <p>{result.summary}</p>
                {result.nextStep && result.status !== "passed" && (
                  <p>
                    <span className="font-medium text-foreground">{tc("nextStep")}:</span> {result.nextStep}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <ul className={results.size > 0 ? "space-y-3 text-sm" : "list-disc space-y-2 pl-4 text-sm"}>
            {task.check.criteria.map((criterion) => {
              const outcome = results.get(criterion.id);
              const Icon = outcome?.met ? CheckCircle2 : XCircle;
              return (
                <li key={criterion.id} className={outcome ? "flex gap-2" : undefined}>
                  {outcome && (
                    <Icon
                      role="img"
                      aria-label={tc(outcome.met ? "passed" : "failed")}
                      className={`mt-0.5 size-4 shrink-0 ${outcome.met ? "text-green-600" : "text-destructive"}`}
                    />
                  )}
                  <div className="min-w-0 space-y-1">
                    <p>
                      {criterion.text[locale]}
                      {criterion.required && (
                        <>
                          <span aria-hidden> *</span>
                          <span className="sr-only"> ({t("required")})</span>
                        </>
                      )}
                    </p>
                    {outcome && <p className="text-muted-foreground">{outcome.feedback}</p>}
                    {outcome?.evidence && (
                      <p className="text-xs break-words text-muted-foreground">
                        {tc("evidence")}: <code>{outcome.evidence}</code>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {result?.commitSha && (
            <p className="text-xs text-muted-foreground">
              <a href={commitUrl(result)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {tc("commit", { sha: result.commitSha.slice(0, 7), date: formatDate(result.createdAt) })}
              </a>
            </p>
          )}

          {latest?.status === "error" && (
            <Alert>
              <AlertDescription>{tc("error")}</AlertDescription>
            </Alert>
          )}

          {locked ? (
            <Alert>
              <AlertDescription>
                {t("locked")}.{" "}
                <Link href="/tasks/github-repo" className="font-medium underline underline-offset-4">
                  {t("lockedLink")}
                </Link>
              </AlertDescription>
            </Alert>
          ) : active ? (
            <div className="flex gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden />
              <p>
                {latest.error
                  ? tc("delayed")
                  : latest.status === "queued"
                    ? tc("queued", { position: queuePosition })
                    : tc("running")}
              </p>
              <CheckPoller />
            </div>
          ) : (
            canCheck && <CheckButton taskId={task.id} label={latest ? tc("recheck") : t("checkNow")} />
          )}
        </CardContent>
      </Card>

      {runs.length > 1 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{tc("history")}</summary>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {runs.slice(1).map((run) => (
              <li key={run.id}>
                {formatDate(run.createdAt)} ·{" "}
                {run.status === "passed" || run.status === "failed" ? tc(run.status) : tc("errorShort")}
                {run.commitSha && (
                  <>
                    {" · "}
                    <a href={commitUrl(run)} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                      {run.commitSha.slice(0, 7)}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
