'use client';
import { useState } from 'react';
import { Cell, Pill, buildCtx, statusOf, thumbOf, type Row } from '@/features/projects/cells';
import { formatMoney } from '@/lib/currency';
import { dayNum, fmtDate, isoFromDay, MONTH_NAMES } from '@/lib/format';
import { currencyOf, roleField, titleOf, type FieldLike } from '@/lib/project-data';

export function Gallery({ fields, rows, onOpen }: { fields: FieldLike[]; rows: Row[]; onOpen: (id: string) => void }) {
  const ctx = buildCtx(fields, rows);
  const amount = roleField(fields, 'amount');
  const end = roleField(fields, 'end');
  const client = roleField(fields, 'client');
  if (!rows.length) return <div className="empty">No projects yet.</div>;
  return (
    <div className="gallery">
      {rows.map((r) => {
        const img = thumbOf(fields, r.data);
        const st = statusOf(fields, r.data);
        const t = titleOf(fields, r.data);
        return (
          <article className="g-item" key={r.id} tabIndex={0} onClick={() => onOpen(r.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(r.id)}>
            <div className="g-cover" style={img ? { backgroundImage: `url(${img})` } : undefined}>{!img && t.slice(0, 1).toUpperCase()}</div>
            <h3>{t}</h3>
            <div className="row between wrap muted" style={{ fontSize: 13.5 }}>
              <span>{client && typeof r.data[client.id] === 'string' ? String(r.data[client.id]) : end ? fmtDate(r.data[end.id] as string, true) : ''}</span>
              {st && <Pill value={st.value} color={st.color} />}
            </div>
            {amount && typeof r.data[amount.id] === 'number' && <div className="num" style={{ marginTop: 6 }}>{formatMoney(r.data[amount.id] as number, currencyOf(amount))}</div>}
          </article>
        );
      })}
      <span className="sr">{ctx.maxAmount}</span>
    </div>
  );
}

export function Board({ fields, rows, onOpen, onMove }: { fields: FieldLike[]; rows: Row[]; onOpen: (id: string) => void; onMove?: (rowId: string, fieldId: string, status: string) => void }) {
  const sf = roleField(fields, 'status');
  const [over, setOver] = useState<string | null>(null);
  if (!sf || !sf.options.choices?.length) return <div className="empty"><h2>No status field</h2><p>Add a Status field with choices to use the board.</p></div>;
  const lanes = [...sf.options.choices.map((c) => ({ value: c.value, color: c.color })), { value: '', color: '#8f8777' }];
  const amount = roleField(fields, 'amount');
  return (
    <div className="board">
      {lanes.map((l) => {
        const items = rows.filter((r) => ((r.data[sf.id] as string) ?? '') === l.value);
        if (!l.value && !items.length) return null;
        return (
          <div key={l.value || 'none'} className={`lane ${over === l.value ? 'over' : ''}`}
            onDragOver={(e) => { if (onMove) { e.preventDefault(); setOver(l.value); } }} onDragLeave={() => setOver(null)}
            onDrop={(e) => { setOver(null); const id = e.dataTransfer.getData('text/plain'); if (id && onMove && l.value) onMove(id, sf.id, l.value); }}>
            <h4><span className="pill" style={{ ['--c' as string]: l.color }}>{l.value || 'No status'}</span><span className="faint">{items.length}</span></h4>
            {items.map((r) => (
              <div className="bcard" key={r.id} draggable={!!onMove} onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)} onClick={() => onOpen(r.id)}>
                <b>{titleOf(fields, r.data)}</b>
                {amount && typeof r.data[amount.id] === 'number' && <span className="num muted" style={{ fontSize: 13 }}>{formatMoney(r.data[amount.id] as number, currencyOf(amount))}</span>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function Timeline({ fields, rows, onOpen }: { fields: FieldLike[]; rows: Row[]; onOpen: (id: string) => void }) {
  const ctx = buildCtx(fields, rows);
  const s = roleField(fields, 'start'), e = roleField(fields, 'end'), rg = roleField(fields, 'range');
  const items = rows.map((r) => {
    const range = rg ? (r.data[rg.id] as { start?: string; end?: string } | undefined) : undefined;
    const a = (s && (r.data[s.id] as string)) || range?.start, b = (e && (r.data[e.id] as string)) || range?.end;
    return { r, a: a || b, b: b || a };
  }).filter((x) => x.a).sort((x, y) => x.a!.localeCompare(y.a!));
  if (!items.length) return <div className="empty"><h2>No dates yet</h2><p>Projects with a start or end date appear here.</p></div>;
  const min = ctx.minDay, total = Math.max(1, ctx.maxDay - ctx.minDay);
  const ticks: { left: number; label: string }[] = [];
  const d0 = new Date(min * 86400000);
  for (let y = d0.getUTCFullYear(), m = d0.getUTCMonth(), i = 0; i < 40; i++, m++) {
    const day = Math.floor(Date.UTC(y + Math.floor(m / 12), m % 12, 1) / 86400000);
    if (day > ctx.maxDay) break;
    if (day >= min) ticks.push({ left: ((day - min) / total) * 100, label: `${MONTH_NAMES[m % 12]}${m % 12 === 0 ? ' ' + (y + Math.floor(m / 12)) : ''}` });
  }
  return (
    <div className="gantt">
      <div className="gantt-ticks"><div /><div>{ticks.map((t) => <span key={t.label + t.left} style={{ left: `${t.left}%` }}>{t.label}</span>)}</div></div>
      {items.map(({ r, a, b }) => {
        const st = statusOf(fields, r.data);
        const left = ((dayNum(a!) - min) / total) * 100;
        const width = Math.max(1, ((dayNum(b!) - dayNum(a!)) / total) * 100);
        return (
          <div className="gantt-row" key={r.id} onClick={() => onOpen(r.id)} role="button" tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && onOpen(r.id)}>
            <b style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titleOf(fields, r.data)}</b>
            <div className="gantt-track"><span className="gantt-bar" style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%`, ['--c' as string]: st?.color }} title={`${fmtDate(a)} → ${fmtDate(b)}`} /></div>
          </div>
        );
      })}
      <span className="sr">{isoFromDay(min)}</span>
    </div>
  );
}

/** Used by the drawer and the shared view: every value, labelled. */
export function DetailList({ fields, row }: { fields: FieldLike[]; row: Row }) {
  const ctx = buildCtx(fields, [row]);
  const rest = fields.filter((f) => f.role !== 'title');
  return (
    <dl className="dl">
      {rest.map((f) => {
        const v = row.data[f.id];
        if (v === undefined || v === null || v === '') return null;
        return (
          <div key={f.id} style={{ display: 'contents' }}>
            <dt>{f.name}</dt>
            <dd>{f.type === 'longtext' ? <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{String(v)}</p> : f.type === 'image' ? <img src={String(v)} alt="" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }} /> : <Cell field={f} row={row} ctx={ctx} />}</dd>
          </div>
        );
      })}
    </dl>
  );
}
