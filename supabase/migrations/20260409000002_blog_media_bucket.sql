-- Create blog-media storage bucket for blog post images/videos
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-media', 'blog-media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "public_read_blog_media" ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-media');

-- Allow authenticated users to upload
CREATE POLICY "authenticated_upload_blog_media" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-media' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete only their own uploads
CREATE POLICY "authenticated_delete_blog_media" ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-media' AND auth.uid() = owner_id);
