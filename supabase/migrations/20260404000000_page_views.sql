CREATE TABLE IF NOT EXISTS page_views (
  id INTEGER PRIMARY KEY DEFAULT 1,
  count BIGINT NOT NULL DEFAULT 0,
  CHECK (id = 1)
);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read views" ON page_views FOR SELECT USING (true);
CREATE POLICY "Public increment views" ON page_views FOR UPDATE USING (true);

INSERT INTO page_views (count) VALUES (0) ON CONFLICT DO NOTHING;
