// Applies pending migrations from drizzle/. Runs locally (npm run db:migrate) and in the
// container before the server starts. Plain JavaScript so it needs no build step.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. in the container): use variables from the environment.
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
  console.log("Migrations applied");
} finally {
  await client.end();
}
