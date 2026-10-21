import { describe, expect, it } from "vitest";
import { loadCatalog } from "./loader";

describe("task catalog", () => {
  it("loads all tasks without validation errors", () => {
    const { modules, tasks } = loadCatalog();
    expect(modules.length).toBeGreaterThan(0);
    expect(tasks.length).toBeGreaterThan(0);
  });
});
