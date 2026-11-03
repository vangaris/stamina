CREATE TABLE "sport" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"status" text NOT NULL,
	"profile" jsonb,
	"sources" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sport_normalized_name_unique" UNIQUE("normalized_name"),
	CONSTRAINT "sport_status_valid" CHECK ("sport"."status" in ('draft', 'approved', 'rejected')),
	CONSTRAINT "sport_name_length" CHECK (char_length("sport"."name") between 1 and 60),
	CONSTRAINT "sport_normalized_name_valid" CHECK ("sport"."normalized_name" <> '' and char_length("sport"."normalized_name") <= 120),
	CONSTRAINT "sport_approved_is_complete" CHECK ("sport"."status" <> 'approved'
        or ("sport"."profile" is not null and "sport"."sources" is not null
          and "sport"."approved_by" is not null and "sport"."approved_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "sport" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sport_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sport_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sport_request_sport_user" UNIQUE("sport_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "sport_request" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sport_request" ADD CONSTRAINT "sport_request_sport_id_sport_id_fk" FOREIGN KEY ("sport_id") REFERENCES "public"."sport"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sport_request" ADD CONSTRAINT "sport_request_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "sport_visible" ON "sport" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (status = 'approved'
        or (status = 'draft' and exists (
          select 1 from sport_request r where r.sport_id = sport.id and r.user_id = app_user_id()::uuid)));--> statement-breakpoint
CREATE POLICY "sport_request_owner_select" ON "sport_request" AS PERMISSIVE FOR SELECT TO "stamina_app" USING (user_id = app_user_id()::uuid);--> statement-breakpoint
-- The app role reads the catalogue (rows through the `sport_visible` policy) and its own requests,
-- and writes none of it: RLS is enabled, not forced, so the migrating owner and the database table
-- editor can approve or reject a sport. It has no INSERT on `sport_request` either: joining a sport
-- would show that sport's draft, so a request is made only by `request_sport` below.
GRANT SELECT ON "sport" TO stamina_app;--> statement-breakpoint
GRANT SELECT ON "sport_request" TO stamina_app;--> statement-breakpoint
-- Asking for a sport, the one write path of the app. Runs as the owner (the only way a user can
-- create a `sport` row), so it takes the caller from `app_user_id()` and never from an argument:
-- it cannot create or read a request for anyone else. `p_normalized` is `normalizeSportName(p_name)`
-- (the API computes it; the unique index on it makes two spellings one sport).
--   * A launch sport (its id is a slug, not a UUID) that is not approved is never joined: the
--     function returns null and creates nothing, so a person who types "Padel" under Other does not
--     see the unreviewed draft.
--   * Asking again for a sport already asked for changes nothing. A person may have at most 5
--     requests on sports that are not approved (MAX_SPORT_REQUESTS_PER_USER in @stamina/domain);
--     the sixth raises SQLSTATE SP001.
CREATE FUNCTION request_sport(p_name text, p_normalized text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := public.app_user_id()::uuid;
  v_id text;
  v_status text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'request_sport needs a signed-in user' USING ERRCODE = '42501';
  END IF;

  -- Loops only if the row was deleted (release_sport_request) between the insert and the lock.
  LOOP
    INSERT INTO sport (id, name, normalized_name, status)
    VALUES (gen_random_uuid()::text, p_name, p_normalized, 'draft')
    ON CONFLICT (normalized_name) DO NOTHING;

    SELECT id, status INTO v_id, v_status FROM sport WHERE normalized_name = p_normalized FOR KEY SHARE;
    EXIT WHEN FOUND;
  END LOOP;

  IF v_status <> 'approved'
     AND v_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM sport_request WHERE sport_id = v_id AND user_id = v_user)
     AND (SELECT count(*) FROM sport_request r JOIN sport s ON s.id = r.sport_id
          WHERE r.user_id = v_user AND s.status <> 'approved') >= 5 THEN
    RAISE EXCEPTION 'too many sport requests' USING ERRCODE = 'SP001';
  END IF;

  INSERT INTO sport_request (sport_id, user_id)
  VALUES (v_id, v_user)
  ON CONFLICT (sport_id, user_id) DO NOTHING;

  RETURN v_id;
END;
$$;--> statement-breakpoint
-- Gives up a request after a rename: deletes the requested sport (and with it the caller's
-- request) when the caller is its only requester, it is still a draft and nothing has been drafted
-- for it. Otherwise it changes nothing.
CREATE FUNCTION release_sport_request(p_normalized text) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := public.app_user_id()::uuid;
  v_id text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'release_sport_request needs a signed-in user' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_id FROM sport
  WHERE normalized_name = p_normalized
    AND status = 'draft'
    AND profile IS NULL
    AND id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  FOR UPDATE;

  IF v_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM sport_request WHERE sport_id = v_id AND user_id = v_user)
     AND NOT EXISTS (SELECT 1 FROM sport_request WHERE sport_id = v_id AND user_id <> v_user) THEN
    DELETE FROM sport WHERE id = v_id;
  END IF;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION request_sport(text, text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION request_sport(text, text) TO stamina_app;--> statement-breakpoint
REVOKE ALL ON FUNCTION release_sport_request(text) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION release_sport_request(text) TO stamina_app;
