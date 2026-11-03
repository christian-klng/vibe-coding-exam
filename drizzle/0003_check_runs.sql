CREATE TABLE "check_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text NOT NULL,
	"task_version" integer NOT NULL,
	"locale" text NOT NULL,
	"repository_id" text,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"default_branch" text NOT NULL,
	"commit_sha" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"criteria_results" jsonb,
	"summary" text,
	"next_step" text,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"duration_ms" integer,
	"error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "check_runs" ADD CONSTRAINT "check_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_runs" ADD CONSTRAINT "check_runs_repository_id_repositories_id_fk" FOREIGN KEY ("repository_id") REFERENCES "public"."repositories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_runs_user_task_idx" ON "check_runs" USING btree ("user_id","task_id","created_at");--> statement-breakpoint
CREATE INDEX "check_runs_status_idx" ON "check_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "check_runs_one_active_per_task" ON "check_runs" USING btree ("user_id","task_id") WHERE "check_runs"."status" in ('queued', 'running');