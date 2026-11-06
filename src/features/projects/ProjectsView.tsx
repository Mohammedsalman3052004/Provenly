'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ProTable } from '@/features/projects/ProTable';
import { Board, Gallery, Timeline } from '@/features/projects/Views';
import { ProjectDrawer } from '@/features/projects/ProjectDrawer';
import { deleteProjects, restoreProjects, setProjectValue } from '@/features/projects/actions';
import { toCsv } from '@/lib/csv';
import { valueCsv, valueText, titleOf } from '@/lib/project-data';
import { fmtDate, todayISO } from '@/lib/format';
import type { Field, Project } from '@/types';

type View = 'table' | 'gallery' | 'board' | 'timeline';
const VIEWS: { id: View; label: string }[] = [
  { id: 'table', label: 'Table' }, { id: 'gallery', label: 'Gallery' }, { id: 'board', label: 'Board' }, { id: 'timeline', label: 'Timeline' },
];

export function ProjectsView({ dashboardId, dashboardName, fields, projects, userId }: { dashboardId: string; dashboardName: string; fields: Field[]; projects: Project[]; userId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [view, setView] = useState<View>('table');
  const [rows, setRows] = useState(() => projects.map((p) => ({ id: p.id, data: p.data })));
  const [openId, setOpenId] = useState<string | null>(params.get('open'));
  useEffect(() => { setRows(projects.map((p) => ({ id: p.id, data: p.data }))); }, [projects]);
  useEffect(() => { const v = localStorage.getItem(`fb-view-${dashboardId}`) as View | null; if (v) setView(v); }, [dashboardId]);
  const chooseView = (v: View) => { setView(v); localStorage.setItem(`fb-view-${dashboardId}`, v); };

  const suggestions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const f of fields) {
      if (f.type !== 'person' && f.type !== 'multiselect') continue;
      const s = new Set<string>();
      for (const r of rows) { const v = r.data[f.id]; if (typeof v === 'string') s.add(v); else if (Array.isArray(v)) v.forEach((x) => typeof x === 'string' && s.add(x)); }
      out[f.id] = [...s].slice(0, 60);
    }
    return out;
  }, [fields, rows]);

  const remove = useCallback(async (ids: string[]) => {
    const before = rows;
    setRows((r) => r.filter((x) => !ids.includes(x.id)));
    const res = await deleteProjects(ids);
    if (!res.ok) { setRows(before); toast(res.error, { kind: 'err' }); return; }
    toast(`Deleted ${ids.length} project${ids.length > 1 ? 's' : ''}`, { action: { label: 'Undo', run: async () => { await restoreProjects(ids); router.refresh(); } } });
    router.refresh();
  }, [rows, router, toast]);

  const edit = useCallback(async (rowId: string, fieldId: string, value: unknown) => {
    const before = rows;
    setRows((r) => r.map((x) => { if (x.id !== rowId) return x; const d = { ...x.data }; if (value === undefined) delete d[fieldId]; else d[fieldId] = value; return { ...x, data: d }; }));
    const res = await setProjectValue(rowId, fieldId, value);
    if (!res.ok) { setRows(before); toast(res.error, { kind: 'err' }); } else router.refresh();
  }, [rows, router, toast]);

  function exportCsv() {
    const header = fields.map((f) => f.name);
    const body = rows.map((r) => fields.map((f) => valueCsv(f, r.data[f.id])));
    const blob = new Blob([toCsv([header, ...body])], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${dashboardName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const open = rows.find((r) => r.id === openId) ?? null;
  const fieldsKey = `${dashboardId}`;

  if (!rows.length)
    return (
      <div className="empty">
        <div className="glyph">◆</div>
        <h2>No projects yet</h2>
        <p>Add your first project, or import a CSV you already have.</p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
          <Link className="btn btn-primary" href={`/app/d/${dashboardId}/add`}>Add a project</Link>
          <Link className="btn" href={`/app/d/${dashboardId}/import`}>Import CSV</Link>
        </div>
      </div>
    );

  return (
    <>
      <div className="row between wrap" style={{ marginBottom: 18 }}>
        <div className="seg" role="group" aria-label="View">
          {VIEWS.map((v) => <button key={v.id} aria-pressed={view === v.id} onClick={() => chooseView(v.id)}>{v.label}</button>)}
        </div>
        <div className="row gap-sm">
          <Link className="btn btn-sm" href={`/app/d/${dashboardId}/import`}>Import</Link>
          <button className="btn btn-sm" onClick={exportCsv}>Export CSV</button>
          <button className="btn btn-sm" onClick={() => window.print()}>Export PDF</button>
          <Link className="btn btn-sm btn-primary" href={`/app/d/${dashboardId}/add`}>+ Add</Link>
        </div>
      </div>

      {view === 'table' && <ProTable fields={fields} rows={rows} storageKey={fieldsKey} onOpen={setOpenId} onDelete={remove} onCellEdit={edit} />}
      {view === 'gallery' && <Gallery fields={fields} rows={rows} onOpen={setOpenId} />}
      {view === 'board' && <Board fields={fields} rows={rows} onOpen={setOpenId} onMove={(id, fid, v) => void edit(id, fid, v)} />}
      {view === 'timeline' && <Timeline fields={fields} rows={rows} onOpen={setOpenId} />}

      {open && <ProjectDrawer dashboardId={dashboardId} fields={fields} row={open} userId={userId} suggestions={suggestions} onClose={() => setOpenId(null)} onDelete={(id) => void remove([id])} />}

      <div className="print-sheet" aria-hidden>
        <h1>{dashboardName}</h1>
        <div>Exported {fmtDate(todayISO())} · {rows.length} projects</div>
        <table>
          <thead><tr>{fields.map((f) => <th key={f.id}>{f.name}</th>)}</tr></thead>
          <tbody>{rows.map((r) => <tr key={r.id}>{fields.map((f) => <td key={f.id}>{f.type === 'image' ? '' : valueText(f, r.data[f.id])}</td>)}</tr>)}</tbody>
        </table>
        <span className="sr">{titleOf(fields, rows[0]?.data ?? {})}</span>
      </div>
    </>
  );
}
