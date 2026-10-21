CREATE TABLE "task_progress" (
	"user_id" text NOT NULL,
	"task_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_progress_user_id_task_id_pk" PRIMARY KEY("user_id","task_id")
);
--> statement-breakpoint
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_progress_user_idx" ON "task_progress" USING btree ("user_id");