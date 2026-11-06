import Link from 'next/link';
import type { NProject } from '@/features/analytics/compute';
import { fmtDate, timeAgo } from '@/lib/format';
import type { ActivityEntry } from '@/types';

export function Reminders({ items, dashName }: { items: NProject[]; dashName?: Record<string, string> }) {
  if (!items.length) return <p className="muted">Nothing due in the next 7 days.</p>;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.slice(0, 8).map((p) => {
        const d = (p.due ?? p.end)!;
        const late = d < today;
        return (
          <li key={p.id} style={{ borderBottom: '1px solid var(--line)' }}>
            <Link href={`/app/d/${p.dashboardId}/projects?open=${p.id}`} className="row between" style={{ padding: '11px 0' }}>
              <span>{p.title}{dashName && p.dashboardId && <span className="faint"> · {dashName[p.dashboardId]}</span>}</span>
              <span className="num" style={{ color: late ? 'var(--bad)' : 'var(--muted)', fontSize: 13 }}>{late ? 'overdue · ' : ''}{fmtDate(d, false)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActivityList({ items }: { items: ActivityEntry[] }) {
  if (!items.length) return <p className="muted">Activity shows up here as you work.</p>;
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((a) => <li key={a.id} className="row between" style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}><span>{a.summary}</span><span className="faint" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{timeAgo(a.created_at)}</span></li>)}
    </ul>
  );
}
