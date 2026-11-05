CREATE TABLE "exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"licence" text NOT NULL,
	"name_en" text NOT NULL,
	"name_el" text,
	"instructions_en" text[] NOT NULL,
	"instructions_el" text[],
	"equipment" text[] NOT NULL,
	"locations" text[] NOT NULL,
	"movement_pattern" text NOT NULL,
	"high_load_areas" text[] NOT NULL,
	"slots" text[] NOT NULL,
	"rir_suitable" boolean NOT NULL,
	"easier_id" text,
	"harder_id" text,
	"image" jsonb,
	CONSTRAINT "exercise_source_valid" CHECK ("exercise"."source" in ('free-exercise-db')),
	CONSTRAINT "exercise_licence_valid" CHECK ("exercise"."licence" in ('Unlicense')),
	CONSTRAINT "exercise_movement_pattern_valid" CHECK ("exercise"."movement_pattern" in ('squat', 'hinge', 'lunge', 'push', 'pull', 'overhead', 'carry', 'rotation', 'jump-land', 'change-of-direction', 'core', 'mobility')),
	CONSTRAINT "exercise_equipment_valid" CHECK ("exercise"."equipment" <@ ARRAY['dumbbell', 'barbell', 'kettlebell', 'resistance-band', 'machine', 'pull-up-bar', 'bench', 'box', 'medicine-ball', 'foam-roller']::text[]),
	CONSTRAINT "exercise_locations_valid" CHECK ("exercise"."locations" <@ ARRAY['gym', 'home', 'court', 'beach']::text[]),
	CONSTRAINT "exercise_high_load_areas_valid" CHECK ("exercise"."high_load_areas" <@ ARRAY['neck', 'shoulder', 'elbow', 'wrist', 'upper-back', 'lower-back', 'hip', 'knee', 'ankle']::text[]),
	CONSTRAINT "exercise_slots_valid" CHECK ("exercise"."slots" <@ ARRAY['warm-up', 'main-strength', 'sport-support', 'accessories-core', 'cool-down']::text[]),
	CONSTRAINT "exercise_slots_count" CHECK (cardinality("exercise"."slots") between 1 and 2),
	CONSTRAINT "exercise_locations_not_empty" CHECK (cardinality("exercise"."locations") > 0),
	CONSTRAINT "exercise_instructions_not_empty" CHECK (cardinality("exercise"."instructions_en") > 0),
	CONSTRAINT "exercise_easier_not_self" CHECK ("exercise"."easier_id" is distinct from "exercise"."id"),
	CONSTRAINT "exercise_harder_not_self" CHECK ("exercise"."harder_id" is distinct from "exercise"."id"),
	CONSTRAINT "exercise_image_on_wger" CHECK ("exercise"."image" is null or coalesce(starts_with("exercise"."image"->>'url', 'https://wger.de/media/'), false))
);
--> statement-breakpoint
ALTER TABLE "exercise" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
-- Reference data: the app role reads the library and nothing else. RLS is enabled, not forced, so the
-- migrating owner (which runs the library sync) can write; the policy lets `stamina_app` select every row.
GRANT SELECT ON "exercise" TO stamina_app;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_easier_id_exercise_id_fk" FOREIGN KEY ("easier_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_harder_id_exercise_id_fk" FOREIGN KEY ("harder_id") REFERENCES "public"."exercise"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "exercise_read" ON "exercise" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (true);