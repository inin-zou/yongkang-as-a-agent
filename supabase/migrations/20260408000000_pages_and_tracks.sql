-- Pages table: stores JSONB content for editable pages (soul, contact, music)
CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Music tracks table: stores individual music track entries
CREATE TABLE IF NOT EXISTS music_tracks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    genre TEXT NOT NULL DEFAULT '',
    original TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    file_url TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for pages
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages_public_read" ON pages
    FOR SELECT USING (true);

CREATE POLICY "pages_authenticated_write" ON pages
    FOR UPDATE USING (auth.role() = 'authenticated');

-- RLS policies for music_tracks
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "music_tracks_public_read" ON music_tracks
    FOR SELECT USING (true);

CREATE POLICY "music_tracks_authenticated_insert" ON music_tracks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "music_tracks_authenticated_update" ON music_tracks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "music_tracks_authenticated_delete" ON music_tracks
    FOR DELETE USING (auth.role() = 'authenticated');

-- Seed pages
INSERT INTO pages (id, content) VALUES
('soul', '{
  "subtitle": "AI Engineer \u00b7 Paris, France",
  "bio": ["Part engineer, part artist. Building across RAG, multi-agent systems, 3D spatial intelligence, and music AI.", "Not assembling API wrappers. Exploring where cutting-edge tech takes us next."],
  "domains": "AI Engineering\n\u251c\u2500\u2500 Spatial Intelligence & 3D\n\u251c\u2500\u2500 Music & Audio AI\n\u251c\u2500\u2500 LLM Infrastructure\n\u251c\u2500\u2500 Healthcare & Biotech\n\u251c\u2500\u2500 Quantum Computing\n\u251c\u2500\u2500 Emotion & Vision AI\n\u251c\u2500\u2500 Geospatial ML\n\u2514\u2500\u2500 Creative AI & Content",
  "stats": {"hackathons": 24, "wins": 9, "domains": "8+", "languages": 3},
  "speed": "Full demo in < 20 hours avg",
  "languages": "Chinese (native) \u00b7 French (DALF C2) \u00b7 English (IELTS 7.0)"
}'::jsonb),
('contact', '{
  "meta": "Signal channels \u2014 always open",
  "email": "yongkang.zou.ai@gmail.com",
  "github": "https://github.com/inin-zou",
  "linkedin": "https://linkedin.com/in/yongkang-zou"
}'::jsonb),
('music', '{
  "artistName": "inhibitor",
  "genre": "Alternative RnB / Lo-Fi",
  "status": "Recording in progress",
  "location": "Paris, France",
  "bio": "inhibitor is an indie RnB singer-songwriter crafting emotional soundscapes that bridge the gap between digital production and raw human feeling.",
  "platforms": {
    "spotify": "https://open.spotify.com/search/inhibitor",
    "douyin": "https://www.douyin.com/user/MS4wLjABAAAA2h40NMhjS5rGc09h9kFMxb0_2DP7H5vpCZza_OP_ymbrLM6j2_2HQa-_Lbju4VER",
    "netease": "https://music.163.com/#/artist?id=31338333"
  }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Seed music tracks
INSERT INTO music_tracks (slug, name, genre, original, notes, file_url, sort_order) VALUES
('pimmies-dilemma', 'PIMMIE''S DILEMMA', 'Alternative RnB', 'Pimmie, PARTYNEXTDOOR & Drake', '', 'https://ktdvafynhgszkmrgmeyk.supabase.co/storage/v1/object/public/music/PIMMIE''S%20DILEMMA.mp3', 1),
('soft-spot', 'Soft Spot', 'Lo-Fi RnB', 'keshi', '', 'https://ktdvafynhgszkmrgmeyk.supabase.co/storage/v1/object/public/music/Soft%20Spot.mp3', 2),
('dream', 'Dream', 'Lo-Fi RnB', 'keshi', '', 'https://ktdvafynhgszkmrgmeyk.supabase.co/storage/v1/object/public/music/Dream.mp3', 3)
ON CONFLICT (slug) DO NOTHING;
