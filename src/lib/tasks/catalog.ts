import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules, tasks, taskVersions } from "@/lib/db/schema";
import type { Localized, Task, TaskModule } from "./schema";

/** A task as the app and the worker see it: the published version plus its Markdown bodies. */
export type CatalogTask = Task & { body: Localized };

export type Catalog = { modules: TaskModule[]; tasks: CatalogTask[] };

function toCatalogTask(row: {
  id: string;
  moduleId: string;
  order: number;
  version: typeof taskVersions.$inferSelect;
}): CatalogTask {
  return {
    ...row.version.definition,
    id: row.id,
    version: row.version.version,
    module: row.moduleId,
    order: row.order,
    body: { de: row.version.bodyDe, en: row.version.bodyEn },
  };
}

/**
 * Modules and the current version of every published, unarchived task, read fresh on every call.
 * One query each, so pages and the worker need no cache; publishing in the admin area shows at once.
 */
export async function getCatalog(): Promise<Catalog> {
  const db = getDb();
  const [moduleRows, taskRows] = await Promise.all([
    db.select().from(modules).orderBy(asc(modules.order)),
    db
      .select({ id: tasks.id, moduleId: tasks.moduleId, order: tasks.order, version: taskVersions })
      .from(tasks)
      .innerJoin(taskVersions, and(eq(taskVersions.taskId, tasks.id), eq(taskVersions.version, tasks.currentVersion)))
      .where(isNull(tasks.archivedAt)),
  ]);
  const moduleOrder = new Map(moduleRows.map((m) => [m.id, m.order]));
  const list = taskRows
    .map(toCatalogTask)
    .sort((a, b) => (moduleOrder.get(a.module) ?? 0) - (moduleOrder.get(b.module) ?? 0) || a.order - b.order);
  return { modules: moduleRows, tasks: list };
}

/** The current version of one task, or undefined when it does not exist, is archived or unpublished. */
export async function getTask(id: string): Promise<CatalogTask | undefined> {
  const [row] = await getDb()
    .select({ id: tasks.id, moduleId: tasks.moduleId, order: tasks.order, version: taskVersions })
    .from(tasks)
    .innerJoin(taskVersions, and(eq(taskVersions.taskId, tasks.id), eq(taskVersions.version, tasks.currentVersion)))
    .where(and(eq(tasks.id, id), isNull(tasks.archivedAt)))
    .limit(1);
  return row ? toCatalogTask(row) : undefined;
}

/** A specific version, e.g. the one a student passed. Also works for archived tasks. */
export async function getTaskVersion(id: string, version: number): Promise<CatalogTask | undefined> {
  const [row] = await getDb()
    .select({ id: tasks.id, moduleId: tasks.moduleId, order: tasks.order, version: taskVersions })
    .from(tasks)
    .innerJoin(taskVersions, and(eq(taskVersions.taskId, tasks.id), eq(taskVersions.version, version)))
    .where(eq(tasks.id, id))
    .limit(1);
  return row ? toCatalogTask(row) : undefined;
}
