CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"sport_kind" text NOT NULL,
	"launch_sport" text,
	"other_sport_name" text,
	"date" date NOT NULL,
	"minutes" integer NOT NULL,
	"intensity" text NOT NULL,
	"rpe" integer NOT NULL,
	"load" integer NOT NULL,
	"planned" boolean NOT NULL,
	"hot" boolean NOT NULL,
	"source" text NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_sport_matches_kind" CHECK (("activity"."sport_kind" = 'launch' and "activity"."launch_sport" is not null and "activity"."other_sport_name" is null)
        or ("activity"."sport_kind" = 'other' and "activity"."launch_sport" is null and "activity"."other_sport_name" is not null)),
	CONSTRAINT "activity_minutes_valid" CHECK ("activity"."minutes" between 15 and 300),
	CONSTRAINT "activity_intensity_valid" CHECK ("activity"."intensity" in ('easy', 'moderate', 'hard')),
	CONSTRAINT "activity_rpe_valid" CHECK ("activity"."rpe" between 1 and 10),
	CONSTRAINT "activity_load_valid" CHECK ("activity"."load" = "activity"."rpe" * "activity"."minutes"),
	CONSTRAINT "activity_source_valid" CHECK ("activity"."source" in ('manual'))
);
--> statement-breakpoint
ALTER TABLE "activity" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `session_log`: the app reads and inserts its own rows (policies below), never
-- rewrites or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "activity" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "activity" TO stamina_app;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_user_date" ON "activity" USING btree ("user_id","date");--> statement-breakpoint
CREATE POLICY "activity_owner_select" ON "activity" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "activity_owner_insert" ON "activity" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);