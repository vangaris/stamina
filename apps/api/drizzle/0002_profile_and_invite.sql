CREATE TABLE "invite" (
	"code" text PRIMARY KEY NOT NULL,
	"issuer" uuid,
	"redeemed_by" uuid,
	"redeemed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invite" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invite" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
-- A code is open while `redeemed_at` is null (`redeemed_by` is nulled when its user is deleted, which
-- must not reopen it). Redemption is `update invite set redeemed_by, redeemed_at where code = $1 and
-- redeemed_at is null`: the app role reads three columns to find the row and writes only the
-- redemption columns. Issuing codes and the public check run on the connection role, not as a user.
GRANT SELECT ("code", "redeemed_by", "redeemed_at") ON "invite" TO stamina_app;--> statement-breakpoint
GRANT UPDATE ("redeemed_by", "redeemed_at") ON "invite" TO stamina_app;--> statement-breakpoint
CREATE TABLE "profile" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"needs" text NOT NULL,
	"birth_year" integer NOT NULL,
	"country" text NOT NULL,
	"sport_kind" text NOT NULL,
	"launch_sport" text,
	"other_sport_name" text,
	"play_days" text[] NOT NULL,
	"play_varies" boolean NOT NULL,
	"play_minutes" integer NOT NULL,
	"play_intensity" text NOT NULL,
	"goal" text NOT NULL,
	"sessions_per_week" integer,
	"session_minutes" integer,
	"available_days" text[],
	"locale" text NOT NULL,
	"units" text NOT NULL,
	"hot_conditions_default" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_sport_matches_kind" CHECK (("profile"."sport_kind" = 'launch' and "profile"."launch_sport" is not null and "profile"."other_sport_name" is null)
        or ("profile"."sport_kind" = 'other' and "profile"."launch_sport" is null and "profile"."other_sport_name" is not null)),
	CONSTRAINT "profile_training_week_all_or_none" CHECK (("profile"."sessions_per_week" is null) = ("profile"."session_minutes" is null)
        and ("profile"."sessions_per_week" is null) = ("profile"."available_days" is null))
);
--> statement-breakpoint
ALTER TABLE "profile" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profile" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "profile" TO stamina_app;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_issuer_app_user_id_fk" FOREIGN KEY ("issuer") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite" ADD CONSTRAINT "invite_redeemed_by_app_user_id_fk" FOREIGN KEY ("redeemed_by") REFERENCES "public"."app_user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "invite_app_select" ON "invite" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (redeemed_at is null or redeemed_by = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "invite_app_redeem" ON "invite" AS PERMISSIVE FOR UPDATE TO "stamina_app" USING (redeemed_at is null) WITH CHECK (redeemed_by = app_user_id()::uuid);--> statement-breakpoint
CREATE POLICY "profile_owner" ON "profile" AS PERMISSIVE FOR ALL TO "stamina_app" USING (user_id = app_user_id()::uuid) WITH CHECK (user_id = app_user_id()::uuid);