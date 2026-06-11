create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  outlet_code text not null,
  outlet_name text not null,
  parent_name text,
  city text,
  district text,
  address text,
  leader text,
  environment_score integer not null check (environment_score between 1 and 10),
  service_score integer not null check (service_score between 1 and 10),
  feedback text,
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

drop policy if exists "Anyone can submit reviews" on public.reviews;
create policy "Anyone can submit reviews"
on public.reviews
for insert
to public
with check (true);

drop policy if exists "Admins can read reviews" on public.reviews;
create policy "Admins can read reviews"
on public.reviews
for select
to authenticated
using ((auth.jwt() ->> 'email') in ('ty1220899231@163.com'));

create or replace function public.admin_list_reviews(admin_user text, admin_password text)
returns table (
  id uuid,
  outlet_code text,
  outlet_name text,
  parent_name text,
  city text,
  district text,
  address text,
  leader text,
  environment_score integer,
  service_score integer,
  feedback text,
  photo_urls text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if admin_user <> 'zhangjun2026' or admin_password <> 'zhangjun2026' then
    raise exception 'invalid admin credentials' using errcode = '28000';
  end if;

  return query
  select
    r.id,
    r.outlet_code,
    r.outlet_name,
    r.parent_name,
    r.city,
    r.district,
    r.address,
    r.leader,
    r.environment_score,
    r.service_score,
    r.feedback,
    r.photo_urls,
    r.created_at
  from public.reviews r
  order by r.created_at desc
  limit 1000;
end;
$$;

revoke all on function public.admin_list_reviews(text, text) from public;
grant execute on function public.admin_list_reviews(text, text) to anon, authenticated;

create or replace function public.admin_delete_review(admin_user text, admin_password text, review_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if admin_user <> 'zhangjun2026' or admin_password <> 'zhangjun2026' then
    raise exception 'invalid admin credentials' using errcode = '28000';
  end if;

  delete from public.reviews
  where id = review_id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.admin_delete_review(text, text, uuid) from public;
grant execute on function public.admin_delete_review(text, text, uuid) to anon, authenticated;

create or replace function public.admin_clear_reviews(admin_user text, admin_password text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if admin_user <> 'zhangjun2026' or admin_password <> 'zhangjun2026' then
    raise exception 'invalid admin credentials' using errcode = '28000';
  end if;

  delete from public.reviews;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.admin_clear_reviews(text, text) from public;
grant execute on function public.admin_clear_reviews(text, text) to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('review-photos', 'review-photos', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can upload review photos" on storage.objects;
create policy "Anyone can upload review photos"
on storage.objects
for insert
to public
with check (bucket_id = 'review-photos');

drop policy if exists "Anyone can read review photos" on storage.objects;
create policy "Anyone can read review photos"
on storage.objects
for select
to public
using (bucket_id = 'review-photos');
