-- Blog posts for MEMORY.md
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can read published posts
CREATE POLICY "Public read access" ON blog_posts
  FOR SELECT USING (true);

-- Visitor feedback for MEMORY.md "Leave a Note"
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Anyone can insert feedback
CREATE POLICY "Anyone can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

-- Only service role can read feedback
CREATE POLICY "Service role can read feedback" ON feedback
  FOR SELECT USING (auth.role() = 'service_role');

-- Contact form submissions (persist instead of just logging)
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit contact form
CREATE POLICY "Anyone can insert contact" ON contact_submissions
  FOR INSERT WITH CHECK (true);

-- Only service role can read contacts
CREATE POLICY "Service role can read contacts" ON contact_submissions
  FOR SELECT USING (auth.role() = 'service_role');

-- Seed initial blog posts
INSERT INTO blog_posts (slug, title, content, preview, published_at) VALUES
(
  'stockholm-hackathon',
  'Stockholm Hackathon',
  E'First time in Scandinavia. TechEurope Stockholm was a 36-hour sprint in a converted warehouse by the waterfront — cold outside, electric inside.\n\nI went solo on this one. Built Dianoia, a spatial intelligence tool that maps how people navigate complex 3D environments. The idea came from watching tourists struggle with Stockholm''s metro system — what if AI could understand spatial reasoning the way humans do, but faster?\n\nWon 3rd place, solo. No teammates to lean on, no one to split the load with. Every architecture decision, every line of code, every demo slide — just me and 20 hours of caffeine. The Swedish tech scene has a quiet intensity to it. Less hype than Paris, more depth. I''d go back.',
  'Reflections on the trip to Sweden...',
  '2026-03-15'
),
(
  'joining-epiminds',
  'Joining Epiminds',
  E'Started at Epiminds in February. The role: AI Engineer working on marketing AI — applying multi-agent orchestration to content automation. Different domain from drug discovery at Misogi or music at Mozart, but the core pattern is the same: understand the problem space, build agents that coordinate, ship fast.\n\nTeam restructured after a month. Not every chapter ends the way you plan. But the skills stay — every experience, even the short ones, adds something to the assembly. Marketing AI taught me about content pipelines, audience modeling, and the gap between what LLMs can generate and what actually converts.',
  'New chapter in the assembling...',
  '2026-02-10'
);
