-- Provenly · 0001 · schema, triggers, indexes
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- PROFILES -----------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_-]{3,30}$'),
  display_name text,
  avatar_url text,
  bio text check (char_length(bio) <= 280),
  base_currency text not null default 'USD' check (base_currency ~ '^[A-Z]{3}$'),
  is_public boolean not null default false,
  goal_type text check (goal_type in ('revenue','projects')),
  goal_value bigint check (goal_value is null or goal_value > 0),
  goal_period text not null default 'month' check (goal_period in ('month','year')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email,''), '@', 1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- DASHBOARDS ---------------------------------------------------------------
create table public.dashboards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 300),
  icon text not null default '◆' check (char_length(icon) <= 8),
  color text not null default '#3781fc' check (color ~ '^#[0-9a-fA-F]{6}$'),
  template text not null default 'blank',
  is_published boolean not null default false,
  position int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dashboards_owner_idx on public.dashboards (owner_id) where deleted_at is null;
create trigger dashboards_updated before update on public.dashboards for each row execute function public.set_updated_at();

-- FIELD SCHEMA -------------------------------------------------------------
create table public.dashboard_fields (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  type text not null check (type in ('text','longtext','url','number','currency','date','daterange','select','multiselect','status','person','checkbox','rating','image','formula')),
  role text check (role in ('title','url','amount','spent','profit','start','end','range','due','client','status','tags','thumbnail','description')),
  position int not null default 0,
  required boolean not null default false,
  sensitive boolean not null default false,
  default_visible boolean not null default true,
  options jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dashboard_fields_dash_idx on public.dashboard_fields (dashboard_id, position);
create trigger dashboard_fields_updated before update on public.dashboard_fields for each row execute function public.set_updated_at();

-- PROJECTS -----------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  start_date date,
  end_date date,
  amount_minor bigint,
  status text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_dash_idx on public.projects (dashboard_id, created_at desc) where deleted_at is null;
create index projects_owner_idx on public.projects (owner_id);
create index projects_data_gin on public.projects using gin (data jsonb_path_ops);
create index projects_start_idx on public.projects (dashboard_id, start_date);
create index projects_end_idx on public.projects (dashboard_id, end_date);
create index projects_amount_idx on public.projects (dashboard_id, amount_minor);
create index projects_status_idx on public.projects (dashboard_id, status);
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

-- safe casts (bad input never aborts a write)
create or replace function public.safe_date(t text) returns date language plpgsql immutable as $$
begin return t::date; exception when others then return null; end $$;
create or replace function public.safe_bigint(t text) returns bigint language plpgsql immutable as $$
begin return t::numeric::bigint; exception when others then return null; end $$;

-- keep indexed columns in sync with the dashboard's field roles
create or replace function public.projects_denormalize() returns trigger
language plpgsql security definer set search_path = public as $$
declare f_start text; f_end text; f_range text; f_amount text; f_status text;
begin
  select (array_agg(id order by position) filter (where role = 'start'))[1]::text,
         (array_agg(id order by position) filter (where role = 'end'))[1]::text,
         (array_agg(id order by position) filter (where role = 'range'))[1]::text,
         (array_agg(id order by position) filter (where role = 'amount'))[1]::text,
         (array_agg(id order by position) filter (where role = 'status'))[1]::text
    into f_start, f_end, f_range, f_amount, f_status
    from public.dashboard_fields where dashboard_id = new.dashboard_id and archived_at is null;
  new.start_date   := coalesce(public.safe_date(new.data ->> f_start), public.safe_date(new.data -> f_range ->> 'start'));
  new.end_date     := coalesce(public.safe_date(new.data ->> f_end),   public.safe_date(new.data -> f_range ->> 'end'));
  new.amount_minor := public.safe_bigint(new.data ->> f_amount);
  new.status       := left(new.data ->> f_status, 60);
  return new;
end $$;
create trigger projects_denorm before insert or update of data on public.projects for each row execute function public.projects_denormalize();

-- SHARING ------------------------------------------------------------------
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null references public.dashboards(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'), -- 192 bits
  hidden_field_ids uuid[] not null default '{}',
  views text[] not null default '{table,gallery,analytics}',
  date_from date,
  date_to date,
  password_hash text,
  expires_at timestamptz,
  revoked_at timestamptz,
  noindex boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index share_links_dash_idx on public.share_links (dashboard_id);
create trigger share_links_updated before update on public.share_links for each row execute function public.set_updated_at();

create table public.share_link_views (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.share_links(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  referrer text
);
create index share_link_views_idx on public.share_link_views (link_id, viewed_at desc);

create table public.share_link_attempts (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.share_links(id) on delete cascade,
  attempted_at timestamptz not null default now(),
  success boolean not null
);
create index share_link_attempts_idx on public.share_link_attempts (link_id, attempted_at desc);

-- ACTIVITY -----------------------------------------------------------------
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dashboard_id uuid references public.dashboards(id) on delete cascade,
  project_id uuid,
  action text not null,
  summary text not null,
  created_at timestamptz not null default now()
);
create index activity_owner_idx on public.activity_log (owner_id, created_at desc);
create index activity_dash_idx on public.activity_log (dashboard_id, created_at desc);
