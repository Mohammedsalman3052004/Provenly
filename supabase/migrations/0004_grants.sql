-- Provenly · 0004 · table privileges for the Data API (safe to run more than once)
-- Newer Supabase projects no longer give the `authenticated` role access to tables you create
-- yourself. Row Level Security still decides WHICH rows; this only lets signed-in users reach the tables.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- anonymous visitors never touch tables directly (they only call the share/profile functions below)
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant execute on function public.get_shared_dashboard(text, text, text, boolean) to anon, authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.preview_share_config(uuid, uuid[], date, date, text[]) to authenticated;
grant execute on function public.set_share_password(uuid, text) to authenticated;
grant execute on function public.username_available(text) to authenticated;
grant execute on function public.resync_project_columns(uuid) to authenticated;

-- profile row for any account that already exists
insert into public.profiles (id, display_name, avatar_url)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(coalesce(u.email,''), '@', 1)), u.raw_user_meta_data->>'avatar_url'
from auth.users u
on conflict (id) do nothing;
