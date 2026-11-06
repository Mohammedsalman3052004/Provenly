import Link from 'next/link';
import { AnalyticsPanel } from '@/features/analytics/AnalyticsPanel';
import { computeAll, dueSoon, goalProgress, normalize, type Flags, type NProject } from '@/features/analytics/compute';
import { Ring } from '@/components/ui/Charts';
import { ActivityList, Reminders } from '@/components/ui/Lists';
import { PageHead } from '@/components/ui/PageHead';
import { formatMoney } from '@/lib/currency';
import { getActivity, getAllFields, getAllProjects, getDashboards, getProfile } from '@/lib/data';
import { createClient } from '@/lib/supabase/server';
import { activeFields } from '@/lib/project-data';

export const metadata = { title: 'Home' };

export default async function Home() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const [profile, dashboards] = await Promise.all([getProfile(sb, user!.id), getDashboards(sb)]);

  if (!dashboards.length)
    return (
      <div className="page">
        <div className="empty" style={{ paddingTop: 110 }}>
          <div className="glyph">◆</div>
          <h2>Create your first dashboard</h2>
          <p>Name it, pick the fields you track, add a project. Takes about a minute.</p>
          <Link className="btn btn-primary" style={{ marginTop: 18 }} href="/app/new">Get started</Link>
        </div>
      </div>
    );

  const ids = dashboards.map((d) => d.id);
  const [allFields, allProjects, activity] = await Promise.all([getAllFields(sb, ids), getAllProjects(sb, ids), getActivity(sb, { limit: 8 })]);
  const cur = profile.base_currency;
  const items: NProject[] = [];
  const flags: Flags = { amount: false, spent: false, profit: false, due: false, client: false, tags: false, status: false };
  const per = dashboards.map((d) => {
    const f = activeFields(allFields.filter((x) => x.dashboard_id === d.id));
    const n = normalize(f, allProjects.filter((p) => p.dashboard_id === d.id), { baseCurrency: cur, dashboardId: d.id });
    items.push(...n.items);
    (Object.keys(flags) as (keyof Flags)[]).forEach((k) => { flags[k] = flags[k] || n.flags[k]; });
    return { d, count: n.items.length, delivered: n.items.filter((i) => i.done).length, revenue: n.items.reduce((a, i) => a + (i.amount ?? 0), 0), hasMoney: n.flags.amount };
  });
  const data = computeAll(items, flags, cur);
  const goal = goalProgress(items, { type: profile.goal_type, value: profile.goal_value, period: profile.goal_period });
  const dashName = Object.fromEntries(dashboards.map((d) => [d.id, d.name]));
  const due = dueSoon(items);

  return (
    <div className="page">
      <PageHead eyebrow="Home · all dashboards combined" title={`Hello, ${profile.display_name?.split(' ')[0] ?? 'there'}`} desc={`${items.length} projects across ${dashboards.length} dashboard${dashboards.length > 1 ? 's' : ''}${flags.amount ? ` · totals shown in ${cur}` : ''}`}
        actions={<Link className="btn btn-primary" href="/app/new">+ New dashboard</Link>} />
      <AnalyticsPanel data={data} />

      <div className="cols" style={{ marginTop: 20 }}>
        <div>
          <h2 className="sec-title">Your dashboards</h2>
          {per.map(({ d, count, delivered, revenue, hasMoney }) => (
            <Link key={d.id} href={`/app/d/${d.id}`} className="row between" style={{ padding: '16px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="row"><span style={{ color: d.color, fontSize: 22 }}>{d.icon}</span><span><b style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500 }}>{d.name}</b><br /><span className="muted" style={{ fontSize: 13 }}>{count} projects · {delivered} delivered</span></span></span>
              {hasMoney && <span className="num">{formatMoney(revenue, cur, true)}</span>}
            </Link>
          ))}
        </div>
        <div>
          {goal && (
            <>
              <h2 className="sec-title">Goal <small>this {goal.period}</small></h2>
              <div className="row gap-lg">
                <Ring value={goal.current / goal.target} label="of goal" />
                <div><div className="num" style={{ fontSize: 20 }}>{goal.type === 'revenue' ? formatMoney(goal.current, cur, true) : goal.current}</div><div className="muted">of {goal.type === 'revenue' ? formatMoney(goal.target, cur, true) : `${goal.target} projects`}</div></div>
              </div>
            </>
          )}
          <h2 className="sec-title">Due soon</h2>
          <Reminders items={due} dashName={dashName} />
          <h2 className="sec-title">Recent activity</h2>
          <ActivityList items={activity} />
        </div>
      </div>
    </div>
  );
}
