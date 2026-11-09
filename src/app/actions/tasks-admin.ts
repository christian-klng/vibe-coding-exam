"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import {
  discardDraft,
  moduleExists,
  publishTask,
  saveModule,
  saveTaskDraft,
  setTaskArchived,
  taskExists,
} from "@/lib/tasks/admin";
import { parseModuleForm, parseTaskForm } from "@/lib/tasks/form";

export type TaskEditorState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "published"; version: number; criteriaChanged: boolean }
  | { status: "error"; problems: string[] };

function revalidateTasks() {
  // Students' pages and the admin list both show the catalog.
  revalidatePath("/", "layout");
}

/**
 * Saves the form as the draft. With intent "publish" it also publishes it in the same step.
 * A new task (create = true) redirects to its editor page afterwards.
 */
export async function saveTask(create: boolean, _previous: TaskEditorState, formData: FormData): Promise<TaskEditorState> {
  const session = await requireAdmin();
  const parsed = parseTaskForm(formData);
  if (!parsed.ok) return { status: "error", problems: parsed.problems };
  const { id, ...input } = parsed.data;

  if (create && (await taskExists(id))) {
    return { status: "error", problems: [`id: a task "${id}" already exists`] };
  }
  await saveTaskDraft(id, input, session.user.id, create);

  let state: TaskEditorState = { status: "saved" };
  if (formData.get("intent") === "publish") {
    const result = await publishTask(id, session.user.id);
    state = result.ok
      ? { status: "published", version: result.version, criteriaChanged: result.criteriaChanged }
      : { status: "error", problems: result.problems };
  }
  revalidateTasks();
  if (create) redirect(`/admin/tasks/${id}`);
  return state;
}

export async function discardTaskDraft(taskId: string) {
  await requireAdmin();
  await discardDraft(taskId);
  revalidateTasks();
}

export async function archiveTask(taskId: string, archived: boolean) {
  await requireAdmin();
  await setTaskArchived(taskId, archived);
  revalidateTasks();
}

export type ModuleFormState = { status: "idle" | "saved" } | { status: "error"; problems: string[] };

export async function saveModuleAction(create: boolean, _previous: ModuleFormState, formData: FormData): Promise<ModuleFormState> {
  await requireAdmin();
  const parsed = parseModuleForm(formData);
  if (!parsed.ok) return { status: "error", problems: parsed.problems };
  if (create && (await moduleExists(parsed.data.id))) {
    return { status: "error", problems: [`id: a module "${parsed.data.id}" already exists`] };
  }
  await saveModule(parsed.data, create);
  revalidateTasks();
  return { status: "saved" };
}
