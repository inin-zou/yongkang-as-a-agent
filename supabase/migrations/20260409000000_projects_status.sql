CREATE TABLE IF NOT EXISTS projects_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  description text NOT NULL DEFAULT '',
  next_step text,
  links text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_projects_status" ON projects_status FOR SELECT USING (true);
CREATE POLICY "authenticated_insert_projects_status" ON projects_status FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "authenticated_update_projects_status" ON projects_status FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_delete_projects_status" ON projects_status FOR DELETE USING (auth.role() = 'authenticated');

-- Seed with initial projects
INSERT INTO projects_status (name, status, description, next_step, links, sort_order) VALUES
  ('Yongkang Portfolio v2', 'ACTIVE', 'Building the page you''re looking at right now', 'Inline admin editing + CMS', 'https://github.com/inin-zou/yongkang-as-a-agent', 0),
  ('AI Music Production', 'PLANNING', 'Exploring vocal synthesis + beat generation pipelines', 'Prototype with ElevenLabs + Suno', NULL, 1),
  ('Deep Search v2', 'ON HOLD', 'Won 1st at EF hackathon, exploring productization', 'Market research + MVP scope', 'https://github.com/Rodrigotari1/deep_research_ef', 2);
