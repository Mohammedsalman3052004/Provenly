'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnalyticsPanel } from '@/features/analytics/AnalyticsPanel';
import { ProTable } from '@/features/projects/ProTable';
import { DetailList, Gallery } from '@/features/projects/Views';
import { TitleCell } from '@/features/projects/cells';
import { Overlay } from '@/components/ui/Modal';
import { APP_NAME } from '@/lib/config';
import { initials } from '@/lib/format';
import type { SharedViewModel } from '@/features/share/viewmodel';

const LABEL: Record<string, string> = { table: 'Projects', gallery: 'Gallery', analytics: 'Analytics' };

export function SharedView({ vm, token, embedded }: { vm: SharedViewModel; token: string; embedded?: boolean }) {
  const { payload, analytics } = vm;
  const fields = useMemo(() => [...payload.fields].sort((a, b) => a.position - b.position), [payload.fields]);
  const rows = payload.projects;
  const tabs = ['table', 'gallery', 'analytics'].filter((v) => payload.link.views.includes(v));
  const [tab, setTab] = useState(tabs[0] ?? 'table');
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((r) => r.id === openId);
  const o = payload.owner;
  return (
    <div style={{ ['--dash' as string]: payload.dashboard.color }}>
      <div className="shared-top" style={embedded ? { padding: '24px 20px 0' } : undefined}>
        <div className="eyebrow">{payload.dashboard.icon} Project portfolio</div>
        <h1 style={embedded ? { fontSize: 38 } : undefined}>{payload.dashboard.name}</h1>
        {payload.dashboard.description && <p className="muted" style={{ fontSize: 18, maxWidth: '60ch' }}>{payload.dashboard.description}</p>}
        <div className="row" style={{ margin: '18px 0 26px' }}>
          {o.avatar_url ? <img className="avatar" src={o.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="avatar">{initials(o.name ?? '?')}</span>}
          <span>{o.username ? <a href={`/u/${o.username}`}>{o.name}</a> : o.name}</span>
          <span className="faint">· {rows.length} projects</span>
        </div>
        {tabs.length > 1 && (
          <div className="seg" role="tablist" aria-label="View" data-tabs>
            {tabs.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{LABEL[t]}</button>)}
          </div>
        )}
      </div>
      <div className="shared-top" style={{ paddingTop: 24, paddingBottom: embedded ? 24 : 80, ...(embedded ? { padding: '20px' } : {}) }}>
        {tab === 'table' && <ProTable fields={fields} rows={rows} storageKey={`shared-${token.slice(0, 12)}`} readOnly onOpen={setOpenId} />}
        {tab === 'gallery' && <Gallery fields={fields} rows={rows} onOpen={setOpenId} />}
        {tab === 'analytics' && <AnalyticsPanel data={analytics} showMoneyHint />}
        {!embedded && <p className="hint" style={{ marginTop: 60, textAlign: 'center' }}>Built with <Link href="/" style={{ textDecoration: 'underline' }}>{APP_NAME}</Link></p>}
      </div>
      {open && (
        <Overlay kind="drawer" onClose={() => setOpenId(null)} label="Project details">
          <div className="row between"><span className="eyebrow">Project</span><button className="btn btn-sm btn-icon" onClick={() => setOpenId(null)} aria-label="Close">✕</button></div>
          <div style={{ margin: '14px 0 22px' }}><TitleCell fields={fields} data={open.data} /></div>
          <DetailList fields={fields} row={open} />
        </Overlay>
      )}
    </div>
  );
}
