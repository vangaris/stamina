# Sport Profile review

Every sport the engine plans around has a Sport Profile (ticket 08; the fields and the review
checklist are decided in `.scratch/mvp-plan/issues/15-training-generation-model.md`, Q1). A profile
is drafted (by research for the 11 launch sports, by the AI for a requested sport) and is **never
shown to people until Vang approves it**. This page is how that review works.

## How sports get here

- **Launch sports.** `apps/api/src/sports/data/<sport>.json`, one file per `LaunchSport`, validated by
  `launchSportDataSchema`. `migrate()` (so `db:dev`, `db:migrate`, previews and production) seeds
  each as a **draft** row of the `sport` table, **insert-if-missing**: a row that already exists is
  never overwritten, so an edit or approval made in the database survives every later deploy. To
  change an existing profile, edit the row in the table editor (or delete the row and let the next
  migrate re-seed it from the file).
- **The data files stop applying after the first seed.** Once a launch sport has a row, editing its
  file changes nothing in the database: not before approval, not after. `migrate()` logs
  `sport <id>: stored profile differs from its data file` (ids only) for each launch sport whose
  stored profile or sources differ from its file, so a stale file or an unapplied correction shows up
  in the deploy log. To update an **approved** profile, edit the row in the table editor (profile
  and/or sources), bump `version`, and keep it approved; update the file too, so the next
  re-seed starts from the corrected data. To re-seed instead, delete the row and let the next
  migrate recreate it as a draft, which you then review and approve again. If a person had asked for
  that sport's name under "Other", the migrate moves their request to the launch sport.
- **Requested sports.** A person who picks "Other…" and types a name creates (or joins) one draft
  sport per normalized name ("Beach  Tennis" and "beach tennis" are one) and a `sport_request`
  row. Only the people who requested it see it, labelled beta; everyone else sees only approved
  sports. A requested sport has no profile (`profile` is null) until one is drafted:
  `DATABASE_URL=<url> pnpm --filter @stamina/api sports:draft <sport-id> [--overwrite]` asks the AI provider for a
  profile and sources, from the sport's name only, and stores them on the **draft** row (it never
  approves, refuses a sport that is not a draft, and refuses one that already has a profile unless
  you pass `--overwrite`). No AI provider exists in Phase A (ticket 10
  adds it), so until then the script exits with a message and profiles are written by hand in the
  table editor.
- **Limits.** A person can have at most 5 requests on sports that are not approved
  (`MAX_SPORT_REQUESTS_PER_USER`); the sixth is turned away with a message. Renaming their sport
  gives the earlier request up when nobody else asked for it and no profile was drafted for it. A
  launch sport typed under "Other" while it is still a draft is not shown to the person (it creates
  no request), so draft launch profiles stay unseen until you approve them.

## Checklist (Vang)

For each profile, before approving:

1. **Every field is filled** and none is a placeholder: energy mix (adds up to 100), key movements,
   high-load areas, typical Activity (minutes and intensity), recovery window (lower and upper),
   season, METs at easy, moderate and hard.
2. **Sources open and support what they are cited for.** Open every URL (at least two, all
   `https`). The METs must match the cited Compendium of Physical Activities code, and every source
   must be framed around performance or physical activity: a source whose title or main framing is
   injury, rehabilitation or medicine is not acceptable, even if some of its numbers are useful.
   Use each source's real title. The energy mix and the recovery window are **labelled estimates
   (heuristics)**, not measured facts: accept them when the note on the profile says so and they
   are plausible for the sport, rather than expecting a source to state the exact numbers.
3. **No injury-prevention or medical claims** anywhere: not in a source title, not implied by a
   high-load area ("loaded most while playing" is fine; "protects the knee" is not). Wellness
   wording only.
4. **METs match the cited Compendium of Physical Activities entry** for that sport and effort, and
   rise from easy to moderate to hard.
5. **Recovery window and season are sensible** for the sport (hours before a heavy lower- or
   upper-body Session after a hard Activity; the usual months, or year-round).

6. **Check and clean the `name`** a person typed before approving a requested sport: it becomes
   public catalogue text for everyone. Fix spelling and capitals, remove anything that is not a
   sport name (the first requester's spelling is what is shown), and edit `name` in the table
   editor before you approve. Another requester also sees the first requester's spelling.

## List the drafts

In the Neon table editor SQL console (or any client on the database):

```sql
select id, name, status, profile is not null as drafted, version
from sport
where status = 'draft'
order by name;

-- who asked for what
select s.name, count(r.id) as requests
from sport s join sport_request r on r.sport_id = s.id
where s.status = 'draft'
group by s.name
order by requests desc;
```

## Approve or reject

Approve only a sport whose profile passed the checklist. The database refuses an approval without a
profile, sources, `approved_by` and `approved_at`. Bump `version` so a later change is traceable.

```sql
update sport
set status = 'approved', approved_by = '<name>', approved_at = now(), version = version + 1
where id = 'padel';
```

Reject a requested sport nobody should see (it disappears for the people who asked too):

```sql
update sport set status = 'rejected' where id = '<sport-id>';
```

An approved profile that needs a correction is edited in the same table and its `version` bumped;
it stays approved. `GET /sports` leaves out (and logs the id of) any row whose stored profile no
longer passes `sportProfileSchema`, so a bad hand edit hides the sport instead of breaking plans.
