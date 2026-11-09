import { stringify } from "yaml";
import type { Catalog, CatalogTask } from "./catalog";

/** A task as its task.yaml, in the file format from PLAN.md section 6 (the import source). */
export function taskToYaml(rest: CatalogTask) {
  // Same key order as the shipped files, so a diff against them stays readable.
  const ordered = {
    id: rest.id,
    version: rest.version,
    module: rest.module,
    order: rest.order,
    title: rest.title,
    summary: rest.summary,
    requiresRepo: rest.requiresRepo,
    ...(rest.showRepoForm ? { showRepoForm: true } : {}),
    appTypes: rest.appTypes,
    prerequisites: rest.prerequisites,
    check: {
      type: rest.check.type,
      ...(rest.check.scope ? { scope: rest.check.scope } : {}),
      ...(rest.check.preChecks.length > 0 ? { preChecks: rest.check.preChecks } : {}),
      criteria: rest.check.criteria,
    },
  };
  return stringify(ordered, { lineWidth: 0 });
}

/** All files of the catalog, keyed by path: modules.yaml and one folder per task. */
export function catalogToFiles(catalog: Catalog): Record<string, string> {
  const files: Record<string, string> = {
    "modules.yaml": stringify(catalog.modules, { lineWidth: 0 }),
  };
  for (const task of catalog.tasks) {
    files[`${task.id}/task.yaml`] = taskToYaml(task);
    files[`${task.id}/de.md`] = task.body.de.endsWith("\n") ? task.body.de : `${task.body.de}\n`;
    files[`${task.id}/en.md`] = task.body.en.endsWith("\n") ? task.body.en : `${task.body.en}\n`;
  }
  return files;
}
