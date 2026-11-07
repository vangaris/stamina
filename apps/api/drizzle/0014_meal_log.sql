CREATE TABLE "meal_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"slot_index" integer NOT NULL,
	"status" text NOT NULL,
	"template_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meal_log_slot_index_valid" CHECK ("meal_log"."slot_index" between 0 and 4),
	CONSTRAINT "meal_log_status_valid" CHECK ("meal_log"."status" in ('ate', 'something-else', 'skipped'))
);
--> statement-breakpoint
ALTER TABLE "meal_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `water_log`: the app reads and inserts its own rows (policies below), never
-- rewrites or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "meal_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "meal_log" TO stamina_app;--> statement-breakpoint
ALTER TABLE "meal_log" ADD CONSTRAINT "meal_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_log_user_date" ON "meal_log" USING btree ("user_id","date");--> statement-breakpoint
CREATE POLICY "meal_log_owner_select" ON "meal_log" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "meal_log_owner_insert" ON "meal_log" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);