import Link from 'next/link';
import { PageHead } from '@/components/ui/PageHead';
import { ProjectForm } from '@/features/projects/ProjectForm';
import { getDashboard, getFields, getProjects } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Add project' };

export default async function Add({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [d, fields, projects] = await Promise.all([getDashboard(sb, dashboardId), getFields(sb, dashboardId), getProjects(sb, dashboardId)]);
  const suggestions: Record<string, string[]> = {};
  for (const f of fields) {
    if (f.type !== 'person' && f.type !== 'multiselect') continue;
    const s = new Set<string>();
    for (const p of projects) { const v = p.data[f.id]; if (typeof v === 'string') s.add(v); else if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && s.add(x)); }
    suggestions[f.id] = [...s].slice(0, 60);
  }
  return (
    <div className="page">
      <PageHead eyebrow={`${d!.icon} ${d!.name}`} title="Add a project" desc="The form is built from this dashboard’s fields." actions={<Link className="btn" href={`/app/d/${dashboardId}/fields`}>Edit fields</Link>} />
      <ProjectForm dashboardId={dashboardId} fields={fields} userId={user!.id} suggestions={suggestions} />
    </div>
  );
}
