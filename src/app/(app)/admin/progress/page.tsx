import { Download } from "lucide-react";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/session";
import { listTasksForAdmin } from "@/lib/tasks/admin";
import { listPassed } from "@/lib/tasks/passed";

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export default async function AdminProgressPage({ searchParams }: PageProps<"/admin/progress">) {
  await requireAdmin();
  const t = await getTranslations("Admin.progress");
  const format = await getFormatter();
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const { task, q } = await searchParams;
  const taskId = typeof task === "string" ? task : "";
  const search = typeof q === "string" ? q.trim() : "";

  const [tasks, rows] = await Promise.all([listTasksForAdmin(), listPassed({ taskId: taskId || undefined, search: search || undefined })]);
  const title = new Map(tasks.map((item) => [item.id, item.title[locale]]));
  const currentVersion = new Map(tasks.map((item) => [item.id, item.currentVersion]));
  const csvParams = new URLSearchParams({ ...(taskId && { task: taskId }), ...(search && { q: search }) });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("intro")}</p>
      <form className="flex flex-wrap items-center gap-2">
        <select name="task" defaultValue={taskId} className={selectClass} aria-label={t("task")}>
          <option value="">{t("allTasks")}</option>
          {tasks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title[locale]}
            </option>
          ))}
        </select>
        <Input name="q" type="search" defaultValue={search} placeholder={t("search")} aria-label={t("search")} className="w-56" />
        <Button type="submit" variant="outline">
          {t("filter")}
        </Button>
        <a href={`/api/admin/passed.csv?${csvParams}`} className={buttonVariants({ variant: "outline" })} download>
          <Download data-icon="inline-start" aria-hidden />
          {t("csv")}
        </a>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{t("person")}</th>
                <th className="px-3 py-2 font-medium">{t("task")}</th>
                <th className="px-3 py-2 font-medium">{t("version")}</th>
                <th className="px-3 py-2 font-medium">{t("date")}</th>
                <th className="px-3 py-2 font-medium">{t("commit")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => {
                const outdated = row.passedVersion != null && (currentVersion.get(row.taskId) ?? 0) > row.passedVersion;
                return (
                  <tr key={`${row.userId}:${row.taskId}`}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-muted-foreground">{row.email}</p>
                    </td>
                    <td className="px-3 py-2">{title.get(row.taskId) ?? row.taskId}</td>
                    <td className="px-3 py-2">
                      {row.passedVersion ?? "–"}
                      {outdated && <span className="ml-1 text-xs text-muted-foreground">{t("outdated", { current: currentVersion.get(row.taskId) ?? 0 })}</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{format.dateTime(row.passedAt, { dateStyle: "short", timeStyle: "short" })}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.commitSha && row.repo ? (
                        <a href={`https://github.com/${row.repo}/commit/${row.commitSha}`} className="underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                          {row.commitSha.slice(0, 7)}
                        </a>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("count", { count: rows.length })}</p>
    </div>
  );
}
