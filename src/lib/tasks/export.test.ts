import { parse } from "yaml";
import { describe, expect, it } from "vitest";
import { catalogToFiles } from "./export";
import { getTaskBody, loadCatalog } from "./loader";
import { moduleSchema, taskSchema } from "./schema";

describe("task export", () => {
  it("writes files the loader schema accepts and that equal the shipped tasks", () => {
    const { modules, tasks } = loadCatalog();
    const files = catalogToFiles({
      modules,
      tasks: tasks.map((task) => ({ ...task, body: { de: getTaskBody(task.id, "de"), en: getTaskBody(task.id, "en") } })),
    });
    expect(moduleSchema.array().parse(parse(files["modules.yaml"]))).toEqual(modules);
    for (const task of tasks) {
      expect(taskSchema.parse(parse(files[`${task.id}/task.yaml`])), task.id).toEqual(task);
      expect(files[`${task.id}/de.md`]).toBe(getTaskBody(task.id, "de"));
    }
  });
});
