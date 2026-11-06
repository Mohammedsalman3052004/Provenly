import Link from 'next/link';
import { KpiStrip } from '@/features/analytics/AnalyticsPanel';
import { computeAnalytics, dueSoon, normalize } from '@/features/analytics/compute';
import { BarChart } from '@/components/ui/Charts';
import { ActivityList, Reminders } from '@/components/ui/Lists';
import { PageHead } from '@/components/ui/PageHead';
import { OverviewTable } from '@/features/projects/OverviewTable';
import { formatMoney } from '@/lib/currency';
import { getActivity, getDashboard, getFields, getProjects } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';

export default async function Overview({ params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;
  const sb = await createClient();
  const [d, fields, projects, activity] = await Promise.all([getDashboard(sb, dashboardId), getFields(sb, dashboardId), getProjects(sb, dashboardId), getActivity(sb, { dashboardId, limit: 8 })]);
  const n = normalize(fields, projects.map((p) => ({ id: p.id, data: p.data })), { dashboardId });
  const r = computeAnalytics(n.items, n.flags, n.currency, 'month');
  const money = r.unit === 'money';
  const fmt = (x: number) => (money ? formatMoney(Math.round(x), r.currency, true) : String(Math.round(x)));
  return (
    <div className="page">
      <PageHead eyebrow={`${d!.icon} Dashboard`} title={d!.name} desc={d!.description ?? undefined}
        actions={<><Link className="btn" href={`/app/d/${dashboardId}/projects`}>View projects</Link><Link className="btn btn-primary" href={`/app/d/${dashboardId}/add`}>+ Add project</Link></>} />
      {projects.length === 0 ? (
        <div className="empty"><div className="glyph">{d!.icon}</div><h2>Add your first project</h2><p>Your numbers, charts and share links appear as soon as there is data.</p><Link className="btn btn-primary" href={`/app/d/${dashboardId}/add`}>Add a project</Link></div>
      ) : (
        <>
          <KpiStrip r={r} />
          <h2 className="sec-title">Projects <small>latest {Math.min(8, projects.length)}</small></h2>
          <OverviewTable dashboardId={dashboardId} fields={fields} projects={projects} />
          <div className="cols">
            <div>
              <h2 className="sec-title">{money ? 'Revenue' : 'Delivered'} <small>last 12 months</small></h2>
              <BarChart label="Last twelve months" format={fmt} points={r.series.map((s) => ({ label: s.label, a: money ? s.revenue : s.completed }))} />
              <Link className="btn btn-sm" href={`/app/d/${dashboardId}/analytics`}>Full analytics →</Link>
            </div>
            <div>
              <h2 className="sec-title">Due soon</h2>
              <Reminders items={dueSoon(n.items)} />
              <h2 className="sec-title">Activity</h2>
              <ActivityList items={activity} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
