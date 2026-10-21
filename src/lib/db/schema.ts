import { sql } from "drizzle-orm";
import { boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

export const taskStatuses = ["open", "checking", "passed", "failed"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

// One row per user and task once the user has interacted with it; no row means "open".
export const taskProgress = pgTable(
  "task_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    status: text("status", { enum: taskStatuses }).default("open").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.taskId] }), index("task_progress_user_idx").on(table.userId)],
);

// GitHub repositories a user has entered. Exactly one is the primary repo used for all
// tasks; further rows are reserved for per-task overrides (see PLAN.md).
export const repositories = pgTable(
  "repositories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    isPrimary: boolean("is_primary").default(true).notNull(),
    verifiedAt: timestamp("verified_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("repositories_user_idx").on(table.userId),
    uniqueIndex("repositories_one_primary_per_user").on(table.userId).where(sql`${table.isPrimary}`),
  ],
);

export type Repository = typeof repositories.$inferSelect;
