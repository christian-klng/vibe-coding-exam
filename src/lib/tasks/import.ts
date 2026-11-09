import { and, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules, taskProgress, tasks, taskVersions } from "@/lib/db/schema";
import type { Localized, Task, TaskModule } from "./schema";
import { validateCatalog } from "./validate";

export type ImportResult = { imported: boolean; modules: number; tasks: number; progressRows: number };

/**
 * Takes the task files into the database as version 1, once. Runs on every start of the web
 * container: it does nothing as soon as the tasks table has rows, so later edits in the admin
 * area are never overwritten by the files.
 */
export async function importCatalog(catalog: { modules: TaskModule[]; tasks: (Task & { body: Localized })[] }): Promise<ImportResult> {
  const problems = validateCatalog(catalog.modules, catalog.tasks);
  if (problems.length > 0) {
    throw new Error(`Task files are invalid:\n${problems.join("\n")}`);
  }

  return getDb().transaction(async (tx) => {
    const [{ value: existing }] = await tx.select({ value: count() }).from(tasks);
    if (existing > 0) {
      return { imported: false, modules: 0, tasks: 0, progressRows: 0 };
    }

    await tx.insert(modules).values(
      catalog.modules.map((m) => ({ id: m.id, order: m.order, title: m.title, description: m.description })),
    );
    for (const task of catalog.tasks) {
      const { id, version, module, order, body, ...definition } = task;
      await tx.insert(tasks).values({ id, moduleId: module, order, currentVersion: version });
      await tx.insert(taskVersions).values({ taskId: id, version, definition, bodyDe: body.de, bodyEn: body.en });
    }

    // Who passed before the import passed version 1, the only one there was.
    const updated = await tx
      .update(taskProgress)
      .set({ passedVersion: 1 })
      .where(and(eq(taskProgress.status, "passed"), isNull(taskProgress.passedVersion)))
      .returning({ userId: taskProgress.userId });
    return { imported: true, modules: catalog.modules.length, tasks: catalog.tasks.length, progressRows: updated.length };
  });
}
