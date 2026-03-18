-- Hosted Supabase schema for Ordo Defensionis asset overrides.
-- Run this in the Supabase SQL Editor for your remote project.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.asset_overrides (
  slug text primary key,
  source_slug text,
  source_designation text,
  source_designations text[] not null default '{}'::text[],
  designation text,
  description text,
  branch text,
  category text,
  sub_category text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint asset_overrides_branch_check
    check (branch is null or branch = any (array['Air', 'Land', 'Naval', 'Joint']))
);

create index if not exists asset_overrides_source_slug_idx
  on public.asset_overrides (source_slug);

create index if not exists asset_overrides_source_designation_idx
  on public.asset_overrides (source_designation);

create index if not exists asset_overrides_source_designations_gin_idx
  on public.asset_overrides using gin (source_designations);

drop trigger if exists asset_overrides_set_updated_at on public.asset_overrides;

create trigger asset_overrides_set_updated_at
before update on public.asset_overrides
for each row
execute function public.set_updated_at();

alter table public.asset_overrides enable row level security;

revoke all on public.asset_overrides from anon, authenticated;

create or replace function public.list_asset_overrides()
returns setof public.asset_overrides
language sql
security definer
set search_path = public
as $$
  select *
  from public.asset_overrides
  order by slug;
$$;

create or replace function public.upsert_asset_override(
  p_slug text,
  p_source_slug text default null,
  p_source_designation text default null,
  p_source_designations text[] default '{}'::text[],
  p_designation text default null,
  p_description text default null,
  p_branch text default null,
  p_category text default null,
  p_sub_category text default null
)
returns public.asset_overrides
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.asset_overrides;
begin
  insert into public.asset_overrides (
    slug,
    source_slug,
    source_designation,
    source_designations,
    designation,
    description,
    branch,
    category,
    sub_category
  )
  values (
    p_slug,
    p_source_slug,
    p_source_designation,
    coalesce(p_source_designations, '{}'::text[]),
    p_designation,
    p_description,
    p_branch,
    p_category,
    p_sub_category
  )
  on conflict (slug) do update
  set
    source_slug = excluded.source_slug,
    source_designation = excluded.source_designation,
    source_designations = excluded.source_designations,
    designation = excluded.designation,
    description = excluded.description,
    branch = excluded.branch,
    category = excluded.category,
    sub_category = excluded.sub_category
  returning * into saved_row;

  return saved_row;
end;
$$;

create or replace function public.delete_asset_override(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.asset_overrides
  where slug = p_slug;
$$;

revoke all on function public.list_asset_overrides() from public, anon, authenticated;
revoke all on function public.upsert_asset_override(text, text, text, text[], text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.delete_asset_override(text) from public, anon, authenticated;

grant execute on function public.list_asset_overrides() to service_role;
grant execute on function public.upsert_asset_override(text, text, text, text[], text, text, text, text, text) to service_role;
grant execute on function public.delete_asset_override(text) to service_role;
