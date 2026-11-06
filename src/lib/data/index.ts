import type { SupabaseClient } from '@supabase/supabase-js';
import type { ActivityEntry, Dashboard, Field, Profile, Project, ShareLink } from '@/types';

/** Single data-access layer. Every read goes through the user's session, so RLS applies. */
type Sb = SupabaseClient;

export async function getProfile(sb: Sb, userId: string): Promise<Profile> {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || /schema cache|does not exist/i.test(error.message))
      throw new Error('Database tables not found. Run the SQL files in supabase/migrations (Setup guide, Step 2), then refresh.');
    if (error.code === '42501' || /permission denied/i.test(error.message))
      throw new Error('Database permission denied. Run supabase/migrations/0004_grants.sql in the Supabase SQL editor, then refresh.');
    throw new Error(`Could not read your profile: ${error.message} (${error.code})`);
  }
  if (data) return data as Profile;
  // account created before the signup trigger existed: create the row now
  const { error: upErr } = await sb.from('profiles').upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });
  if (upErr) throw new Error(`Could not create your profile: ${upErr.message} (${upErr.code}). Run supabase/migrations/0004_grants.sql, then refresh.`);
  const { data: again } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (again) return again as Profile;
  throw new Error('Your profile row is missing. Run supabase/migrations/0004_grants.sql (it creates it), then refresh.');
}

export async function getDashboards(sb: Sb): Promise<Dashboard[]> {
  const { data } = await sb.from('dashboards').select('*').is('deleted_at', null).order('position').order('created_at');
  return (data ?? []) as Dashboard[];
}

export async function getDashboard(sb: Sb, id: string): Promise<Dashboard | null> {
  const { data } = await sb.from('dashboards').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  return (data as Dashboard) ?? null;
}

export async function getFields(sb: Sb, dashboardId: string, includeArchived = false): Promise<Field[]> {
  let q = sb.from('dashboard_fields').select('*').eq('dashboard_id', dashboardId).order('position');
  if (!includeArchived) q = q.is('archived_at', null);
  const { data } = await q;
  return (data ?? []) as Field[];
}

export async function getAllFields(sb: Sb, dashboardIds: string[]): Promise<Field[]> {
  if (!dashboardIds.length) return [];
  const { data } = await sb.from('dashboard_fields').select('*').in('dashboard_id', dashboardIds).is('archived_at', null).order('position');
  return (data ?? []) as Field[];
}

const PAGE = 1000;
/** Pages through PostgREST's 1000-row cap. */
export async function getProjects(sb: Sb, dashboardId: string): Promise<Project[]> {
  const out: Project[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await sb.from('projects').select('*').eq('dashboard_id', dashboardId).is('deleted_at', null)
      .order('created_at', { ascending: false }).range(from, from + PAGE - 1);
    const rows = (data ?? []) as Project[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

export async function getAllProjects(sb: Sb, dashboardIds: string[]): Promise<Project[]> {
  const parts = await Promise.all(dashboardIds.map((id) => getProjects(sb, id)));
  return parts.flat();
}

export async function getActivity(sb: Sb, opts: { dashboardId?: string; projectId?: string; limit?: number }): Promise<ActivityEntry[]> {
  let q = sb.from('activity_log').select('id,dashboard_id,project_id,action,summary,created_at').order('created_at', { ascending: false }).limit(opts.limit ?? 12);
  if (opts.dashboardId) q = q.eq('dashboard_id', opts.dashboardId);
  if (opts.projectId) q = q.eq('project_id', opts.projectId);
  const { data } = await q;
  return (data ?? []) as ActivityEntry[];
}

export async function getShareLinks(sb: Sb, dashboardId: string): Promise<(ShareLink & { view_count: number })[]> {
  const { data } = await sb.from('share_links').select('*').eq('dashboard_id', dashboardId).order('created_at', { ascending: false });
  const links = (data ?? []) as ShareLink[];
  const counts = await Promise.all(
    links.map(async (l) => {
      const { count } = await sb.from('share_link_views').select('id', { count: 'exact', head: true }).eq('link_id', l.id);
      return count ?? 0;
    }),
  );
  return links.map((l, i) => ({ ...l, view_count: counts[i] }));
}
