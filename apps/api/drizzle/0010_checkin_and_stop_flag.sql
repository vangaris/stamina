CREATE TABLE "checkin" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"sleep" integer NOT NULL,
	"soreness" integer NOT NULL,
	"energy" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkin_sleep_valid" CHECK ("checkin"."sleep" between 1 and 5),
	CONSTRAINT "checkin_soreness_valid" CHECK ("checkin"."soreness" between 1 and 5),
	CONSTRAINT "checkin_energy_valid" CHECK ("checkin"."energy" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "checkin" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `activity`: the app reads and inserts its own rows (policies below), never
-- rewrites or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "checkin" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "checkin" TO stamina_app;--> statement-breakpoint
CREATE TABLE "stop_flag" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"flag" text NOT NULL,
	"date" date NOT NULL,
	"body_area" text,
	"session_id" uuid,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "stop_flag_flag_valid" CHECK ("stop_flag"."flag" in ('chest-pain', 'fainting', 'breathlessness', 'heartbeat', 'fever', 'new-pain', 'head-knock')),
	CONSTRAINT "stop_flag_body_area_valid" CHECK ("stop_flag"."body_area" is null or "stop_flag"."body_area" in ('neck', 'shoulder', 'elbow', 'wrist', 'upper-back', 'lower-back', 'hip', 'knee', 'ankle')),
	CONSTRAINT "stop_flag_area_iff_new_pain" CHECK (("stop_flag"."body_area" is not null) = ("stop_flag"."flag" = 'new-pain'))
);
--> statement-breakpoint
ALTER TABLE "stop_flag" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `consent`: a stop flag is read and inserted, never rewritten or deleted by the
-- app. The one change is `confirmed_at`, once (the update policy allows only rows where it is null,
-- to a non-null value). Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "stop_flag" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "stop_flag" TO stamina_app;--> statement-breakpoint
GRANT UPDATE ("confirmed_at") ON "stop_flag" TO stamina_app;--> statement-breakpoint
ALTER TABLE "checkin" ADD CONSTRAINT "checkin_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stop_flag" ADD CONSTRAINT "stop_flag_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stop_flag" ADD CONSTRAINT "stop_flag_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkin_user_date" ON "checkin" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "stop_flag_user_date" ON "stop_flag" USING btree ("user_id","date");--> statement-breakpoint
CREATE POLICY "checkin_owner_select" ON "checkin" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "checkin_owner_insert" ON "checkin" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "stop_flag_owner_select" ON "stop_flag" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "stop_flag_owner_insert" ON "stop_flag" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "stop_flag_owner_confirm" ON "stop_flag" AS PERMISSIVE FOR UPDATE TO "stamina_app" USING (user_id = app_user_id()::uuid and confirmed_at is null) WITH CHECK (user_id = app_user_id()::uuid and confirmed_at is not null);