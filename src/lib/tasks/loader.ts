import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { locales, type Locale } from "@/i18n/config";
import { moduleSchema, taskSchema, type Task, type TaskModule } from "./schema";

// Paths are built from process.cwd() + "tasks" directly (not via a variable),
// so Next.js only traces the tasks folder instead of the whole project.
function tasksPath(...segments: string[]) {
  return path.join(process.cwd(), "tasks", ...segments);
}

export type TaskCatalog = {
  modules: TaskModule[];
  tasks: Task[];
};

/**
 * Reads and validates all modules and tasks from the tasks/ folder.
 * Throws with a readable message when a file is missing or invalid.
 */
export function loadCatalog(): TaskCatalog {
  const modules = moduleSchema
    .array()
    .parse(parse(readFileSync(tasksPath("modules.yaml"), "utf8")))
    .sort((a, b) => a.order - b.order);

  const tasks = readdirSync(path.join(process.cwd(), "tasks"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const file = tasksPath(entry.name, "task.yaml");
      const result = taskSchema.safeParse(parse(readFileSync(file, "utf8")));
      if (!result.success) {
        throw new Error(`Invalid task ${file}: ${result.error.message}`);
      }
      if (result.data.id !== entry.name) {
        throw new Error(`Task id "${result.data.id}" must match its folder name "${entry.name}"`);
      }
      for (const locale of locales) {
        if (!existsSync(tasksPath(entry.name, `${locale}.md`))) {
          throw new Error(`Task ${entry.name} is missing ${locale}.md`);
        }
      }
      return result.data;
    });

  const moduleIds = new Set(modules.map((m) => m.id));
  const taskIds = new Set(tasks.map((t) => t.id));
  for (const task of tasks) {
    if (!moduleIds.has(task.module)) {
      throw new Error(`Task ${task.id} references unknown module "${task.module}"`);
    }
    for (const prerequisite of task.prerequisites) {
      if (!taskIds.has(prerequisite)) {
        throw new Error(`Task ${task.id} references unknown prerequisite "${prerequisite}"`);
      }
    }
  }

  const moduleOrder = new Map(modules.map((m) => [m.id, m.order]));
  tasks.sort((a, b) => moduleOrder.get(a.module)! - moduleOrder.get(b.module)! || a.order - b.order);
  return { modules, tasks };
}

// Tasks only change with a deployment, so production reads them once per process.
let cached: TaskCatalog | undefined;

export function getCatalog(): TaskCatalog {
  if (process.env.NODE_ENV !== "production") {
    return loadCatalog();
  }
  cached ??= loadCatalog();
  return cached;
}

export function getTask(id: string): Task | undefined {
  return getCatalog().tasks.find((task) => task.id === id);
}

export function getTaskBody(id: string, locale: Locale): string {
  return readFileSync(tasksPath(id, `${locale}.md`), "utf8");
}
