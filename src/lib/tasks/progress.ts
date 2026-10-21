import { eq } from "drizzle-orm";
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
