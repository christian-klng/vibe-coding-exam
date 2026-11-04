import { and, eq, inArray, ne } from "drizzle-orm";
import { defaultLocale, isLocale } from "@/i18n/config";
import { checkTranslator, runCheck } from "@/checker";
import { NoVerdictError } from "@/checker/agent";
import { openGitHubRepo, RepoTooLargeError } from "@/checker/github-source";
import type { CheckOutcome } from "@/checker/types";
import { getDb } from "@/lib/db";
import { type CheckRun, checkRuns, LLM_NOT_CONFIGURED, taskProgress } from "@/lib/db/schema";
import { lookupRepository } from "@/lib/github/client";
import { createCheckModel, LlmNotConfiguredError } from "@/lib/llm";
import { getEffectiveLlmConfig } from "@/lib/settings";
import { getTask } from "@/lib/tasks/loader";

const STALE_RUNNING_MS = 30 * 60 * 1000;
const STALE_QUEUED_MS = 6 * 60 * 60 * 1000;

/** Moves the task's status on. A passed task stays passed: the result holds for the checked commit. */
async function settleProgress(run: CheckRun, status: "passed" | "failed" | "open") {
  await getDb()
    .update(taskProgress)
    .set({ status })
    .where(and(eq(taskProgress.userId, run.userId), eq(taskProgress.taskId, run.taskId), ne(taskProgress.status, "passed")));
}

async function failWithError(run: CheckRun, message: string) {
  const db = getDb();
  await db
    .update(checkRuns)
    .set({ status: "error", error: message.slice(0, 2000), finishedAt: new Date() })
    .where(eq(checkRuns.id, run.id));
  // Nothing was judged, so the task returns to what the last real result said.
  const [previous] = await db
    .select({ id: checkRuns.id })
    .from(checkRuns)
    .where(and(eq(checkRuns.userId, run.userId), eq(checkRuns.taskId, run.taskId), eq(checkRuns.status, "failed")))
    .limit(1);
  await settleProgress(run, previous ? "failed" : "open");
}

async function saveOutcome(run: CheckRun, outcome: CheckOutcome, commitSha: string | null, startedAt: number) {
  await getDb()
    .update(checkRuns)
    .set({
      status: outcome.status,
      commitSha,
      criteriaResults: outcome.criteria,
      summary: outcome.summary,
      nextStep: outcome.nextStep,
      model: outcome.model,
      inputTokens: outcome.inputTokens,
      outputTokens: outcome.outputTokens,
      durationMs: Date.now() - startedAt,
      error: null,
      finishedAt: new Date(),
    })
    .where(eq(checkRuns.id, run.id));
  await settleProgress(run, outcome.status);
}

async function check(run: CheckRun, startedAt: number) {
  const task = getTask(run.taskId);
  if (!task) throw new Error(`Unknown task ${run.taskId}`);
  const locale = isLocale(run.locale) ? run.locale : defaultLocale;
  const t = checkTranslator(locale);
  const failed = (key: "repoGone" | "repoEmpty" | "repoTooLarge"): CheckOutcome => ({
    status: "failed",
    criteria: [],
    summary: t(key),
  });

  // The address may have changed or gone private since it was entered.
  const repo = await lookupRepository(run.repoOwner, run.repoName);
  if (!repo.ok) {
    if (repo.reason === "notFound" || repo.reason === "private") {
      return saveOutcome(run, failed("repoGone"), null, startedAt);
    }
    throw new Error(`GitHub unavailable: ${repo.reason}`);
  }
  if (!repo.hasCommits) {
    return saveOutcome(run, failed("repoEmpty"), null, startedAt);
  }

  let source;
  try {
    source = await openGitHubRepo(repo.owner, repo.name, repo.defaultBranch);
  } catch (error) {
    if (error instanceof RepoTooLargeError) return saveOutcome(run, failed("repoTooLarge"), null, startedAt);
    throw error;
  }

  const llm = await getEffectiveLlmConfig();
  const outcome = await runCheck({ task, locale, source, model: () => createCheckModel(llm), modelName: llm.model });
  await saveOutcome(run, outcome, source.sha, startedAt);
}

/**
 * Runs one queued check. Errors are thrown back to the queue for a retry until the attempts are
 * used up; only then the student sees an error instead of "not passed".
 */
export async function processRun(runId: string, attempt: number, attemptsLeft: number) {
  const db = getDb();
  const [run] = await db.select().from(checkRuns).where(eq(checkRuns.id, runId));
  if (!run || (run.status !== "queued" && run.status !== "running")) return;

  const startedAt = Date.now();
  await db
    .update(checkRuns)
    .set({ status: "running", startedAt: new Date(startedAt), attempts: attempt + 1, error: null })
    .where(eq(checkRuns.id, runId));

  try {
    await check(run, startedAt);
  } catch (error) {
    if (error instanceof LlmNotConfiguredError) {
      console.error(`[worker] Check ${runId} (${run.taskId}): ${error.message}`);
      await failWithError(run, LLM_NOT_CONFIGURED);
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[worker] Check ${runId} (${run.taskId}) failed on attempt ${attempt + 1}`, error);
    // A model that found no verdict twice will not find one the third time; only outages need patience.
    if (attemptsLeft <= 0 || (error instanceof NoVerdictError && attempt >= 1)) {
      await failWithError(run, message);
      return;
    }
    await db.update(checkRuns).set({ status: "queued", error: message.slice(0, 2000) }).where(eq(checkRuns.id, runId));
    throw error;
  }
}

/** Safety net for jobs the queue gave up on, e.g. after a crash on the last attempt. */
export async function failStaleRuns() {
  const db = getDb();
  const active = await db.select().from(checkRuns).where(inArray(checkRuns.status, ["queued", "running"]));
  const now = Date.now();
  for (const run of active) {
    const staleRunning = run.status === "running" && run.startedAt && now - run.startedAt.getTime() > STALE_RUNNING_MS;
    const staleQueued = run.status === "queued" && now - run.createdAt.getTime() > STALE_QUEUED_MS;
    if (staleRunning || staleQueued) {
      console.error(`[worker] Giving up on stale check ${run.id}`);
      await failWithError(run, "Stale: no result in time");
    }
  }
}
