CREATE TABLE "session_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"rpe" integer NOT NULL,
	"minutes" integer NOT NULL,
	"load" integer NOT NULL,
	"finished_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_log_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "session_log_rpe_valid" CHECK ("session_log"."rpe" between 1 and 10),
	CONSTRAINT "session_log_minutes_valid" CHECK ("session_log"."minutes" between 1 and 300),
	CONSTRAINT "session_log_load_valid" CHECK ("session_log"."load" = "session_log"."rpe" * "session_log"."minutes")
);
--> statement-breakpoint
ALTER TABLE "session_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `block`: the app reads and inserts its own rows (policies below), never rewrites
-- or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "session_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "session_log" TO stamina_app;--> statement-breakpoint
CREATE TABLE "set_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"session_exercise_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"set_number" integer NOT NULL,
	"weight_kg" numeric(6, 2) NOT NULL,
	"reps" integer NOT NULL,
	"rpe" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "set_log_session_exercise_set_number" UNIQUE("session_exercise_id","set_number"),
	CONSTRAINT "set_log_set_number_valid" CHECK ("set_log"."set_number" between 1 and 20),
	CONSTRAINT "set_log_weight_valid" CHECK ("set_log"."weight_kg" between 0 and 1000),
	CONSTRAINT "set_log_reps_valid" CHECK ("set_log"."reps" between 0 and 600),
	CONSTRAINT "set_log_rpe_valid" CHECK ("set_log"."rpe" between 6 and 10)
);
--> statement-breakpoint
ALTER TABLE "set_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `block`: the app reads and inserts its own rows (policies below), never rewrites
-- or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "set_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "set_log" TO stamina_app;--> statement-breakpoint
ALTER TABLE "session" DROP CONSTRAINT "session_status_valid";--> statement-breakpoint
ALTER TABLE "session_log" ADD CONSTRAINT "session_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_log" ADD CONSTRAINT "session_log_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_session_exercise_id_session_exercise_id_fk" FOREIGN KEY ("session_exercise_id") REFERENCES "public"."session_exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "set_log_user_exercise" ON "set_log" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "set_log_session" ON "set_log" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_status_valid" CHECK ("session"."status" in ('planned', 'completed'));--> statement-breakpoint
CREATE POLICY "session_log_owner_select" ON "session_log" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "session_log_owner_insert" ON "session_log" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "set_log_owner_select" ON "set_log" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "set_log_owner_insert" ON "set_log" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);