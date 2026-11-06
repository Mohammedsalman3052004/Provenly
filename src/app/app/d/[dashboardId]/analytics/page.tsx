import { AnalyticsPanel } from '@/features/analytics/AnalyticsPanel';
import { computeAll, normalize } from '@/features/analytics/compute';
import { PageHead } from '@/components/ui/PageHead';
import { getDashboard, getFields, getProjects } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Analytics' };

export default async function Analytics({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const [d, fields, projects] = await Promise.all([getDashboard(sb, dashboardId), getFields(sb, dashboardId), getProjects(sb, dashboardId)]);
  const n = normalize(fields, projects.map((p) => ({ id: p.id, data: p.data })), { dashboardId });
  return (
    <div className="page">
      <PageHead eyebrow={`${d!.icon} ${d!.name}`} title="Analytics" desc="Weekly, monthly, quarterly and yearly progress, calculated on the server from your fields." />
      {projects.length ? <AnalyticsPanel data={computeAll(n.items, n.flags, n.currency)} /> : <div className="empty"><h2>No data yet</h2><p>Add projects to see analytics.</p></div>}
    </div>
  );
}
