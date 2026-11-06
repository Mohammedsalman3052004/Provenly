-- Provenly · 0003 · share + public-profile RPCs (the ONLY anonymous entry points)

-- Builds the viewer payload. Hidden fields are removed here, on the server,
-- from the field list AND from every project's data. Never granted to API roles.
create or replace function public.build_shared_payload(
  p_dashboard_id uuid, p_hidden uuid[], p_from date, p_to date,
  p_link_name text, p_views text[], p_noindex boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_dash public.dashboards;
  v_hidden uuid[] := coalesce(p_hidden, '{}');
  v_new uuid[];
  v_fields jsonb;
  v_projects jsonb;
  v_owner jsonb;
  v_visible text[];
begin
  select * into v_dash from public.dashboards where id = p_dashboard_id and deleted_at is null;
  if not found then return null; end if;

  -- 1) a computed field is hidden whenever anything it is computed from is hidden
  loop
    select coalesce(array_agg(f.id), '{}') into v_new
      from public.dashboard_fields f
     where f.dashboard_id = v_dash.id and f.type = 'formula' and not (f.id = any(v_hidden))
       and ( nullif(f.options #>> '{formula,a}', '')::uuid = any(v_hidden)
          or nullif(f.options #>> '{formula,b}', '')::uuid = any(v_hidden) );
    exit when array_length(v_new, 1) is null;
    v_hidden := v_hidden || v_new;
  end loop;

  -- 2) profit is derivable from amount/spent: hide it if either is hidden
  select coalesce(array_agg(f.id), '{}') into v_new
    from public.dashboard_fields f
   where f.dashboard_id = v_dash.id and f.role = 'profit' and not (f.id = any(v_hidden))
     and exists (select 1 from public.dashboard_fields g
                  where g.dashboard_id = v_dash.id and g.role in ('amount','spent') and g.id = any(v_hidden));
  v_hidden := v_hidden || v_new;

  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'type', f.type, 'role', f.role,
                                               'position', f.position, 'options', f.options) order by f.position), '[]'::jsonb),
         coalesce(array_agg(f.id::text), '{}')
    into v_fields, v_visible
    from public.dashboard_fields f
   where f.dashboard_id = v_dash.id and f.archived_at is null and not (f.id = any(v_hidden));

  -- whitelist: only values whose key is a visible field id survive
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id,
            'data', (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
                       from jsonb_each(p.data) e where e.key = any(v_visible))) order by p.created_at desc), '[]'::jsonb)
    into v_projects
    from (select * from public.projects
           where dashboard_id = v_dash.id and deleted_at is null
             and (p_from is null or coalesce(end_date, start_date, created_at::date) >= p_from)
             and (p_to   is null or coalesce(end_date, start_date, created_at::date) <= p_to)
           order by created_at desc limit 2000) p;

  select jsonb_build_object('name', pr.display_name, 'avatar_url', pr.avatar_url,
                            'username', case when pr.is_public then pr.username end)
    into v_owner from public.profiles pr where pr.id = v_dash.owner_id;

  return jsonb_build_object(
    'dashboard', jsonb_build_object('name', v_dash.name, 'description', v_dash.description, 'icon', v_dash.icon, 'color', v_dash.color),
    'owner', coalesce(v_owner, '{}'::jsonb),
    'link', jsonb_build_object('name', p_link_name, 'views', to_jsonb(p_views), 'noindex', p_noindex),
    'fields', v_fields,
    'projects', v_projects);
end $$;
revoke all on function public.build_shared_payload(uuid, uuid[], date, date, text, text[], boolean) from public, anon, authenticated;

