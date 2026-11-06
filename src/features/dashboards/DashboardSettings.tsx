'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { deleteDashboard, duplicateDashboard, updateDashboard } from '@/features/dashboards/actions';
import type { Dashboard } from '@/types';

const ICONS = ['◆', '▤', '◐', '◈', '✦', '❖', '☰', '⌘', '✺', '❂'];
const COLORS = ['#3781fc', '#1951fc', '#7cc4ff', '#0b2cb1', '#8b5cf6', '#22d3ee', '#34d399', '#f59e0b'];

export function DashboardSettings({ dashboard, hasUsername }: { dashboard: Dashboard; hasUsername: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [d, setD] = useState({ name: dashboard.name, description: dashboard.description ?? '', icon: dashboard.icon, color: dashboard.color, is_published: dashboard.is_published });
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack" style={{ maxWidth: 640, gap: 24 }}>
      <div><label className="label">Name</label><input className="input" value={d.name} maxLength={80} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
      <div><label className="label">Description</label><input className="input" value={d.description} maxLength={300} onChange={(e) => setD({ ...d, description: e.target.value })} /></div>
      <div><label className="label">Icon</label><div className="row wrap gap-sm">{ICONS.map((i) => <button key={i} className="btn btn-icon" style={d.icon === i ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined} onClick={() => setD({ ...d, icon: i })}>{i}</button>)}</div></div>
      <div><label className="label">Accent colour</label><div className="row wrap gap-sm">{COLORS.map((c) => <button key={c} aria-label={c} onClick={() => setD({ ...d, color: c })} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: d.color === c ? '3px solid var(--text)' : '3px solid transparent' }} />)}</div></div>
      <label className="check"><input type="checkbox" checked={d.is_published} onChange={(e) => setD({ ...d, is_published: e.target.checked })} /> Show this dashboard on my public profile <span className="faint">(name and project count only{hasUsername ? '' : ' · set a username and make your profile public in Account settings first'})</span></label>
      <div><button className="btn btn-primary" disabled={busy || !d.name.trim()} onClick={async () => { setBusy(true); const r = await updateDashboard(dashboard.id, d); setBusy(false); if (!r.ok) return toast(r.error, { kind: 'err' }); toast('Saved'); router.refresh(); }}>{busy ? 'Saving…' : 'Save'}</button></div>

      <hr className="rule" style={{ margin: 0 }} />
      <div>
        <h3 style={{ fontSize: 24, marginBottom: 8 }}>Duplicate</h3>
        <div className="row wrap">
          <button className="btn" onClick={async () => { const r = await duplicateDashboard(dashboard.id, false); if (!r.ok) return toast(r.error, { kind: 'err' }); toast('Schema duplicated'); router.push(`/app/d/${r.data.id}`); router.refresh(); }}>Schema only</button>
          <button className="btn" onClick={async () => { const r = await duplicateDashboard(dashboard.id, true); if (!r.ok) return toast(r.error, { kind: 'err' }); toast('Dashboard duplicated with data'); router.push(`/app/d/${r.data.id}`); router.refresh(); }}>With all projects</button>
        </div>
      </div>
      <div>
        <h3 style={{ fontSize: 24, marginBottom: 8, color: 'var(--bad)' }}>Delete dashboard</h3>
        <p className="muted" style={{ marginTop: 0 }}>Its share links stop working immediately.</p>
        <button className="btn btn-danger" onClick={() => { if (confirm(`Delete “${dashboard.name}” and everything in it?`)) void deleteDashboard(dashboard.id); }}>Delete dashboard</button>
      </div>
    </div>
  );
}
