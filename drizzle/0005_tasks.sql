CREATE TABLE "modules" (
	"id" text PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_drafts" (
	"task_id" text PRIMARY KEY NOT NULL,
	"definition" jsonb NOT NULL,
	"body_de" text NOT NULL,
	"body_en" text NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_versions" (
	"task_id" text NOT NULL,
	"version" integer NOT NULL,
	"definition" jsonb NOT NULL,
	"body_de" text NOT NULL,
	"body_en" text NOT NULL,
	"criteria_changed" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"published_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_versions_task_id_version_pk" PRIMARY KEY("task_id","version")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"module_id" text NOT NULL,
	"order" integer NOT NULL,
	"current_version" integer,
	"archived_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_progress" ADD COLUMN "passed_version" integer;--> statement-breakpoint
ALTER TABLE "task_drafts" ADD CONSTRAINT "task_drafts_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_drafts" ADD CONSTRAINT "task_drafts_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_versions" ADD CONSTRAINT "task_versions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_versions" ADD CONSTRAINT "task_versions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;