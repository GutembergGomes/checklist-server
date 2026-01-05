-- Create app_updates table to publish APK updates
create table if not exists public.app_updates (
  id bigserial primary key,
  version text not null,
  changelog text,
  apk_url text not null,
  created_at timestamptz not null default now()
);

-- Ensure public storage bucket for APKs exists
insert into storage.buckets (id, name, public)
values ('app', 'app', true)
on conflict (id) do nothing;
