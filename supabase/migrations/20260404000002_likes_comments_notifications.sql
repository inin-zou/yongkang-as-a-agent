-- Post likes (one per user per post)
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, github_username)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read likes" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated insert likes" ON post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated delete own likes" ON post_likes FOR DELETE USING (true);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  github_username TEXT NOT NULL,
  github_avatar_url TEXT NOT NULL DEFAULT '',
  github_profile_url TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read comments" ON post_comments FOR SELECT USING (true);
CREATE POLICY "Authenticated insert comments" ON post_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role delete comments" ON post_comments FOR DELETE USING (auth.role() = 'service_role');

-- Admin notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'comment', 'like', 'guestbook'
  message TEXT NOT NULL,
  post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role all notifications" ON admin_notifications USING (auth.role() = 'service_role');

-- Function to auto-create notification on new comment
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (type, message, post_id)
  VALUES (
    'comment',
    NEW.github_username || ' commented on your post',
    NEW.post_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- Function to auto-create notification on new like
CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (type, message, post_id)
  VALUES (
    'like',
    NEW.github_username || ' liked your post',
    NEW.post_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_like
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Function to auto-create notification on new guestbook entry
CREATE OR REPLACE FUNCTION notify_on_guestbook() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (type, message)
  VALUES (
    'guestbook',
    NEW.github_username || ' signed your guestbook'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_guestbook
  AFTER INSERT ON guestbook
  FOR EACH ROW EXECUTE FUNCTION notify_on_guestbook();
