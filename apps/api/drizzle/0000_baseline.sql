-- Identity hook for row-level security. The API sets `app.user_id` with
-- `select set_config('app.user_id', <id>, true)` at the start of each request transaction;
-- every RLS policy compares its owner column with `app_user_id()`.
-- Unset (health checks, migrations) it is NULL, so no policy matches and no row is visible.
CREATE FUNCTION app_user_id() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;
