import { describe, expect, it } from "vitest";
import { loadCatalog } from "./loader";
import type { Task } from "./schema";
import { validateCatalog } from "./validate";

describe("catalog validation", () => {
  const { modules, tasks } = loadCatalog();

  it("accepts the shipped task files", () => {
    expect(validateCatalog(modules, tasks)).toEqual([]);
  });

  it("names the problems of an invalid task", () => {
    const readme = tasks.find((task) => task.id === "readme")!;
    const broken: Task = {
      ...readme,
      module: "nowhere",
      prerequisites: ["go-live", "missing"],
      check: {
        ...readme.check,
        criteria: [
          { id: "a", required: false, text: { de: "x", en: "x" } },
          { id: "a", required: false, text: { de: "y", en: "y" } },
        ],
      },
    };
    const problems = validateCatalog(modules, tasks.map((task) => (task.id === "readme" ? broken : task)));
    expect(problems).toEqual([
      'readme: unknown module "nowhere"',
      'readme: prerequisite "go-live" comes later in the list',
      'readme: unknown prerequisite "missing"',
      "readme: duplicate criterion ids",
      "readme: needs at least one required criterion",
    ]);
  });
});
