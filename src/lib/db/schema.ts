import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
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
