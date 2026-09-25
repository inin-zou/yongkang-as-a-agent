-- Traffic sources for ADMIN.md → traffic.
--
-- One row per page view by a person (POST /api/track from the SPA) or per page
-- fetched by a known crawler (recorded by the Go page handler; CDN cache hits
-- never reach it, so crawler counts are a lower bound).
--
-- No IP address or cookie is stored. `visitor` is a hash of IP + user agent
-- with a salt that changes every day, so a person counts once per day and
-- can't be followed across days.
create table if not exists page_visits (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null,
  landing boolean not null default false,  -- first page of a visit
  referrer text not null default '',       -- host only, e.g. linkedin.com; landing views only
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  country text not null default '',        -- ISO code from Vercel's geo header
  device text not null default '',         -- mobile / tablet / desktop
  visitor text not null default '',
  bot text not null default ''             -- crawler name; '' for people
);

create index if not exists page_visits_created_at on page_visits (created_at desc);

-- Only the backend's direct connection reads and writes; no public policies.
alter table page_visits enable row level security;
