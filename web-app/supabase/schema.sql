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
