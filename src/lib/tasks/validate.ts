import type { Task, TaskModule } from "./schema";

/**
 * Rules that go beyond the schema. They apply to the task files (npm run tasks:check) and,
 * from the editor, to every publication. Returns readable problems; an empty list means valid.
 */
export function validateCatalog(modules: TaskModule[], tasks: Task[]): string[] {
  const problems: string[] = [];
  const moduleIds = new Set(modules.map((m) => m.id));
  const position = new Map(tasks.map((task, index) => [task.id, index]));

  for (const task of tasks) {
    if (!moduleIds.has(task.module)) {
      problems.push(`${task.id}: unknown module "${task.module}"`);
    }
    for (const prerequisite of task.prerequisites) {
      if (!position.has(prerequisite)) {
        problems.push(`${task.id}: unknown prerequisite "${prerequisite}"`);
      } else if (position.get(prerequisite)! > position.get(task.id)!) {
        problems.push(`${task.id}: prerequisite "${prerequisite}" comes later in the list`);
      }
    }
    const criterionIds = task.check.criteria.map((c) => c.id);
    if (new Set(criterionIds).size !== criterionIds.length) {
      problems.push(`${task.id}: duplicate criterion ids`);
    }
    if (!task.check.criteria.some((c) => c.required)) {
      problems.push(`${task.id}: needs at least one required criterion`);
    }
  }
  return problems;
}
