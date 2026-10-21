/**
 * Validates all modules and tasks in tasks/: schema, both languages, module and
 * prerequisite references, and that prerequisites never point to a later task.
 *
 * Run with: npm run tasks:check
 */
import { loadCatalog } from "../src/lib/tasks/loader";

try {
  const { modules, tasks } = loadCatalog();
  const position = new Map(tasks.map((task, index) => [task.id, index]));
  const problems: string[] = [];

  for (const task of tasks) {
    for (const prerequisite of task.prerequisites) {
      if (position.get(prerequisite)! > position.get(task.id)!) {
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

  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log(`OK: ${modules.length} modules, ${tasks.length} tasks`);
  for (const task of tasks) {
    console.log(`  ${task.module.padEnd(10)} ${task.id}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
