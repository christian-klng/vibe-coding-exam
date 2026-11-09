import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { taskProgress, type TaskStatus } from "@/lib/db/schema";

/** Status per task for one user. Tasks without a row are "open". */
export async function getProgress(userId: string): Promise<Map<string, TaskStatus>> {
  const rows = await getDb()
    .select({ taskId: taskProgress.taskId, status: taskProgress.status })
    .from(taskProgress)
    .where(eq(taskProgress.userId, userId));
  return new Map(rows.map((row) => [row.taskId, row.status]));
}

/** Status and passed version of one task for one user; undefined when the user never touched it. */
export async function getTaskProgress(userId: string, taskId: string) {
  const [row] = await getDb()
    .select({ status: taskProgress.status, passedVersion: taskProgress.passedVersion })
    .from(taskProgress)
    .where(and(eq(taskProgress.userId, userId), eq(taskProgress.taskId, taskId)))
    .limit(1);
  return row;
}
