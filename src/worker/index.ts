import { createServer } from "node:http";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { CHECK_QUEUE, type CheckJob, getBoss } from "@/lib/queue";
import { failStaleRuns, processRun } from "./process-run";

try {
  process.loadEnvFile(".env.local");
} catch {
  // In the container the variables come from the environment.
}

const CONCURRENCY = Number(process.env.CHECK_CONCURRENCY ?? 1);
const STALE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

// The image's HEALTHCHECK asks port 3000 for /api/health, also in the worker container.
function serveHealthcheck(port: number) {
  createServer(async (_request, response) => {
    try {
      await getDb().execute(sql`select 1`);
      response.writeHead(200).end(JSON.stringify({ status: "ok", db: "ok" }));
    } catch {
      response.writeHead(503).end(JSON.stringify({ status: "error", db: "unreachable" }));
    }
  }).listen(port);
}

async function main() {
  const boss = await getBoss();
  const options = { includeMetadata: true, localConcurrency: CONCURRENCY } as const;
  await boss.work<CheckJob, void, typeof options>(CHECK_QUEUE, options, async ([job]) => {
    await processRun(job.data.runId, job.retryCount, job.retryLimit - job.retryCount);
  });

  const staleCheck = setInterval(() => void failStaleRuns().catch(console.error), STALE_CHECK_INTERVAL_MS);
  if (process.env.PORT) serveHealthcheck(Number(process.env.PORT));
  console.log(`[worker] Waiting for checks (up to ${CONCURRENCY} at a time)`);

  const stop = async () => {
    clearInterval(staleCheck);
    await boss.stop({ graceful: true, timeout: 30_000 });
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((error) => {
  console.error("[worker] Could not start", error);
  process.exit(1);
});
