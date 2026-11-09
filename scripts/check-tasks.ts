/**
 * Validates all modules and tasks in tasks/: schema, both languages, module and
 * prerequisite references, and that prerequisites never point to a later task.
 * The files are the import source for a fresh database (npm run tasks:import).
 *
 * Run with: npm run tasks:check
 */
import { loadCatalog } from "../src/lib/tasks/loader";
import { validateCatalog } from "../src/lib/tasks/validate";

try {
  const { modules, tasks } = loadCatalog();
  const problems = validateCatalog(modules, tasks);

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
