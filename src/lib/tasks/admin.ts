import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { modules, taskDrafts, tasks, taskVersions } from "@/lib/db/schema";
import { getCatalog } from "./catalog";
import type { Localized, Task, TaskDefinition, TaskModule } from "./schema";
import { validateCatalog } from "./validate";

export type TaskInput = {
  moduleId: string;
  order: number;
  definition: TaskDefinition;
  body: Localized;
};

export type AdminTaskRow = {
  id: string;
  moduleId: string;
  order: number;
  currentVersion: number | null;
  archivedAt: Date | null;
  title: Localized;
  draftUpdatedAt: Date | null;
};

/** All tasks for the admin list, including archived and unpublished ones. */
export async function listTasksForAdmin(): Promise<AdminTaskRow[]> {
  const db = getDb();
  const [moduleRows, rows] = await Promise.all([
    db.select({ id: modules.id, order: modules.order }).from(modules),
    db
      .select({
        id: tasks.id,
        moduleId: tasks.moduleId,
        order: tasks.order,
        currentVersion: tasks.currentVersion,
        archivedAt: tasks.archivedAt,
        version: taskVersions.definition,
        draft: taskDrafts.definition,
        draftUpdatedAt: taskDrafts.updatedAt,
      })
      .from(tasks)
      .leftJoin(taskVersions, and(eq(taskVersions.taskId, tasks.id), eq(taskVersions.version, tasks.currentVersion)))
      .leftJoin(taskDrafts, eq(taskDrafts.taskId, tasks.id)),
  ]);
  const moduleOrder = new Map(moduleRows.map((m) => [m.id, m.order]));
  return rows
    .map(({ version, draft, ...row }) => ({
      ...row,
      title: (version ?? draft)?.title ?? { de: row.id, en: row.id },
      draftUpdatedAt: row.draftUpdatedAt,
    }))
    .sort((a, b) => (moduleOrder.get(a.moduleId) ?? 0) - (moduleOrder.get(b.moduleId) ?? 0) || a.order - b.order);
}

export type EditorTask = {
  id: string;
  moduleId: string;
  order: number;
  currentVersion: number | null;
  archivedAt: Date | null;
  // What the editor shows: the draft when there is one, otherwise the published version.
  source: "draft" | "version" | "none";
  definition?: TaskDefinition;
  body?: Localized;
  draftUpdatedAt?: Date;
  // Whether publishing the draft would change the criteria compared to the current version.
  criteriaDiffer: boolean;
};

function criteriaKey(definition: TaskDefinition) {
  return JSON.stringify(definition.check.criteria);
}

export async function getTaskForEditor(id: string): Promise<EditorTask | undefined> {
  const db = getDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) return undefined;
  const [[draft], [version]] = await Promise.all([
    db.select().from(taskDrafts).where(eq(taskDrafts.taskId, id)).limit(1),
    task.currentVersion
      ? db
          .select()
          .from(taskVersions)
          .where(and(eq(taskVersions.taskId, id), eq(taskVersions.version, task.currentVersion)))
          .limit(1)
      : Promise.resolve([undefined]),
  ]);
  const shown = draft ?? version;
  return {
    id: task.id,
    moduleId: task.moduleId,
    order: task.order,
    currentVersion: task.currentVersion,
    archivedAt: task.archivedAt,
    source: draft ? "draft" : version ? "version" : "none",
    definition: shown?.definition,
    body: shown ? { de: shown.bodyDe, en: shown.bodyEn } : undefined,
    draftUpdatedAt: draft?.updatedAt,
    criteriaDiffer: Boolean(draft && version && criteriaKey(draft.definition) !== criteriaKey(version.definition)),
  };
}

