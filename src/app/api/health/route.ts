import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDb } from "@/lib/db";

// Used by Railway's healthcheck. Returns 503 when the database is unreachable.
export async function GET() {
  await connection();

  if (!process.env.DATABASE_URL) {
    return Response.json({ status: "ok", db: "not_configured" });
  }

  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: "ok", db: "ok" });
  } catch (error) {
    console.error("Health check: database unreachable", error);
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
