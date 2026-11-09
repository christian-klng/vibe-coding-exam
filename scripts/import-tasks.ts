/**
 * Imports the task files from tasks/ into the database as version 1, if the tasks table is still
 * empty. Runs locally with `npm run tasks:import` and in the web container after the migrations.
 */
import { importCatalog } from "../src/lib/tasks/import";
import { getTaskBody, loadCatalog } from "../src/lib/tasks/loader";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. in the container): use variables from the environment.
}

async function main() {
  const { modules, tasks } = loadCatalog();
  const withBodies = tasks.map((task) => ({ ...task, body: { de: getTaskBody(task.id, "de"), en: getTaskBody(task.id, "en") } }));
  const result = await importCatalog({ modules, tasks: withBodies });
  if (result.imported) {
    console.log(`Imported ${result.modules} modules and ${result.tasks} tasks as version 1 (${result.progressRows} passed rows updated)`);
  } else {
    console.log("Tasks already in the database, nothing imported");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
