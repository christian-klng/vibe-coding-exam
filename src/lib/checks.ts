import { and, count, desc, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { fromDrizzle } from "pg-boss";
import type { Locale } from "@/i18n/config";
import { getDb } from "@/lib/db";
import { type CheckRun, checkRuns, type Repository, taskProgress } from "@/lib/db/schema";
import { CHECK_QUEUE, type CheckJob, getBoss } from "@/lib/queue";
import type { Task } from "@/lib/tasks/schema";

// Capacity of the self-hosted model is the bottleneck, see PLAN.md, section 7.
const MAX_CHECKS_PER_HOUR = 10;
const COOLDOWN_MS = 30 * 1000;
const HISTORY_LENGTH = 6;

export type StartCheckResult = { ok: true; runId: string } | { ok: false; reason: "rateLimited" | "cooldown" };

function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string }; code?: string }).cause ?? error;
  return (cause as { code?: string }).code === "23505";
}

/** Records a new check and queues it in one transaction, so neither exists without the other. */
export async function startCheck(userId: string, task: Task, repo: Repository, locale: Locale): Promise<StartCheckResult> {
  const db = getDb();
  const [latest] = await db
    .select({ createdAt: checkRuns.createdAt, status: checkRuns.status })
    .from(checkRuns)
    .where(and(eq(checkRuns.userId, userId), eq(checkRuns.taskId, task.id), ne(checkRuns.status, "error")))
    .orderBy(desc(checkRuns.createdAt))
    .limit(1);
  if (latest && Date.now() - latest.createdAt.getTime() < COOLDOWN_MS) {
    return { ok: false, reason: "cooldown" };
  }

  const [recent] = await db
    .select({ value: count() })
    .from(checkRuns)
    .where(
      and(
        eq(checkRuns.userId, userId),
        ne(checkRuns.status, "error"),
        gte(checkRuns.createdAt, new Date(Date.now() - 60 * 60 * 1000)),
      ),
    );
  if (recent.value >= MAX_CHECKS_PER_HOUR) {
    return { ok: false, reason: "rateLimited" };
  }

  const boss = await getBoss();
  try {
    const runId = await db.transaction(async (tx) => {
      const [run] = await tx
        .insert(checkRuns)
        .values({
          userId,
          taskId: task.id,
          taskVersion: task.version,
          locale,
          repositoryId: repo.id,
          repoOwner: repo.owner,
          repoName: repo.name,
          defaultBranch: repo.defaultBranch,
        })
        .returning({ id: checkRuns.id });
      await tx
        .insert(taskProgress)
        .values({ userId, taskId: task.id, status: "checking" })
        .onConflictDoUpdate({
          target: [taskProgress.userId, taskProgress.taskId],
          set: { status: "checking" },
          setWhere: ne(taskProgress.status, "passed"),
        });
      await boss.send(CHECK_QUEUE, { runId: run.id } satisfies CheckJob, { db: fromDrizzle(tx, sql) });
      return run.id;
    });
    return { ok: true, runId };
  } catch (error) {
    // A second click while the first check is still active.
    if (isUniqueViolation(error)) return { ok: false, reason: "cooldown" };
    throw error;
  }
}

/** Latest checks of a task, newest first, plus the place in line of an active one. */
export async function getTaskChecks(userId: string, taskId: string): Promise<{ runs: CheckRun[]; queuePosition: number }> {
  const db = getDb();
  const runs = await db
    .select()
    .from(checkRuns)
    .where(and(eq(checkRuns.userId, userId), eq(checkRuns.taskId, taskId)))
    .orderBy(desc(checkRuns.createdAt))
    .limit(HISTORY_LENGTH);

  let queuePosition = 0;
  if (runs[0]?.status === "queued") {
    const [ahead] = await db
      .select({ value: count() })
      .from(checkRuns)
      .where(and(inArray(checkRuns.status, ["queued", "running"]), lt(checkRuns.createdAt, runs[0].createdAt)));
    queuePosition = ahead.value + 1;
  }
  return { runs, queuePosition };
}
