-- Add category column to blog_posts for MEMORY.md drill-down sidebar
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'technical';
