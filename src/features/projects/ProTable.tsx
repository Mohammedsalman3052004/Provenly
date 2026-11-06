'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Cell, buildCtx, statusOf, type Row } from '@/features/projects/cells';
import { currencyOf, valueText, type FieldLike } from '@/lib/project-data';
import { cn } from '@/lib/format';
import { parseMoneyInput } from '@/lib/currency';

type Sort = { id: string; dir: 1 | -1 };
interface Prefs { order: string[]; hidden: string[]; widths: Record<string, number>; density: 'comfortable' | 'compact'; saved: { name: string; q: string; status: string | null }[] }
const defaultWidth = (f: FieldLike) => (f.role === 'title' ? 320 : f.type === 'longtext' ? 280 : f.type === 'multiselect' ? 230 : f.type === 'url' ? 170 : f.role === 'start' || f.type === 'daterange' ? 200 : 160);

function sortKey(f: FieldLike, row: Row): number | string {
  const v = row.data[f.id];
  if (v == null) return '';
  if (typeof v === 'number') return v;
  if (f.type === 'daterange') return (v as { start?: string }).start ?? '';
  if (Array.isArray(v)) return v.join(' ').toLowerCase();
  return String(v).toLowerCase();
}

export function ProTable({ fields, rows, storageKey, readOnly, minimal, onOpen, onDelete, onCellEdit, toolbarExtra }: {
  fields: FieldLike[]; rows: Row[]; storageKey: string; readOnly?: boolean; minimal?: boolean;
  onOpen: (id: string) => void; onDelete?: (ids: string[]) => void;
  onCellEdit?: (rowId: string, fieldId: string, value: unknown) => void; toolbarExtra?: React.ReactNode;
}) {
  const key = `fb-table-${storageKey}`;
  const [prefs, setPrefs] = useState<Prefs>({ order: fields.map((f) => f.id), hidden: [], widths: {}, density: 'comfortable', saved: [] });
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sorts, setSorts] = useState<Sort[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [colMenu, setColMenu] = useState(false);
  const [edit, setEdit] = useState<{ row: string; field: string } | null>(null);
  const [scroll, setScroll] = useState({ top: 0, h: 640 });
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const s = localStorage.getItem(key); if (s) setPrefs((p) => ({ ...p, ...JSON.parse(s) })); } catch { /* ignore */ }
  }, [key]);
  const save = (p: Prefs) => { setPrefs(p); try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* ignore */ } };

  const ordered = useMemo(() => {
    const ids = [...prefs.order.filter((id) => fields.some((f) => f.id === id)), ...fields.filter((f) => !prefs.order.includes(f.id)).map((f) => f.id)];
    return ids.map((id) => fields.find((f) => f.id === id)!);
  }, [prefs.order, fields]);
  const cols = ordered.filter((f) => !prefs.hidden.includes(f.id));
  const widths = cols.map((f) => prefs.widths[f.id] ?? defaultWidth(f));
  const template = `${readOnly ? '' : '44px '}${widths.map((w) => `${w}px`).join(' ')}`;
  const ctx = useMemo(() => buildCtx(fields, rows), [fields, rows]);
  const statusField = fields.find((f) => f.role === 'status');
  const statusChoices = statusField?.options.choices ?? [];

  const view = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (statusFilter && statusOf(fields, r.data)?.value !== statusFilter) return false;
      if (!term) return true;
      return fields.some((f) => valueText(f, r.data[f.id]).toLowerCase().includes(term));
    });
    if (sorts.length) {
      list = [...list].sort((a, b) => {
        for (const s of sorts) {
          const f = fields.find((x) => x.id === s.id)!;
          const x = sortKey(f, a), y = sortKey(f, b);
          if (x === y) continue;
          if (x === '') return 1;
          if (y === '') return -1;
          return (x < y ? -1 : 1) * s.dir;
        }
        return 0;
      });
    }
    return list;
  }, [rows, q, statusFilter, sorts, fields]);

  const rowH = prefs.density === 'compact' ? 48 : 72;
  const start = Math.max(0, Math.floor(scroll.top / rowH) - 6);
  const end = Math.min(view.length, Math.ceil((scroll.top + scroll.h) / rowH) + 6);
  const slice = view.slice(start, end);

  useEffect(() => { if (wrap.current) setScroll((s) => ({ ...s, h: wrap.current!.clientHeight })); }, [view.length]);

  const toggleSort = (id: string, multi: boolean) =>
    setSorts((s) => {
      const cur = s.find((x) => x.id === id);
      const next: Sort | null = !cur ? { id, dir: 1 } : cur.dir === 1 ? { id, dir: -1 } : null;
      const rest = multi ? s.filter((x) => x.id !== id) : [];
      return next ? [...rest, next] : rest;
    });

  function startResize(e: React.PointerEvent, id: string, w: number) {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX;
    const move = (ev: PointerEvent) => setPrefs((p) => ({ ...p, widths: { ...p.widths, [id]: Math.max(90, w + ev.clientX - x0) } }));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setPrefs((p) => { try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* ignore */ } return p; }); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }
  function dropCol(target: string) {
    if (!dragCol || dragCol === target) return;
    const ids = ordered.map((f) => f.id).filter((id) => id !== dragCol);
    ids.splice(ids.indexOf(target), 0, dragCol);
    save({ ...prefs, order: ids });
    setDragCol(null); setOverCol(null);
  }

  function commit(row: Row, f: FieldLike, raw: string) {
    setEdit(null);
    let v: unknown = raw === '' ? undefined : raw;
    if (f.type === 'number') v = raw === '' || Number.isNaN(Number(raw)) ? undefined : Number(raw);
    if (f.type === 'currency') v = parseMoneyInput(raw, currencyOf(f)) ?? undefined;
    if (v !== row.data[f.id]) onCellEdit?.(row.id, f.id, v);
  }

  const allSel = view.length > 0 && view.every((r) => sel.has(r.id));
  const editable = (f: FieldLike) => !readOnly && !!onCellEdit && ['text', 'number', 'select', 'status', 'person', 'currency'].includes(f.type);

  return (
    <div className={prefs.density === 'compact' ? 'compact' : ''}>
      <div className="tbl-tools" hidden={minimal}>
        <div className="search"><input className="input" placeholder="Search projects…" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {statusChoices.length > 0 && (
          <div className="seg" role="group" aria-label="Filter by status">
            <button aria-pressed={statusFilter === null} onClick={() => setStatusFilter(null)}>All</button>
            {statusChoices.map((c) => <button key={c.value} aria-pressed={statusFilter === c.value} onClick={() => setStatusFilter(statusFilter === c.value ? null : c.value)}>{c.value}</button>)}
          </div>
        )}
        <span className="grow" />
        {prefs.saved.length > 0 && (
          <select className="select" style={{ width: 150, height: 34, borderRadius: 999 }} aria-label="Saved filters" value="" onChange={(e) => { const s = prefs.saved[Number(e.target.value)]; if (s) { setQ(s.q); setStatusFilter(s.status); } }}>
            <option value="">Saved filters</option>
            {prefs.saved.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
          </select>
        )}
        {(q || statusFilter) && <button className="btn btn-sm" onClick={() => { const name = window.prompt('Name this filter'); if (name) save({ ...prefs, saved: [...prefs.saved.filter((s) => s.name !== name), { name, q, status: statusFilter }] }); }}>Save filter</button>}
        <button className="btn btn-sm" onClick={() => save({ ...prefs, density: prefs.density === 'compact' ? 'comfortable' : 'compact' })} aria-pressed={prefs.density === 'compact'}>{prefs.density === 'compact' ? 'Compact' : 'Comfortable'}</button>
        <div className="menu-wrap">
          <button className="btn btn-sm" onClick={() => setColMenu((v) => !v)} aria-expanded={colMenu}>Columns</button>
          {colMenu && (
            <div className="menu colmenu">
              {ordered.map((f) => (
                <label key={f.id} className="check" style={{ padding: '6px 10px', width: '100%' }}>
                  <input type="checkbox" checked={!prefs.hidden.includes(f.id)} disabled={f.role === 'title'} onChange={(e) => save({ ...prefs, hidden: e.target.checked ? prefs.hidden.filter((h) => h !== f.id) : [...prefs.hidden, f.id] })} /> {f.name}
                </label>
              ))}
            </div>
          )}
        </div>
        {toolbarExtra}
      </div>

      {sel.size > 0 && (
        <div className="row" style={{ marginBottom: 10 }}>
          <b>{sel.size} selected</b>
          {onDelete && <button className="btn btn-sm btn-danger" onClick={() => { onDelete([...sel]); setSel(new Set()); }}>Delete</button>}
          <button className="btn btn-sm" onClick={() => setSel(new Set())}>Clear</button>
        </div>
      )}

      <div className="grid-wrap" ref={wrap} onScroll={(e) => setScroll({ top: e.currentTarget.scrollTop, h: e.currentTarget.clientHeight })} role="table" aria-label="Projects" aria-rowcount={view.length}>
        <div className="g-head" role="row" style={{ gridTemplateColumns: template }}>
          {!readOnly && <div className="g-h" style={{ justifyContent: 'center' }}><input type="checkbox" aria-label="Select all" checked={allSel} onChange={(e) => setSel(e.target.checked ? new Set(view.map((r) => r.id)) : new Set())} style={{ accentColor: 'var(--accent)' }} /></div>}
          {cols.map((f, i) => {
            const s = sorts.find((x) => x.id === f.id);
            return (
              <div key={f.id} role="columnheader" className={cn('g-h', overCol === f.id && 'drag-over')} draggable
                aria-sort={s ? (s.dir === 1 ? 'ascending' : 'descending') : 'none'}
                onClick={(e) => toggleSort(f.id, e.shiftKey)}
                onDragStart={() => setDragCol(f.id)} onDragOver={(e) => { e.preventDefault(); setOverCol(f.id); }} onDrop={() => dropCol(f.id)} onDragEnd={() => { setDragCol(null); setOverCol(null); }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                {s && <span style={{ color: 'var(--accent)' }}>{s.dir === 1 ? '↑' : '↓'}{sorts.length > 1 ? sorts.indexOf(s) + 1 : ''}</span>}
                <span className="rs" onPointerDown={(e) => startResize(e, f.id, widths[i])} onClick={(e) => e.stopPropagation()} />
              </div>
            );
          })}
        </div>
        <div style={{ height: start * rowH }} />
        {slice.map((row) => (
          <div key={row.id} role="row" className={cn('g-row', sel.has(row.id) && 'sel')} style={{ gridTemplateColumns: template, height: rowH }}
            onClick={() => onOpen(row.id)}>
            {!readOnly && <div className="g-c" style={{ justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label="Select row" checked={sel.has(row.id)} style={{ accentColor: 'var(--accent)' }} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(row.id); else n.delete(row.id); return n; })} /></div>}
            {cols.map((f) => {
              const editing = edit?.row === row.id && edit.field === f.id;
              return (
                <div key={f.id} role="cell" className="g-c" onDoubleClick={(e) => { if (editable(f)) { e.stopPropagation(); setEdit({ row: row.id, field: f.id }); } }} onClick={editing ? (e) => e.stopPropagation() : undefined}>
                  {editing ? (
                    f.type === 'select' || f.type === 'status' ? (
                      <select className="select" style={{ height: 32 }} autoFocus defaultValue={String(row.data[f.id] ?? '')} onBlur={(e) => commit(row, f, e.target.value)} onChange={(e) => commit(row, f, e.target.value)}>
                        <option value="">—</option>{(f.options.choices ?? []).map((c) => <option key={c.value}>{c.value}</option>)}
                      </select>
                    ) : (
                      <input className="input" style={{ height: 32 }} autoFocus defaultValue={f.type === 'currency' && typeof row.data[f.id] === 'number' ? String((row.data[f.id] as number) / 100) : String(row.data[f.id] ?? '')}
                        onBlur={(e) => commit(row, f, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEdit(null); }} />
                    )
                  ) : <Cell field={f} row={row} ctx={ctx} />}
                </div>
              );
            })}
            {!readOnly && (
              <div className="g-act" onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-sm btn-icon" title="Open" aria-label="Open" onClick={() => onOpen(row.id)}>↗</button>
                {onDelete && <button className="btn btn-sm btn-icon" title="Delete" aria-label="Delete" onClick={() => onDelete([row.id])}>✕</button>}
              </div>
            )}
          </div>
        ))}
        <div style={{ height: Math.max(0, (view.length - end) * rowH) }} />
        {view.length === 0 && <div className="empty" style={{ padding: 50 }}>No projects match.</div>}
      </div>
      <p className="hint" hidden={minimal}>{view.length} of {rows.length} shown · click a header to sort (Shift for multi-sort) · drag headers to reorder{!readOnly && ' · double-click a cell to edit'}</p>
    </div>
  );
}
