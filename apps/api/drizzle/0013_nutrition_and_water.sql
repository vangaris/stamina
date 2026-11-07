CREATE TABLE "water_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"ml" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "water_log_ml_valid" CHECK ("water_log"."ml" in (250, 500))
);
--> statement-breakpoint
ALTER TABLE "water_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only like `checkin`: the app reads and inserts its own rows (policies below), never
-- rewrites or deletes them. Rows go only when their user does (the cascade runs as the table owner).
ALTER TABLE "water_log" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT ON "water_log" TO stamina_app;--> statement-breakpoint
-- The profile columns below are covered by the table-level grant of migration 0002.
ALTER TABLE "profile" ADD COLUMN "sex" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "height_cm" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "nutrition_weight_kg" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "everyday_activity" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "eating_pattern" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "allergens" text[];--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "dislikes" text[];--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "meals_per_day" integer;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "cooking_effort" text;--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "body_direction" text;--> statement-breakpoint
ALTER TABLE "water_log" ADD CONSTRAINT "water_log_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "water_log_user_date" ON "water_log" USING btree ("user_id","date");--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_nutrition_all_or_none" CHECK (("profile"."sex" is null) = ("profile"."height_cm" is null)
        and ("profile"."sex" is null) = ("profile"."nutrition_weight_kg" is null)
        and ("profile"."sex" is null) = ("profile"."everyday_activity" is null)
        and ("profile"."sex" is null) = ("profile"."eating_pattern" is null)
        and ("profile"."sex" is null) = ("profile"."allergens" is null)
        and ("profile"."sex" is null) = ("profile"."dislikes" is null)
        and ("profile"."sex" is null) = ("profile"."meals_per_day" is null)
        and ("profile"."sex" is null) = ("profile"."cooking_effort" is null));--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_sex_valid" CHECK ("profile"."sex" in ('female', 'male', 'prefer-not-to-say'));--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_height_valid" CHECK ("profile"."height_cm" between 120 and 230);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_nutrition_weight_valid" CHECK ("profile"."nutrition_weight_kg" between 30 and 300);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_everyday_activity_valid" CHECK ("profile"."everyday_activity" in ('mostly-sitting', 'on-my-feet', 'physical-job'));--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_eating_pattern_valid" CHECK ("profile"."eating_pattern" in ('everything', 'pescatarian', 'vegetarian', 'vegan'));--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_allergens_valid" CHECK ("profile"."allergens" <@ ARRAY['celery', 'gluten', 'crustaceans', 'eggs', 'fish', 'lupin', 'milk', 'molluscs', 'mustard', 'tree-nuts', 'peanuts', 'sesame', 'soybeans', 'sulphites']::text[]);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_dislikes_valid" CHECK (cardinality("profile"."dislikes") <= 10);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_meals_per_day_valid" CHECK ("profile"."meals_per_day" between 3 and 5);--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_cooking_effort_valid" CHECK ("profile"."cooking_effort" in ('quick', 'normal'));--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_body_direction_valid" CHECK ("profile"."body_direction" in ('lose-fat', 'gain-muscle'));--> statement-breakpoint
CREATE POLICY "water_log_owner_select" ON "water_log" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "water_log_owner_insert" ON "water_log" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);