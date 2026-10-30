-- Row-level security only constrains roles that neither own the table nor carry BYPASSRLS, and
-- local superusers and Neon's owner roles do both. So user-owned queries never run as the
-- connection user: the API does `SET LOCAL ROLE stamina_app` first (`withUser` in
-- src/db/with-user.ts), and the policies below then apply. `stamina_app` is NOLOGIN (nobody can
-- connect as it), has no BYPASSRLS, and owns nothing.
-- Each user-owned table must grant its privileges to `stamina_app` explicitly in its own migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'stamina_app') THEN
    CREATE ROLE stamina_app NOLOGIN NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint
-- Membership lets the migrating user (the one the API connects as) `SET LOCAL ROLE stamina_app`.
GRANT stamina_app TO CURRENT_USER;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO stamina_app;
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_user" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "app_user" TO stamina_app;--> statement-breakpoint
CREATE POLICY "app_user_owner" ON "app_user" AS PERMISSIVE FOR ALL TO "stamina_app" USING (id = app_user_id()::uuid) WITH CHECK (id = app_user_id()::uuid);
