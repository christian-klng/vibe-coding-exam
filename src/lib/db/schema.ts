import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Localized, TaskDefinition } from "@/lib/tasks/schema";
import { user } from "./auth-schema";

export * from "./auth-schema";

// Modules group the tasks. They carry no versions because they do not influence any result.
export const modules = pgTable("modules", {
  id: text("id").primaryKey(),
  order: integer("order").notNull(),
  title: jsonb("title").$type<Localized>().notNull(),
  description: jsonb("description").$type<Localized>().notNull(),
});

// One row per task. Module and order are not versioned: moving a task changes no result.
// current_version is null until the first publication; archived tasks keep their versions.
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  moduleId: text("module_id")
    .notNull()
    .references(() => modules.id),
  order: integer("order").notNull(),
  currentVersion: integer("current_version"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// A published version is never changed. Check runs and progress refer to (task_id, version).
export const taskVersions = pgTable(
  "task_versions",
  {
    taskId: text("task_id")
      .notNull()
      .references(() => tasks.id),
    version: integer("version").notNull(),
    definition: jsonb("definition").$type<TaskDefinition>().notNull(),
    bodyDe: text("body_de").notNull(),
    bodyEn: text("body_en").notNull(),
    // Whether the criteria differ from the previous version, so a repeated check may end differently.
    criteriaChanged: boolean("criteria_changed").default(false).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at").defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.version] })],
);

// At most one draft per task; publishing turns it into the next version and deletes it.
export const taskDrafts = pgTable("task_drafts", {
  taskId: text("task_id")
    .primaryKey()
    .references(() => tasks.id),
  definition: jsonb("definition").$type<TaskDefinition>().notNull(),
  bodyDe: text("body_de").notNull(),
  bodyEn: text("body_en").notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TaskVersionRow = typeof taskVersions.$inferSelect;

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
    // The version that was passed. Stays when a newer version is published.
    passedVersion: integer("passed_version"),
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

// Values admins can change at runtime, e.g. the LLM access. Secrets are stored encrypted.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const checkRunStatuses = ["queued", "running", "passed", "failed", "error"] as const;
export type CheckRunStatus = (typeof checkRunStatuses)[number];
// Stored in check_runs.error when the page should say more than "something went wrong".
export const LLM_NOT_CONFIGURED = "llm-not-configured";
export type CheckCriterionResult = { id: string; met: boolean; evidence: string; feedback: string };

// One row per check of a task, kept as history. Results apply to the commit that was checked.
export const checkRuns = pgTable(
  "check_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull(),
    // No foreign key on purpose: the rows predate task_versions and the import runs after the migration.
    taskVersion: integer("task_version").notNull(),
    locale: text("locale").notNull(),
    repositoryId: text("repository_id").references(() => repositories.id, { onDelete: "set null" }),
    repoOwner: text("repo_owner").notNull(),
    repoName: text("repo_name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    commitSha: text("commit_sha"),
    status: text("status", { enum: checkRunStatuses }).default("queued").notNull(),
    criteriaResults: jsonb("criteria_results").$type<CheckCriterionResult[]>(),
    summary: text("summary"),
    nextStep: text("next_step"),
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    durationMs: integer("duration_ms"),
    // Technical reason for the log; students only see a general message.
    error: text("error"),
    attempts: integer("attempts").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
  },
  (table) => [
    index("check_runs_user_task_idx").on(table.userId, table.taskId, table.createdAt),
    index("check_runs_status_idx").on(table.status, table.createdAt),
    // A task can only be checked once at a time, also when the button is clicked twice.
    uniqueIndex("check_runs_one_active_per_task")
      .on(table.userId, table.taskId)
      .where(sql`${table.status} in ('queued', 'running')`),
  ],
);

export type CheckRun = typeof checkRuns.$inferSelect;
