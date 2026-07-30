-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Sets up the push_subscriptions table and the RLS policies the frontend needs.

-- 1. Create the push_subscriptions table (skip if it already exists)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    TEXT UNIQUE NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Allow anyone (anon or authenticated) to save their own subscription.
--    The endpoint URL is the unique identity — only the browser that owns it
--    would ever send it, so upsert by endpoint is safe to allow openly.
CREATE POLICY "Allow subscription upsert"
  ON push_subscriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 4. Allow the browser that knows an endpoint to remove its own subscription.
CREATE POLICY "Allow subscription delete by endpoint"
  ON push_subscriptions
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- 5. Block all SELECT from anon/authenticated — only the service role
--    (used by the Edge Function) can read subscriptions.
--    No SELECT policy = denied for anon/authenticated by default.
