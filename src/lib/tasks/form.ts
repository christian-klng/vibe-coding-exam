import { parse } from "yaml";
import { z } from "zod";
import { moduleSchema, preCheckSchema, taskDefinitionSchema, type TaskDefinition, type TaskModule } from "./schema";

export type ParsedTaskForm = {
  id: string;
  moduleId: string;
  order: number;
  definition: TaskDefinition;
  body: { de: string; en: string };
};

export type ParseResult<T> = { ok: true; data: T } | { ok: false; problems: string[] };

const idSchema = z.string().regex(/^[a-z0-9-]+$/, "only lowercase letters, digits and hyphens");

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function problemsOf(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".") || "form"}: ${issue.message}`);
}

/** "docs/*.md\nREADME*" → ["docs/*.md", "README*"] */
function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Reads the criteria rows: criterion.<n>.id, criterion.<n>.required, criterion.<n>.text.de / .en. */
function criteriaOf(form: FormData) {
  const indexes = new Set<number>();
  for (const key of form.keys()) {
    const match = /^criterion\.(\d+)\./.exec(key);
    if (match) indexes.add(Number(match[1]));
  }
  return [...indexes]
    .sort((a, b) => a - b)
    .map((index) => ({
      id: text(form, `criterion.${index}.id`),
      required: form.get(`criterion.${index}.required`) === "on",
      text: { de: text(form, `criterion.${index}.text.de`), en: text(form, `criterion.${index}.text.en`) },
    }))
    // Empty rows (added, never filled) are ignored instead of failing.
    .filter((criterion) => criterion.id || criterion.text.de || criterion.text.en);
}

/** Turns the editor's form data into a validated task. Problems are readable, field by field. */
export function parseTaskForm(form: FormData): ParseResult<ParsedTaskForm> {
  const problems: string[] = [];

  const id = idSchema.safeParse(text(form, "id"));
  if (!id.success) problems.push(`id: ${id.error.issues[0].message}`);

  const order = Number(text(form, "order"));
  if (!Number.isInteger(order)) problems.push("order: must be a whole number");

  let preChecks: unknown = [];
  const preChecksYaml = text(form, "preChecks");
  if (preChecksYaml) {
    try {
      preChecks = parse(preChecksYaml) ?? [];
    } catch (error) {
      problems.push(`preChecks: ${error instanceof Error ? error.message : "invalid YAML"}`);
    }
  }
  const preChecksResult = z.array(preCheckSchema).safeParse(preChecks);
  if (!preChecksResult.success) problems.push(...problemsOf(preChecksResult.error).map((p) => `preChecks.${p}`));

  const scopePaths = lines(text(form, "scopePaths"));
  const definition = taskDefinitionSchema.safeParse({
    title: { de: text(form, "title.de"), en: text(form, "title.en") },
    summary: { de: text(form, "summary.de"), en: text(form, "summary.en") },
    requiresRepo: form.get("requiresRepo") === "on",
    showRepoForm: form.get("showRepoForm") === "on",
    appTypes: form.getAll("appTypes").filter((value): value is string => typeof value === "string"),
    prerequisites: form.getAll("prerequisites").filter((value): value is string => typeof value === "string"),
    check: {
      type: text(form, "checkType"),
      scope: scopePaths.length > 0 ? { paths: scopePaths } : undefined,
      preChecks: preChecksResult.success ? preChecksResult.data : [],
      criteria: criteriaOf(form),
    },
  });
  if (!definition.success) problems.push(...problemsOf(definition.error));

  const body = { de: text(form, "body.de"), en: text(form, "body.en") };
  if (!body.de) problems.push("body.de: required");
  if (!body.en) problems.push("body.en: required");

  if (problems.length > 0 || !id.success || !definition.success) return { ok: false, problems };
  return { ok: true, data: { id: id.data, moduleId: text(form, "moduleId"), order, definition: definition.data, body } };
}

export function parseModuleForm(form: FormData): ParseResult<TaskModule> {
  const result = moduleSchema.safeParse({
    id: text(form, "id"),
    order: Number(text(form, "order")),
    title: { de: text(form, "title.de"), en: text(form, "title.en") },
    description: { de: text(form, "description.de"), en: text(form, "description.en") },
  });
  return result.success ? { ok: true, data: result.data } : { ok: false, problems: problemsOf(result.error) };
}

/** The pre-checks of a task as YAML for the editor's text field. */
export function preChecksToYaml(definition: TaskDefinition) {
  return definition.check.preChecks.length === 0
    ? ""
    : definition.check.preChecks.map((check) => `- ${JSON.stringify(check)}`).join("\n");
}
