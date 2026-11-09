import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { checkRuns, taskProgress, user } from "@/lib/db/schema";

export type PassedRow = {
  userId: string;
  name: string;
  email: string;
  taskId: string;
  passedVersion: number | null;
  passedAt: Date;
  commitSha: string | null;
  repo: string | null;
};

export type PassedFilter = { taskId?: string; search?: string };

/**
 * Who passed which task with which version. The commit comes from the passing check run;
 * tasks passed without a run (the repository task) have none.
 */
export async function listPassed(filter: PassedFilter = {}): Promise<PassedRow[]> {
  const db = getDb();
  const conditions: SQL[] = [eq(taskProgress.status, "passed")];
  if (filter.taskId) conditions.push(eq(taskProgress.taskId, filter.taskId));
  if (filter.search) {
    const pattern = `%${filter.search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(user.email, pattern), ilike(user.name, pattern))!);
  }

  const [rows, runs] = await Promise.all([
    db
      .select({
        userId: taskProgress.userId,
        name: user.name,
        email: user.email,
        taskId: taskProgress.taskId,
        passedVersion: taskProgress.passedVersion,
        passedAt: taskProgress.updatedAt,
      })
      .from(taskProgress)
      .innerJoin(user, eq(user.id, taskProgress.userId))
      .where(and(...conditions))
      .orderBy(desc(taskProgress.updatedAt)),
    db
      .select({
        userId: checkRuns.userId,
        taskId: checkRuns.taskId,
        commitSha: checkRuns.commitSha,
        repoOwner: checkRuns.repoOwner,
        repoName: checkRuns.repoName,
        finishedAt: checkRuns.finishedAt,
      })
      .from(checkRuns)
      .where(eq(checkRuns.status, "passed"))
      .orderBy(desc(checkRuns.finishedAt)),
  ]);

  // The newest passing run per user and task; a passed task is never checked again.
  const passingRun = new Map<string, (typeof runs)[number]>();
  for (const run of runs) {
    const key = `${run.userId}:${run.taskId}`;
    if (!passingRun.has(key)) passingRun.set(key, run);
  }
  return rows.map((row) => {
    const run = passingRun.get(`${row.userId}:${row.taskId}`);
    return {
      ...row,
      passedAt: run?.finishedAt ?? row.passedAt,
      commitSha: run?.commitSha ?? null,
      repo: run ? `${run.repoOwner}/${run.repoName}` : null,
    };
  });
}

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Semicolon-separated with a UTF-8 BOM, which German Excel opens correctly by double-click. */
export function passedToCsv(rows: PassedRow[], taskTitle: (taskId: string) => string) {
  const header = ["name", "email", "task_id", "task", "version", "passed_at", "repository", "commit"];
  const lines = rows.map((row) =>
    [row.name, row.email, row.taskId, taskTitle(row.taskId), row.passedVersion, row.passedAt.toISOString(), row.repo, row.commitSha]
      .map(csvCell)
      .join(";"),
  );
  return `﻿${[header.join(";"), ...lines].join("\n")}\n`;
}
