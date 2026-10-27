-- POD section-level review comments
create table if not exists pod_review_comments (
  id            uuid primary key default gen_random_uuid(),
  pod_id        uuid not null references plan_of_day(id) on delete cascade,
  section       text not null, -- 'uniform' | 'oic' | 'schedule' | 'safety_brief' | 'special_events' | 'general'
  body          text not null,
  author_id     uuid not null references profiles(id) on delete cascade,
  author_name   text not null,
  resolved      boolean not null default false,
  resolved_by   uuid references profiles(id),
  created_at    timestamptz not null default now()
);

alter table pod_review_comments enable row level security;

-- Officers + SNCOs can insert
create policy "officers_snco_insert_pod_comments" on pod_review_comments
  for insert with check (
    exists (
      select 1 from profiles
      where id = (select auth.uid())
        and role in ('officer', 'snco')
        and active = true and approved = true
    )
  );

-- Anyone with portal access can read
create policy "authed_read_pod_comments" on pod_review_comments
  for select using (
    exists (
      select 1 from profiles
      where id = (select auth.uid())
        and active = true and approved = true
    )
  );

-- Author or SNCO+ can resolve/update
create policy "author_or_snco_update_pod_comments" on pod_review_comments
  for update using (
    author_id = (select auth.uid())
    or exists (
      select 1 from profiles
      where id = (select auth.uid())
        and role in ('officer', 'snco')
        and active = true and approved = true
    )
  );

create index if not exists pod_review_comments_pod_id_idx on pod_review_comments(pod_id);
