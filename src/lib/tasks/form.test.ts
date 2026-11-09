import { describe, expect, it } from "vitest";
import { parseModuleForm, parseTaskForm, preChecksToYaml } from "./form";
import { loadCatalog } from "./loader";

function taskForm(overrides: Record<string, string | string[]> = {}) {
  const form = new FormData();
  const fields: Record<string, string | string[]> = {
    id: "readme",
    moduleId: "decisions",
    order: "1",
    "title.de": "README",
    "title.en": "README",
    "summary.de": "Kurz",
    "summary.en": "Short",
    requiresRepo: "on",
    appTypes: ["all"],
    prerequisites: ["app-idea"],
    checkType: "ai",
    scopePaths: "README*\n\nreadme*",
    preChecks: '- { fileExists: "README*" }\n- repoIsPublic: true',
    "body.de": "# Hallo",
    "body.en": "# Hello",
    "criterion.0.id": "what",
    "criterion.0.required": "on",
    "criterion.0.text.de": "Was",
    "criterion.0.text.en": "What",
    "criterion.1.id": "",
    "criterion.1.text.de": "",
    "criterion.1.text.en": "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) form.append(key, item);
  }
  return form;
}

describe("task editor form", () => {
  it("parses a complete form, ignoring empty criterion rows", () => {
    const result = parseTaskForm(taskForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.id).toBe("readme");
    expect(result.data.definition.check.scope).toEqual({ paths: ["README*", "readme*"] });
    expect(result.data.definition.check.preChecks).toEqual([{ fileExists: "README*" }, { repoIsPublic: true }]);
    expect(result.data.definition.check.criteria).toEqual([
      { id: "what", required: true, text: { de: "Was", en: "What" } },
    ]);
    expect(result.data.definition.showRepoForm).toBe(false);
    expect(result.data.body).toEqual({ de: "# Hallo", en: "# Hello" });
  });

  it("names every problem instead of stopping at the first", () => {
    const result = parseTaskForm(
      taskForm({ id: "Bad Id", order: "x", "title.en": "", preChecks: "- { unknown: 1 }", "body.en": "", "criterion.0.id": "Ü" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.some((p) => p.startsWith("id:"))).toBe(true);
    expect(result.problems.some((p) => p.startsWith("order:"))).toBe(true);
    expect(result.problems.some((p) => p.startsWith("title.en:"))).toBe(true);
    expect(result.problems.some((p) => p.startsWith("preChecks."))).toBe(true);
    expect(result.problems.some((p) => p.startsWith("body.en:"))).toBe(true);
    expect(result.problems.some((p) => p.startsWith("check.criteria.0.id:"))).toBe(true);
  });

  it("rejects invalid YAML in the pre-checks", () => {
    const result = parseTaskForm(taskForm({ preChecks: "- [unclosed" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems.some((p) => p.startsWith("preChecks:"))).toBe(true);
  });

  it("round-trips the pre-checks of every shipped task through YAML", () => {
    for (const task of loadCatalog().tasks) {
      const result = parseTaskForm(
        taskForm({
          preChecks: preChecksToYaml(task),
          checkType: task.check.type,
        }),
      );
      expect(result.ok, task.id).toBe(true);
      if (result.ok) expect(result.data.definition.check.preChecks).toEqual(task.check.preChecks);
    }
  });

  it("parses a module", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({ id: "start", order: "0", "title.de": "A", "title.en": "B", "description.de": "C", "description.en": "D" })) {
      form.append(key, value);
    }
    expect(parseModuleForm(form)).toEqual({
      ok: true,
      data: { id: "start", order: 0, title: { de: "A", en: "B" }, description: { de: "C", en: "D" } },
    });
    form.set("id", "Start!");
    expect(parseModuleForm(form).ok).toBe(false);
  });
});