-- Public entry point for /s/[token]
create or replace function public.get_shared_dashboard(
  p_token text, p_password text default null, p_referrer text default null, p_count boolean default true
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare l public.share_links; v_fails int; v_ok boolean; v_payload jsonb;
begin
  select * into l from public.share_links where token = p_token;
  if not found or l.revoked_at is not null or (l.expires_at is not null and l.expires_at < now()) then
    return jsonb_build_object('status', 'unavailable');
  end if;

  if l.password_hash is not null then
    if p_password is null or p_password = '' then
      return jsonb_build_object('status', 'password_required', 'name', l.name);
    end if;
    select count(*) into v_fails from public.share_link_attempts
     where link_id = l.id and success = false and attempted_at > now() - interval '15 minutes';
    if v_fails >= 8 then return jsonb_build_object('status', 'locked'); end if;
    v_ok := l.password_hash = extensions.crypt(p_password, l.password_hash);
    if not v_ok then insert into public.share_link_attempts (link_id, success) values (l.id, false); end if;
    if not v_ok then return jsonb_build_object('status', 'wrong_password'); end if;
  end if;

  v_payload := public.build_shared_payload(l.dashboard_id, l.hidden_field_ids, l.date_from, l.date_to, l.name, l.views, l.noindex);
  if v_payload is null then return jsonb_build_object('status', 'unavailable'); end if;
  if p_count then
    insert into public.share_link_views (link_id, referrer) values (l.id, nullif(left(p_referrer, 80), ''));
  end if;
  return jsonb_build_object('status', 'ok') || v_payload;
end $$;
revoke all on function public.get_shared_dashboard(text, text, text, boolean) from public;
grant execute on function public.get_shared_dashboard(text, text, text, boolean) to anon, authenticated;

-- Owner-only live preview with UNSAVED settings ("preview as viewer")
create or replace function public.preview_share_config(
  p_dashboard_id uuid, p_hidden uuid[], p_from date, p_to date, p_views text[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists (select 1 from public.dashboards where id = p_dashboard_id and owner_id = auth.uid()) then
    return null;
  end if;
  return jsonb_build_object('status', 'ok') ||
    public.build_shared_payload(p_dashboard_id, p_hidden, p_from, p_to, 'Preview', p_views, true);
end $$;
revoke all on function public.preview_share_config(uuid, uuid[], date, date, text[]) from public, anon;
grant execute on function public.preview_share_config(uuid, uuid[], date, date, text[]) to authenticated;

-- Owner sets / clears the link password (bcrypt via pgcrypto)
create or replace function public.set_share_password(p_link_id uuid, p_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.share_links
     set password_hash = case when p_password is null or p_password = '' then null
                              else extensions.crypt(p_password, extensions.gen_salt('bf', 10)) end
   where id = p_link_id and owner_id = auth.uid();
end $$;
revoke all on function public.set_share_password(uuid, text) from public, anon;
grant execute on function public.set_share_password(uuid, text) to authenticated;

-- Public profile (/u/[username]): counts and dates only, never project content
create or replace function public.get_public_profile(p_username text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pr public.profiles; v_dash jsonb; v_dates jsonb; v_total int;
begin
  select * into pr from public.profiles where username = lower(p_username) and is_public = true;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object('name', d.name, 'icon', d.icon, 'color', d.color, 'description', d.description,
          'projects', (select count(*) from public.projects p where p.dashboard_id = d.id and p.deleted_at is null))
          order by d.position, d.created_at), '[]'::jsonb)
    into v_dash from public.dashboards d where d.owner_id = pr.id and d.is_published and d.deleted_at is null;

  select coalesce(jsonb_agg(to_char(coalesce(p.end_date, p.start_date), 'YYYY-MM-DD')), '[]'::jsonb), count(*)
    into v_dates, v_total
    from public.projects p join public.dashboards d on d.id = p.dashboard_id
   where d.owner_id = pr.id and d.is_published and d.deleted_at is null and p.deleted_at is null
     and coalesce(p.end_date, p.start_date) is not null
     and coalesce(p.end_date, p.start_date) > current_date - 400;

  return jsonb_build_object('username', pr.username, 'name', pr.display_name, 'avatar_url', pr.avatar_url, 'bio', pr.bio,
    'dashboards', v_dash, 'dates', v_dates,
    'total', (select count(*) from public.projects p join public.dashboards d on d.id = p.dashboard_id
               where d.owner_id = pr.id and d.is_published and d.deleted_at is null and p.deleted_at is null));
end $$;
revoke all on function public.get_public_profile(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated;

-- Username availability without exposing the profiles table
create or replace function public.username_available(p_username text) returns boolean
language sql security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(p_username) and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'));
$$;
revoke all on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

-- Re-run the denormalise trigger for a dashboard after its field roles change (RLS applies: SECURITY INVOKER)
create or replace function public.resync_project_columns(p_dashboard_id uuid) returns void
language sql security invoker set search_path = public as $$
  update public.projects set data = data where dashboard_id = p_dashboard_id;
$$;
revoke all on function public.resync_project_columns(uuid) from public, anon;
grant execute on function public.resync_project_columns(uuid) to authenticated;