/** Saves the draft; module and order are written to the task itself because they are not versioned. */
export async function saveTaskDraft(id: string, input: TaskInput, userId: string, create = false) {
  await getDb().transaction(async (tx) => {
    if (create) {
      await tx.insert(tasks).values({ id, moduleId: input.moduleId, order: input.order });
    } else {
      await tx.update(tasks).set({ moduleId: input.moduleId, order: input.order }).where(eq(tasks.id, id));
    }
    const row = {
      taskId: id,
      definition: input.definition,
      bodyDe: input.body.de,
      bodyEn: input.body.en,
      updatedBy: userId,
      updatedAt: new Date(),
    };
    await tx.insert(taskDrafts).values(row).onConflictDoUpdate({ target: taskDrafts.taskId, set: row });
  });
}

export async function taskExists(id: string) {
  const [row] = await getDb().select({ id: tasks.id }).from(tasks).where(eq(tasks.id, id)).limit(1);
  return Boolean(row);
}

export type PublishResult = { ok: true; version: number; criteriaChanged: boolean } | { ok: false; problems: string[] };

/**
 * Turns the draft into the next version. Validated against the published catalog with this
 * task replaced, so a broken reference never reaches the students.
 */
export async function publishTask(id: string, userId: string): Promise<PublishResult> {
  const db = getDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  const [draft] = await db.select().from(taskDrafts).where(eq(taskDrafts.taskId, id)).limit(1);
  if (!task || !draft) return { ok: false, problems: ["no draft to publish"] };

  const nextVersion = (task.currentVersion ?? 0) + 1;
  const candidate: Task = { ...draft.definition, id, version: nextVersion, module: task.moduleId, order: task.order };
  const catalog = await getCatalog();
  const moduleOrder = new Map(catalog.modules.map((m) => [m.id, m.order]));
  const list = [...catalog.tasks.filter((other) => other.id !== id), candidate].sort(
    (a, b) => (moduleOrder.get(a.module) ?? 0) - (moduleOrder.get(b.module) ?? 0) || a.order - b.order,
  );
  const problems = validateCatalog(catalog.modules, list);
  if (problems.length > 0) return { ok: false, problems };

  const current = task.currentVersion
    ? (
        await db
          .select({ definition: taskVersions.definition })
          .from(taskVersions)
          .where(and(eq(taskVersions.taskId, id), eq(taskVersions.version, task.currentVersion)))
          .limit(1)
      )[0]
    : undefined;
  const criteriaChanged = current ? criteriaKey(current.definition) !== criteriaKey(draft.definition) : false;

  await db.transaction(async (tx) => {
    await tx.insert(taskVersions).values({
      taskId: id,
      version: nextVersion,
      definition: draft.definition,
      bodyDe: draft.bodyDe,
      bodyEn: draft.bodyEn,
      criteriaChanged,
      createdBy: userId,
    });
    await tx.update(tasks).set({ currentVersion: nextVersion }).where(eq(tasks.id, id));
    await tx.delete(taskDrafts).where(eq(taskDrafts.taskId, id));
  });
  return { ok: true, version: nextVersion, criteriaChanged };
}

export async function discardDraft(id: string) {
  await getDb().delete(taskDrafts).where(eq(taskDrafts.taskId, id));
}

export async function setTaskArchived(id: string, archived: boolean) {
  await getDb()
    .update(tasks)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(tasks.id, id));
}

export async function listVersions(id: string) {
  return getDb()
    .select({
      version: taskVersions.version,
      publishedAt: taskVersions.publishedAt,
      criteriaChanged: taskVersions.criteriaChanged,
    })
    .from(taskVersions)
    .where(eq(taskVersions.taskId, id))
    .orderBy(desc(taskVersions.version));
}

export async function listModules(): Promise<TaskModule[]> {
  return getDb().select().from(modules).orderBy(asc(modules.order));
}

export async function saveModule(module: TaskModule, create = false) {
  const db = getDb();
  if (create) {
    await db.insert(modules).values(module);
  } else {
    await db.update(modules).set(module).where(eq(modules.id, module.id));
  }
}

export async function moduleExists(id: string) {
  const [row] = await getDb().select({ id: modules.id }).from(modules).where(eq(modules.id, id)).limit(1);
  return Boolean(row);
}

export async function unpublishedTaskIds() {
  return (await getDb().select({ id: tasks.id }).from(tasks).where(isNull(tasks.currentVersion))).map((row) => row.id);
}
