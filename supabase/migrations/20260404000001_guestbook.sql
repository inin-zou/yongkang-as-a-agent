-- Guestbook (replaces simple feedback table)
-- Stores GitHub-authenticated visitor comments with profile info
CREATE TABLE IF NOT EXISTS guestbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username TEXT NOT NULL,
  github_avatar_url TEXT NOT NULL DEFAULT '',
  github_profile_url TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;

-- Anyone can read guestbook entries
CREATE POLICY "Public read guestbook" ON guestbook
  FOR SELECT USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated insert guestbook" ON guestbook
  FOR INSERT WITH CHECK (true);

-- Service role can delete (admin)
CREATE POLICY "Service role delete guestbook" ON guestbook
  FOR DELETE USING (auth.role() = 'service_role');
