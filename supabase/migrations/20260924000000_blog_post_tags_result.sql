-- Meta line on the Writing index: free-form tags (domain, stack, themes) and an
-- optional result, e.g. "3rd place, solo".
alter table blog_posts add column if not exists tags text[] not null default '{}';
alter table blog_posts add column if not exists result text not null default '';
