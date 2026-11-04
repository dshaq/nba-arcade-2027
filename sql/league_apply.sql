-- NBA Arcade · instant, conflict-free saves
-- Run once in Supabase → SQL Editor → New query → paste → Run.
--
-- Instead of every tap re-uploading the whole league (~600 KB) and retrying when someone else
-- saved first, the app sends just what changed ("Dave picked MIN in West B") and the database
-- applies it in one atomic step. Two people saving at the same moment both land.
--
-- Ops (applied in order):
--   {"op":"set",   "path":["duels","2026-11-02","picks","1"], "value":2}
--   {"op":"merge", "path":["playerStats"], "value":{"k1":{...},"k2":{...}}}   -- add/replace keys
--   {"op":"del",   "path":["lineupPlans","1","20261103"]}
--   {"op":"push",  "path":["chat"], "value":{...}}   -- append unless an identical item is there
-- Every op is safe to send twice.

create or replace function public.league_apply(p_id text, p_ops jsonb)
returns timestamptz
language plpgsql
security invoker
set lock_timeout = '5s'          -- never wait forever behind another save
set statement_timeout = '12s'
as $$
declare
  raw   text;
  s     jsonb;
  op    jsonb;
  path  text[];
  i     int;
  cur   jsonb;
  ctype text;
  ts    timestamptz;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'sign in required';
  end if;

  -- Lock the row so concurrent calls apply one after another, never on top of each other
  select state::text into raw from public.leagues where id = p_id for update;
  if raw is null then raise exception 'league % not found', p_id; end if;
  s := raw::jsonb;
  if jsonb_typeof(s) = 'string' then s := (s #>> '{}')::jsonb; end if;   -- stored as a JSON string

  for op in select * from jsonb_array_elements(p_ops) loop
    select coalesce(array_agg(x), '{}') into path from jsonb_array_elements_text(op->'path') x;
    if array_length(path, 1) is null then continue; end if;

    if op->>'op' = 'del' then
      s := s #- path;
      continue;
    end if;

    -- Make sure every parent along the path is an object
    for i in 1 .. array_length(path, 1) - 1 loop
      cur := s #> path[1:i];
      if cur is null or jsonb_typeof(cur) <> 'object' then
        s := jsonb_set(s, path[1:i], '{}'::jsonb, true);
      end if;
    end loop;

    if op->>'op' = 'set' then
      s := jsonb_set(s, path, op->'value', true);
    elsif op->>'op' = 'merge' then
      cur := s #> path;
      if cur is null or jsonb_typeof(cur) <> 'object' then cur := '{}'::jsonb; end if;
      s := jsonb_set(s, path, cur || (op->'value'), true);
    elsif op->>'op' = 'push' then
      cur := s #> path;
      if cur is null or jsonb_typeof(cur) <> 'array' then cur := '[]'::jsonb; end if;
      if not (cur @> jsonb_build_array(op->'value')) then
        s := jsonb_set(s, path, cur || jsonb_build_array(op->'value'), true);
      end if;
    end if;
  end loop;

  -- Write back in the same format the app already uses (a JSON string)
  select pg_typeof(state)::text into ctype from public.leagues where id = p_id;
  if ctype = 'text' then
    update public.leagues set state = s::text, updated_at = now() where id = p_id returning updated_at into ts;
  else
    update public.leagues set state = to_jsonb(s::text), updated_at = now() where id = p_id returning updated_at into ts;
  end if;
  return ts;
end;
$$;

revoke all on function public.league_apply(text, jsonb) from public, anon;
grant execute on function public.league_apply(text, jsonb) to authenticated;
