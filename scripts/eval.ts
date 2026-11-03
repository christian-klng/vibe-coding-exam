/**
 * Measures how well the model judges known repositories (evals/cases.yaml), so that models, prompts
 * and server settings can be compared. Needs the LLM server.
 *
 *   npm run eval [-- case-name-part]
 */
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import { runCheck } from "../src/checker";
import { createFixtureSource } from "../src/checker/fixture-source";
import { createCheckModel, getEnvLlmConfig } from "../src/lib/llm";
import { getTask } from "../src/lib/tasks/loader";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on variables from the environment.
}

const caseSchema = z.object({
  name: z.string(),
  task: z.string(),
  locale: z.enum(["de", "en"]),
  // Expected overall result, and optionally the expected judgement per criterion.
  expect: z.enum(["passed", "failed"]),
  criteria: z.record(z.string(), z.boolean()).default({}),
  repo: z.object({
    files: z.record(z.string(), z.string()).optional(),
    commits: z.array(z.object({ message: z.string(), additions: z.number().optional() })).optional(),
    branches: z.array(z.string()).optional(),
    pullRequests: z
      .array(
        z.object({
          number: z.number(),
          title: z.string(),
          body: z.string(),
          merged: z.boolean(),
          headBranch: z.string(),
          baseBranch: z.string(),
        }),
      )
      .optional(),
  }),
});

async function main() {
  const filter = process.argv[2] ?? "";
  const cases = caseSchema
    .array()
    .parse(parse(readFileSync("evals/cases.yaml", "utf8")))
    .filter((testCase) => testCase.name.includes(filter));

  let correct = 0;
  let errors = 0;
  let criteriaTotal = 0;
  let criteriaCorrect = 0;
  let totalMs = 0;

  for (const testCase of cases) {
    const task = getTask(testCase.task);
    if (!task) throw new Error(`Unknown task ${testCase.task}`);
    const started = Date.now();
    try {
      const outcome = await runCheck({
        task,
        locale: testCase.locale,
        source: createFixtureSource(testCase.repo),
        model: () => createCheckModel(getEnvLlmConfig()),
      });
      const duration = Date.now() - started;
      totalMs += duration;
      const ok = outcome.status === testCase.expect;
      if (ok) correct++;

      const wrong: string[] = [];
      for (const [id, expected] of Object.entries(testCase.criteria)) {
        const actual = outcome.criteria.find((criterion) => criterion.id === id)?.met;
        // No judgement at all means a pre-check decided; that is not the model's mistake.
        if (actual === undefined) continue;
        criteriaTotal++;
        if (actual === expected) criteriaCorrect++;
        else wrong.push(`${id}: expected ${expected}, got ${actual}`);
      }
      console.log(`${ok && wrong.length === 0 ? "PASS" : "FAIL"}  ${testCase.name} -> ${outcome.status} (${(duration / 1000).toFixed(1)} s)`);
      for (const line of wrong) console.log(`      ${line}`);
      if (!ok) console.log(`      ${outcome.summary}`);
    } catch (error) {
      errors++;
      console.log(`ERROR ${testCase.name}: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(
    `\n${correct}/${cases.length} overall results correct, ${criteriaCorrect}/${criteriaTotal} criteria correct, ` +
      `${errors} errors, ${(totalMs / 1000 / Math.max(cases.length, 1)).toFixed(1)} s per check`,
  );
  process.exit(correct === cases.length && errors === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
