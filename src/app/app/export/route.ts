import { NextResponse } from 'next/server';
import { getAllFields, getAllProjects, getDashboards, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const [profile, dashboards] = await Promise.all([getProfile(sb, user.id), getDashboards(sb)]);
  const ids = dashboards.map((d) => d.id);
  const [fields, projects, links, activity] = await Promise.all([
    getAllFields(sb, ids), getAllProjects(sb, ids),
    sb.from('share_links').select('id,dashboard_id,name,hidden_field_ids,views,expires_at,revoked_at,created_at').then((r) => r.data ?? []),
    sb.from('activity_log').select('*').order('created_at', { ascending: false }).limit(2000).then((r) => r.data ?? []),
  ]);
  const body = JSON.stringify({ exported_at: new Date().toISOString(), email: user.email, profile, dashboards, fields, projects, share_links: links, activity }, null, 2);
  return new NextResponse(body, { headers: { 'content-type': 'application/json', 'content-disposition': `attachment; filename="provenly-export-${new Date().toISOString().slice(0, 10)}.json"`, 'cache-control': 'no-store' } });
}
