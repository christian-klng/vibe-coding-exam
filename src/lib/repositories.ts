import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { repositories } from "@/lib/db/schema";

export async function getPrimaryRepository(userId: string) {
  const [repo] = await getDb()
    .select()
    .from(repositories)
    .where(and(eq(repositories.userId, userId), eq(repositories.isPrimary, true)))
    .limit(1);
  return repo;
}
