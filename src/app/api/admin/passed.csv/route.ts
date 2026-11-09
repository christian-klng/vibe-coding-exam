import { getLocale } from "next-intl/server";
import { isLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/session";
import { listTasksForAdmin } from "@/lib/tasks/admin";
import { listPassed, passedToCsv } from "@/lib/tasks/passed";

/** The table from /admin/progress as a CSV file, with the same filters. */
export async function GET(request: Request) {
  await requireAdmin();
  const params = new URL(request.url).searchParams;
  const localeValue = await getLocale();
  const locale = isLocale(localeValue) ? localeValue : "de";
  const [tasks, rows] = await Promise.all([
    listTasksForAdmin(),
    listPassed({ taskId: params.get("task") || undefined, search: params.get("q")?.trim() || undefined }),
  ]);
  const title = new Map(tasks.map((task) => [task.id, task.title[locale]]));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(passedToCsv(rows, (taskId) => title.get(taskId) ?? taskId), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="passed-${date}.csv"`,
    },
  });
}
