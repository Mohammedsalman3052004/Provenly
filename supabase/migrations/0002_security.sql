-- Provenly · 0002 · Row Level Security + storage (safe to run more than once)
alter table public.profiles            enable row level security;
alter table public.dashboards          enable row level security;
alter table public.dashboard_fields    enable row level security;
alter table public.projects            enable row level security;
alter table public.share_links         enable row level security;
alter table public.share_link_views    enable row level security;
alter table public.share_link_attempts enable row level security;
alter table public.activity_log        enable row level security;

-- defence in depth: the anonymous role never touches tables directly
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- table privileges (RLS below decides which rows)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- dashboards
drop policy if exists dashboards_owner on public.dashboards;
create policy dashboards_owner on public.dashboards for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- fields (through the owning dashboard)
drop policy if exists fields_owner on public.dashboard_fields;
create policy fields_owner on public.dashboard_fields for all to authenticated
  using (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = auth.uid()));

-- projects: owner AND the dashboard must be the owner's (no cross-dashboard writes)
drop policy if exists projects_owner on public.projects;
create policy projects_owner on public.projects for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = auth.uid()));

-- share links
drop policy if exists share_links_owner on public.share_links;
create policy share_links_owner on public.share_links for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
    and exists (select 1 from public.dashboards d where d.id = dashboard_id and d.owner_id = auth.uid()));

-- view counter: owners can read; only the SECURITY DEFINER RPC writes
drop policy if exists share_views_owner_read on public.share_link_views;
create policy share_views_owner_read on public.share_link_views for select to authenticated
  using (exists (select 1 from public.share_links l where l.id = link_id and l.owner_id = auth.uid()));
-- share_link_attempts: no policies = nobody but the RPC can touch it

-- activity
drop policy if exists activity_owner_read on public.activity_log;
create policy activity_owner_read on public.activity_log for select to authenticated using (owner_id = auth.uid());
drop policy if exists activity_owner_insert on public.activity_log;
create policy activity_owner_insert on public.activity_log for insert to authenticated with check (owner_id = auth.uid());

-- STORAGE: public-read thumbnails, write only inside your own folder --------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-thumbnails', 'project-thumbnails', true, 2097152, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp','image/jpeg','image/png'];

drop policy if exists thumbs_read on storage.objects;
create policy thumbs_read on storage.objects for select using (bucket_id = 'project-thumbnails');
drop policy if exists thumbs_insert on storage.objects;
create policy thumbs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'project-thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists thumbs_update on storage.objects;
create policy thumbs_update on storage.objects for update to authenticated
  using (bucket_id = 'project-thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists thumbs_delete on storage.objects;
create policy thumbs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'project-thumbnails' and (storage.foldername(name))[1] = auth.uid()::text);

-- Create a profile row for any account that signed up before the signup trigger existed
insert into public.profiles (id, display_name, avatar_url)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email,''), '@', 1)), u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;
