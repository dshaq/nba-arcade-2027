-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/ipsngddnavymcmfbbcxu/sql)
-- Creates a config table and stores the BallDontLie API key

CREATE TABLE IF NOT EXISTS config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Allow anyone (logged-in users) to read config
CREATE POLICY "Public read" ON config
  FOR SELECT USING (true);

-- Only service role can write
-- (inserts below use service role implicitly via the SQL editor)

INSERT INTO config (key, value)
VALUES ('bdl_api_key', '1c50a8f0-9ab5-40c0-947c-18bc7565002e')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
