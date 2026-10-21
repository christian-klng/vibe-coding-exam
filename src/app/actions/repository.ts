"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { repositories, taskProgress } from "@/lib/db/schema";
import { lookupRepository } from "@/lib/github/client";
import { parseRepoUrl } from "@/lib/github/url";
import { requireSession } from "@/lib/session";

export type RepoErrorKey = "invalidUrl" | "notFound" | "private" | "rateLimited" | "unavailable";

export type SaveRepoState =
  | { status: "idle" }
  | { status: "error"; error: RepoErrorKey; value: string }
  | { status: "saved"; hasCommits: boolean };

// The first task is checked right away: it only asks for a public repository with a commit.
const REPO_TASK_ID = "github-repo";

export async function saveRepository(_previous: SaveRepoState, formData: FormData): Promise<SaveRepoState> {
  const session = await requireSession();
  const value = String(formData.get("url") ?? "").trim();

  const ref = parseRepoUrl(value);
  if (!ref) {
    return { status: "error", error: "invalidUrl", value };
  }

  const repo = await lookupRepository(ref.owner, ref.name);
  if (!repo.ok) {
    return { status: "error", error: repo.reason, value };
  }

  const userId = session.user.id;
  const fields = {
    url: repo.url,
    owner: repo.owner,
    name: repo.name,
    defaultBranch: repo.defaultBranch,
    verifiedAt: new Date(),
  };

  await getDb().transaction(async (tx) => {
    const updated = await tx
      .update(repositories)
      .set(fields)
      .where(and(eq(repositories.userId, userId), eq(repositories.isPrimary, true)))
      .returning({ id: repositories.id });
    if (updated.length === 0) {
      await tx.insert(repositories).values({ ...fields, userId, isPrimary: true });
    }

    const status = repo.hasCommits ? "passed" : "failed";
    await tx
      .insert(taskProgress)
      .values({ userId, taskId: REPO_TASK_ID, status })
      .onConflictDoUpdate({
        target: [taskProgress.userId, taskProgress.taskId],
        set: { status },
        // A passed task stays passed (see PLAN.md, decisions), even if the repo is changed later.
        setWhere: ne(taskProgress.status, "passed"),
      });
  });

  revalidatePath("/tasks", "layout");
  return { status: "saved", hasCommits: repo.hasCommits };
}
