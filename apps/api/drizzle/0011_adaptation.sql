CREATE TABLE "adaptation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_id" text NOT NULL,
	"trigger_key" text NOT NULL,
	"ask" integer DEFAULT 1 NOT NULL,
	"change" jsonb NOT NULL,
	"params" jsonb NOT NULL,
	"basis" jsonb NOT NULL,
	"valid_until" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adaptation_user_rule_trigger_ask" UNIQUE("user_id","rule_id","trigger_key","ask"),
	CONSTRAINT "adaptation_rule_valid" CHECK ("adaptation"."rule_id" in ('unplanned-activity', 'poor-checkin', 'sore-area', 'deload-load', 'deload-checkins', 'deload-effort', 'repeat-week', 'restart-block')),
	CONSTRAINT "adaptation_ask_positive" CHECK ("adaptation"."ask" >= 1)
);
--> statement-breakpoint
ALTER TABLE "adaptation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `activity`: the app reads and inserts its own rows (policies below), never
-- rewrites or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "adaptation" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "adaptation" TO stamina_app;--> statement-breakpoint
CREATE TABLE "adaptation_decision" (
	"adaptation_id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "adaptation_decision_valid" CHECK ("adaptation_decision"."decision" in ('accepted', 'declined'))
);
--> statement-breakpoint
ALTER TABLE "adaptation_decision" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `activity`: the app reads and inserts its own rows (policies below), never
-- rewrites or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "adaptation_decision" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "adaptation_decision" TO stamina_app;--> statement-breakpoint
ALTER TABLE "adaptation" ADD CONSTRAINT "adaptation_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptation_decision" ADD CONSTRAINT "adaptation_decision_adaptation_id_adaptation_id_fk" FOREIGN KEY ("adaptation_id") REFERENCES "public"."adaptation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adaptation_decision" ADD CONSTRAINT "adaptation_decision_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adaptation_user_created" ON "adaptation" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "session_supersedes" ON "session" USING btree ("supersedes_id");--> statement-breakpoint
CREATE POLICY "adaptation_owner_select" ON "adaptation" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "adaptation_owner_insert" ON "adaptation" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "adaptation_decision_owner_select" ON "adaptation_decision" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "adaptation_decision_owner_insert" ON "adaptation_decision" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);