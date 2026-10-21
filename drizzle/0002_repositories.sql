CREATE TABLE "repositories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"url" text NOT NULL,
	"owner" text NOT NULL,
	"name" text NOT NULL,
	"default_branch" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"verified_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "repositories" ADD CONSTRAINT "repositories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "repositories_user_idx" ON "repositories" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repositories_one_primary_per_user" ON "repositories" USING btree ("user_id") WHERE "repositories"."is_primary";