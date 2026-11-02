CREATE TABLE "consent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"text_version" text NOT NULL,
	"locale" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "consent_purpose_valid" CHECK ("consent"."purpose" in ('disclaimer', 'health-data')),
	CONSTRAINT "consent_locale_valid" CHECK ("consent"."locale" in ('en', 'el'))
);
--> statement-breakpoint
ALTER TABLE "consent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "consent" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only: a consent is read and inserted, never rewritten or deleted by the app. The one change
-- is `withdrawn_at`, once (the update policy allows only rows where it is null, to a non-null value).
-- Rows go only when their user does (the cascade runs as the table owner, not as `stamina_app`).
GRANT SELECT, INSERT ON "consent" TO stamina_app;--> statement-breakpoint
GRANT UPDATE ("withdrawn_at") ON "consent" TO stamina_app;--> statement-breakpoint
CREATE TABLE "screening" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instrument" text NOT NULL,
	"instrument_version" integer NOT NULL,
	"answers_encrypted" text NOT NULL,
	"status" text NOT NULL,
	"referral" text,
	"nutrition_off" boolean NOT NULL,
	"excluded_areas" text[] NOT NULL,
	"starting_level" text NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"doctor_ok_at" timestamp with time zone,
	CONSTRAINT "screening_status_valid" CHECK ("screening"."status" in ('cleared', 'referred')),
	CONSTRAINT "screening_referral_valid" CHECK ("screening"."referral" is null or "screening"."referral" in ('general', 'pregnancy')),
	CONSTRAINT "screening_starting_level_valid" CHECK ("screening"."starting_level" in ('beginner', 'regular')),
	CONSTRAINT "screening_referral_iff_referred" CHECK (("screening"."referral" is not null) = ("screening"."status" = 'referred')),
	CONSTRAINT "screening_doctor_ok_only_general" CHECK ("screening"."doctor_ok_at" is null or "screening"."referral" is not distinct from 'general')
);
--> statement-breakpoint
ALTER TABLE "screening" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "screening" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- Append-only: a retake is a new row. The one change is `doctor_ok_at`, once (the update policy allows
-- only rows where it is null, to a non-null value; a check limits it to general referrals).
GRANT SELECT, INSERT ON "screening" TO stamina_app;--> statement-breakpoint
GRANT UPDATE ("doctor_ok_at") ON "screening" TO stamina_app;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening" ADD CONSTRAINT "screening_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "consent_active_grant" ON "consent" USING btree ("user_id","purpose","text_version") WHERE "consent"."withdrawn_at" is null;--> statement-breakpoint
CREATE INDEX "screening_user_taken_at" ON "screening" USING btree ("user_id","taken_at" DESC NULLS LAST);--> statement-breakpoint
CREATE POLICY "consent_owner_select" ON "consent" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "consent_owner_insert" ON "consent" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "consent_owner_withdraw" ON "consent" AS PERMISSIVE FOR UPDATE TO "stamina_app" USING (user_id = app_user_id()::uuid and withdrawn_at is null) WITH CHECK (user_id = app_user_id()::uuid and withdrawn_at is not null);--> statement-breakpoint
CREATE POLICY "screening_owner_select" ON "screening" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "screening_owner_insert" ON "screening" AS PERMISSIVE FOR INSERT TO "stamina_app" WITH CHECK (user_id = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "screening_owner_doctor_ok" ON "screening" AS PERMISSIVE FOR UPDATE TO "stamina_app" USING (user_id = app_user_id()::uuid and doctor_ok_at is null) WITH CHECK (user_id = app_user_id()::uuid and doctor_ok_at is not null);