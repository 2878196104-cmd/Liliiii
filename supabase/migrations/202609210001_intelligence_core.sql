create extension if not exists pgcrypto;

create type public.review_status as enum ('pending', 'approved', 'rejected', 'needs_evidence');
create type public.document_kind as enum ('article', 'social_post', 'report', 'file', 'rss_item');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  website text,
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_url text,
  platform text not null,
  feed_url text,
  trust_level smallint not null default 2 check (trust_level between 1 and 3),
  enabled boolean not null default true,
  collection_interval_minutes integer not null default 360,
  last_collected_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.raw_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  external_id text,
  canonical_url text not null,
  title text not null,
  body_text text,
  raw_payload jsonb not null default '{}',
  kind public.document_kind not null default 'article',
  published_at timestamptz,
  collected_at timestamptz not null default now(),
  content_hash text not null,
  processing_status text not null default 'new',
  error_message text,
  unique (canonical_url, content_hash)
);

create index raw_documents_published_idx on public.raw_documents (published_at desc);
create index raw_documents_processing_idx on public.raw_documents (processing_status, collected_at);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  title text not null,
  event_type text,
  theme text,
  summary text,
  purpose text,
  product_strategy text,
  core_strategy text,
  actions text[] not null default '{}',
  channels text[] not null default '{}',
  happened_at timestamptz,
  status public.review_status not null default 'pending',
  confidence numeric(4,3) check (confidence between 0 and 1),
  created_by text not null default 'pipeline',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_evidence (
  event_id uuid not null references public.events(id) on delete cascade,
  document_id uuid not null references public.raw_documents(id) on delete cascade,
  quote_text text,
  evidence_role text not null default 'supporting',
  primary key (event_id, document_id)
);

create table public.insights (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  observation text not null,
  reasoning text,
  boundary_text text,
  recommendation text,
  status public.review_status not null default 'pending',
  confidence numeric(4,3) check (confidence between 0 and 1),
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.insight_evidence (
  insight_id uuid not null references public.insights(id) on delete cascade,
  document_id uuid not null references public.raw_documents(id) on delete cascade,
  primary key (insight_id, document_id)
);

create table public.collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  discovered_count integer not null default 0,
  inserted_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text
);

create or replace view public.approved_events as
select e.*, b.name as brand
from public.events e
left join public.brands b on b.id = e.brand_id
where e.status = 'approved';

alter table public.brands enable row level security;
alter table public.profiles enable row level security;
alter table public.sources enable row level security;
alter table public.raw_documents enable row level security;
alter table public.events enable row level security;
alter table public.event_evidence enable row level security;
alter table public.insights enable row level security;
alter table public.insight_evidence enable row level security;
alter table public.collection_runs enable row level security;

create policy "public can read approved events" on public.events
for select using (status = 'approved');
create policy "public can read brands" on public.brands for select using (true);
create policy "public can read public sources" on public.sources for select using (enabled = true);
create policy "public can read approved insights" on public.insights
for select using (status = 'approved');

create or replace function public.is_monthly_know_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and is_admin = true
  );
$$;

create policy "admins manage brands" on public.brands for all
using (public.is_monthly_know_admin()) with check (public.is_monthly_know_admin());
create policy "admins manage sources" on public.sources for all
using (public.is_monthly_know_admin()) with check (public.is_monthly_know_admin());
create policy "admins manage documents" on public.raw_documents for all
using (public.is_monthly_know_admin()) with check (public.is_monthly_know_admin());
create policy "admins manage events" on public.events for all
using (public.is_monthly_know_admin()) with check (public.is_monthly_know_admin());
create policy "admins manage event evidence" on public.event_evidence for all
using (public.is_monthly_know_admin()) with check (public.is_monthly_know_admin());
create policy "admins manage insights" on public.insights for all
using (public.is_monthly_know_admin()) with check (public.is_monthly_know_admin());
create policy "admins manage insight evidence" on public.insight_evidence for all
using (public.is_monthly_know_admin()) with check (public.is_monthly_know_admin());
create policy "admins read runs" on public.collection_runs for select
using (public.is_monthly_know_admin());

insert into public.brands (name, category, aliases) values
  ('林氏家居', '家居', array['林氏']),
  ('源氏木语', '家居', array['源氏']),
  ('顾家家居', '家居', array['顾家']),
  ('慕思', '睡眠', array['慕思床垫']),
  ('亚朵星球', '睡眠', array['亚朵']);
