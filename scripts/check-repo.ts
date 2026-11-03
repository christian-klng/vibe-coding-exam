/**
 * Runs one check from the command line, without queue or database. Handy for trying out prompts:
 *
 *   npm run check:repo -- https://github.com/owner/repo readme [de|en]
 */
import { runCheck } from "../src/checker";
import { openGitHubRepo } from "../src/checker/github-source";
import { isLocale } from "../src/i18n/config";
import { lookupRepository } from "../src/lib/github/client";
import { parseRepoUrl } from "../src/lib/github/url";
import { createCheckModel, getEnvLlmConfig } from "../src/lib/llm";
import { getTask } from "../src/lib/tasks/loader";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on variables from the environment.
}

async function main() {
  const [url, taskId, localeArg = "de"] = process.argv.slice(2);
  const ref = url ? parseRepoUrl(url) : null;
  const task = taskId ? getTask(taskId) : undefined;
  if (!ref || !task || !isLocale(localeArg)) {
    console.error("Usage: npm run check:repo -- <github-url> <task-id> [de|en]");
    process.exit(1);
  }

  const repo = await lookupRepository(ref.owner, ref.name);
  if (!repo.ok) throw new Error(`Repository not available: ${repo.reason}`);

  const started = Date.now();
  const source = await openGitHubRepo(repo.owner, repo.name, repo.defaultBranch);
  console.log(`${source.fullName} at ${source.sha.slice(0, 7)}, ${source.files.size} files\n`);
  const llm = getEnvLlmConfig();
  const outcome = await runCheck({ task, locale: localeArg, source, model: () => createCheckModel(llm), modelName: llm.model });

  console.log(`${outcome.status.toUpperCase()}: ${outcome.summary}`);
  for (const criterion of outcome.criteria) {
    console.log(`  [${criterion.met ? "x" : " "}] ${criterion.id} (${criterion.evidence}): ${criterion.feedback}`);
  }
  if (outcome.nextStep) console.log(`Next step: ${outcome.nextStep}`);
  console.log(`\n${((Date.now() - started) / 1000).toFixed(1)} s, tokens in/out: ${outcome.inputTokens}/${outcome.outputTokens}, model: ${llm.model}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
