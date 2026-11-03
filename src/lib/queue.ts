import { PgBoss } from "pg-boss";

export const CHECK_QUEUE = "task-check";
export type CheckJob = { runId: string };

function createBoss() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  const boss = new PgBoss({ connectionString: url, max: 4 });
  boss.on("error", (error) => console.error("[queue]", error));
  return boss;
}

// One instance per process, also across hot reloads in development.
const globalForQueue = globalThis as unknown as { boss?: Promise<PgBoss> };

export function getBoss() {
  globalForQueue.boss ??= (async () => {
    const boss = createBoss();
    await boss.start();
    await boss.createQueue(CHECK_QUEUE, {
      // A check takes at most 5 minutes (see agent.ts); a job running longer belongs to a dead worker.
      expireInSeconds: 7 * 60,
      // Long enough to survive a restart of the LLM server: about 25 minutes in total.
      retryLimit: 5,
      retryDelay: 60,
      retryBackoff: true,
      retryDelayMax: 600,
    });
    return boss;
  })().catch((error) => {
    globalForQueue.boss = undefined;
    throw error;
  });
  return globalForQueue.boss;
}
