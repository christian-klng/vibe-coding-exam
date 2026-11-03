import type { LanguageModel } from "ai";
import { createTranslator } from "next-intl";
import { defaultLocale, type Locale } from "@/i18n/config";
import type { Task } from "@/lib/tasks/schema";
import de from "../../messages/de.json";
import en from "../../messages/en.json";
import { runAgent } from "./agent";
import { runPreChecks } from "./pre-checks";
import type { CheckOutcome, RepoSource } from "./types";

const messages = { de, en };

export function checkTranslator(locale: Locale = defaultLocale) {
  return createTranslator({ locale, messages: messages[locale], namespace: "Checks.pre" });
}

/**
 * Checks one task against a repository frozen at one commit: first what code can decide, then the
 * agent. Whether the task is passed is decided here, from the required criteria, not by the model.
 */
export async function runCheck({
  task,
  locale,
  source,
  model,
  modelName,
}: {
  task: Task;
  locale: Locale;
  source: RepoSource;
  model: () => LanguageModel;
  modelName?: string;
}): Promise<CheckOutcome> {
  const { failures, facts } = await runPreChecks(task, source);
  if (failures.length > 0) {
    const t = checkTranslator(locale);
    const summary = failures.map(({ key, values }) => t(key as Parameters<typeof t>[0], values as never)).join(" ");
    return { status: "failed", criteria: [], summary };
  }

  const verdict = await runAgent({ task, locale, source, facts, model: model() });
  const passed = task.check.criteria.every(
    (criterion) => !criterion.required || verdict.criteria.find((result) => result.id === criterion.id)?.met,
  );
  return { status: passed ? "passed" : "failed", model: modelName, ...verdict };
}
