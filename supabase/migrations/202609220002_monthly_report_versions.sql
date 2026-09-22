-- Monthly report versioning: cases evolve inside a month, while closed months remain reviewable.
alter table public.events
  add column if not exists report_month date,
  add column if not exists case_key text,
  add column if not exists quality_score smallint not null default 0 check (quality_score between 0 and 100),
  add column if not exists version integer not null default 1 check (version > 0),
  add column if not exists supersedes_event_id uuid references public.events(id) on delete set null;

update public.events
set report_month = date_trunc('month', coalesce(happened_at, created_at))::date
where report_month is null;

update public.events
set case_key = lower(regexp_replace(coalesce(brand_id::text, 'unclassified') || '-' || coalesce(event_type, 'event') || '-' || title, '[[:space:][:punct:]]+', '-', 'g'))
where case_key is null or case_key = '';

alter table public.events alter column report_month set not null;
alter table public.events alter column case_key set not null;

create index if not exists events_month_case_idx
  on public.events (report_month desc, case_key, quality_score desc, version desc);

drop view if exists public.approved_events;
create view public.approved_events as
with ranked as (
  select e.*, b.name as brand,
    row_number() over (
      partition by e.report_month, e.case_key
      order by e.quality_score desc, e.version desc, e.updated_at desc
    ) as case_rank
  from public.events e
  left join public.brands b on b.id = e.brand_id
  where e.status = 'approved'
)
select * from ranked where case_rank = 1;

grant select on public.approved_events to anon, authenticated;

comment on column public.events.report_month is '月报归档月份，统一使用该月第一天';
comment on column public.events.case_key is '同一案例事件的稳定标识，用于补充与替换';
comment on column public.events.quality_score is '案例综合质量分：证据、完整性、相关性与可行动性';
comment on column public.events.supersedes_event_id is '该版本明确替换的上一事件版本';
