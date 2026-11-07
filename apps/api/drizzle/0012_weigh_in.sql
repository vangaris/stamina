CREATE TABLE "weigh_in" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"weight_kg" numeric(5, 2) NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weigh_in_weight_valid" CHECK ("weigh_in"."weight_kg" between 30 and 300)
);
--> statement-breakpoint
ALTER TABLE "weigh_in" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `checkin`: the app reads and inserts its own rows (policies below), never
-- rewrites or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "weigh_in" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "weigh_in" TO stamina_app;--> statement-breakpoint
ALTER TABLE "weigh_in" ADD CONSTRAINT "weigh_in_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "weigh_in_user_date" ON "weigh_in" USING btree ("user_id","date");--> statement-breakpoint
CREATE POLICY "weigh_in_owner_select" ON "weigh_in" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "weigh_in_owner_insert" ON "weigh_in" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);