-- Hosted Supabase schema for Ordo Defensionis persisted asset image selections.
-- Run this in the Supabase SQL Editor for your remote project when you migrate
-- the local image metadata layer to Supabase.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.asset_image_metadata (
  slug text primary key,
  source_slug text,
  source_designation text,
  source_designations text[] not null default '{}'::text[],
  cover_image jsonb,
  gallery jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists asset_image_metadata_source_slug_idx
  on public.asset_image_metadata (source_slug);

create index if not exists asset_image_metadata_source_designation_idx
  on public.asset_image_metadata (source_designation);

create index if not exists asset_image_metadata_source_designations_gin_idx
  on public.asset_image_metadata using gin (source_designations);

drop trigger if exists asset_image_metadata_set_updated_at on public.asset_image_metadata;

create trigger asset_image_metadata_set_updated_at
before update on public.asset_image_metadata
for each row
execute function public.set_updated_at();

alter table public.asset_image_metadata enable row level security;

revoke all on public.asset_image_metadata from anon, authenticated;

create or replace function public.list_asset_image_metadata()
returns setof public.asset_image_metadata
language sql
security definer
set search_path = public
as $$
  select *
  from public.asset_image_metadata
  order by slug;
$$;

create or replace function public.upsert_asset_image_metadata(
  p_slug text,
  p_source_slug text default null,
  p_source_designation text default null,
  p_source_designations text[] default '{}'::text[],
  p_cover_image jsonb default null,
  p_gallery jsonb default '[]'::jsonb
)
returns public.asset_image_metadata
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.asset_image_metadata;
begin
  insert into public.asset_image_metadata (
    slug,
    source_slug,
    source_designation,
    source_designations,
    cover_image,
    gallery
  )
  values (
    p_slug,
    p_source_slug,
    p_source_designation,
    coalesce(p_source_designations, '{}'::text[]),
    p_cover_image,
    coalesce(p_gallery, '[]'::jsonb)
  )
  on conflict (slug) do update
  set
    source_slug = excluded.source_slug,
    source_designation = excluded.source_designation,
    source_designations = excluded.source_designations,
    cover_image = excluded.cover_image,
    gallery = excluded.gallery
  returning * into saved_row;

  return saved_row;
end;
$$;

create or replace function public.delete_asset_image_metadata(p_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.asset_image_metadata
  where slug = p_slug;
$$;

revoke all on function public.list_asset_image_metadata() from public, anon, authenticated;
revoke all on function public.upsert_asset_image_metadata(text, text, text, text[], jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.delete_asset_image_metadata(text) from public, anon, authenticated;

grant execute on function public.list_asset_image_metadata() to service_role;
grant execute on function public.upsert_asset_image_metadata(text, text, text, text[], jsonb, jsonb) to service_role;
grant execute on function public.delete_asset_image_metadata(text) to service_role;
