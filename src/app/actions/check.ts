"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { defaultLocale, isLocale } from "@/i18n/config";
import { startCheck } from "@/lib/checks";
import { getPrimaryRepository } from "@/lib/repositories";
import { requireSession } from "@/lib/session";
import { getTask } from "@/lib/tasks/catalog";

export type CheckErrorKey = "rateLimited" | "cooldown" | "noRepo" | "notCheckable";
export type RequestCheckState = { error?: CheckErrorKey };

export async function requestCheck(taskId: string): Promise<RequestCheckState> {
  const session = await requireSession();
  const task = await getTask(taskId);
  if (!task || (task.check.type !== "ai" && task.check.type !== "url")) {
    return { error: "notCheckable" };
  }
  const repo = await getPrimaryRepository(session.user.id);
  if (!repo) {
    return { error: "noRepo" };
  }

  const value = await getLocale();
  const result = await startCheck(session.user.id, task, repo, isLocale(value) ? value : defaultLocale);
  if (!result.ok) {
    return { error: result.reason };
  }
  revalidatePath("/tasks", "layout");
  return {};
}
