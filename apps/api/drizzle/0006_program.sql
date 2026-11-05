CREATE TABLE "block" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"emphasis" text NOT NULL,
	"starts_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_program_position" UNIQUE("program_id","position"),
	CONSTRAINT "block_emphasis_valid" CHECK ("block"."emphasis" in ('strength', 'power-speed', 'strength-endurance')),
	CONSTRAINT "block_position_positive" CHECK ("block"."position" >= 1)
);
--> statement-breakpoint
ALTER TABLE "block" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `consent`: the app reads and inserts its own rows (policies below), never rewrites
-- or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "block" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "block" TO stamina_app;--> statement-breakpoint
CREATE TABLE "program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "program_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "program" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "program" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "program" TO stamina_app;--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	"week_in_block" integer NOT NULL,
	"date" date NOT NULL,
	"weekday" text NOT NULL,
	"focus" text NOT NULL,
	"minutes" integer NOT NULL,
	"status" text NOT NULL,
	"limited" boolean NOT NULL,
	"beta" boolean NOT NULL,
	"revision" integer NOT NULL,
	"supersedes_id" uuid,
	"rules_version" integer NOT NULL,
	"model" text,
	"prompt_version" text,
	"inputs_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_block_date_revision" UNIQUE("block_id","date","revision"),
	CONSTRAINT "session_week_in_block_valid" CHECK ("session"."week_in_block" between 1 and 4),
	CONSTRAINT "session_weekday_valid" CHECK ("session"."weekday" in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
	CONSTRAINT "session_focus_valid" CHECK ("session"."focus" in ('lower', 'upper', 'recovery')),
	CONSTRAINT "session_minutes_valid" CHECK ("session"."minutes" in (30, 45, 60)),
	CONSTRAINT "session_status_valid" CHECK ("session"."status" in ('planned')),
	CONSTRAINT "session_revision_positive" CHECK ("session"."revision" >= 1),
	CONSTRAINT "session_rules_version_positive" CHECK ("session"."rules_version" >= 1),
	CONSTRAINT "session_inputs_hash_valid" CHECK ("session"."inputs_hash" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "session" TO stamina_app;--> statement-breakpoint
CREATE TABLE "session_exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"exercise_id" text NOT NULL,
	"slot" text NOT NULL,
	"sets" integer NOT NULL,
	"rep_min" integer NOT NULL,
	"rep_max" integer NOT NULL,
	"unit" text NOT NULL,
	"rir" integer,
	"load_guidance" text NOT NULL,
	CONSTRAINT "session_exercise_session_position" UNIQUE("session_id","position"),
	CONSTRAINT "session_exercise_slot_valid" CHECK ("session_exercise"."slot" in ('warm-up', 'main-strength', 'sport-support', 'accessories-core', 'cool-down')),
	CONSTRAINT "session_exercise_unit_valid" CHECK ("session_exercise"."unit" in ('reps', 'seconds')),
	CONSTRAINT "session_exercise_load_guidance_valid" CHECK ("session_exercise"."load_guidance" in ('rpe-guided', 'bodyweight', 'none')),
	CONSTRAINT "session_exercise_sets_positive" CHECK ("session_exercise"."sets" >= 1),
	CONSTRAINT "session_exercise_reps_valid" CHECK ("session_exercise"."rep_min" >= 1 and "session_exercise"."rep_max" >= "session_exercise"."rep_min"),
	CONSTRAINT "session_exercise_rir_valid" CHECK ("session_exercise"."rir" is null or "session_exercise"."rir" between 0 and 5)
);
--> statement-breakpoint
ALTER TABLE "session_exercise" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session_exercise" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "session_exercise" TO stamina_app;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block" ADD CONSTRAINT "block_program_id_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program" ADD CONSTRAINT "program_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_block_id_block_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."block"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_supersedes_id_session_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."session"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercise" ADD CONSTRAINT "session_exercise_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercise" ADD CONSTRAINT "session_exercise_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_exercise" ADD CONSTRAINT "session_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_user_date" ON "session" USING btree ("user_id","date");--> statement-breakpoint
CREATE POLICY "block_owner_select" ON "block" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "block_owner_insert" ON "block" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "program_owner_select" ON "program" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "program_owner_insert" ON "program" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "session_owner_select" ON "session" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "session_owner_insert" ON "session" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "session_exercise_owner_select" ON "session_exercise" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "session_exercise_owner_insert" ON "session_exercise" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);