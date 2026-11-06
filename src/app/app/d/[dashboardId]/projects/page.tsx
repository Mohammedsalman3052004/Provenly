import { Suspense } from 'react';
import { PageHead } from '@/components/ui/PageHead';
import { ProjectsView } from '@/features/projects/ProjectsView';
import { getDashboard, getFields, getProjects } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Projects' };

export default async function Projects({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [d, fields, projects] = await Promise.all([getDashboard(sb, dashboardId), getFields(sb, dashboardId), getProjects(sb, dashboardId)]);
  return (
    <div className="page" style={{ maxWidth: 1480 }}>
      <PageHead eyebrow={`${d!.icon} ${d!.name}`} title="Projects" desc={`${projects.length} project${projects.length === 1 ? '' : 's'}`} />
      <Suspense><ProjectsView dashboardId={dashboardId} dashboardName={d!.name} fields={fields} projects={projects} userId={user!.id} /></Suspense>
    </div>
  );
}
