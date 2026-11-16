-- NBA Arcade · TEST LEAGUE for the new site (Dave + Dan + bots)
-- Run once in Supabase → SQL Editor → New query → paste → Run.
--
-- Makes a copy of the real league under a new name, "nba-arcade-next".
-- Same rosters, scores, schedule and history as of right now. From here on the two leagues
-- are separate: nothing done in the copy changes the real league, and the real league
-- doesn't change the copy. Running it twice does nothing the second time.

insert into public.leagues (id, state)
select 'nba-arcade-next', state
from public.leagues
where id = 'nba-arcade-2027'
on conflict (id) do nothing;

-- Check: should list both leagues
select id, length(state::text) as size, updated_at from public.leagues order by id;
