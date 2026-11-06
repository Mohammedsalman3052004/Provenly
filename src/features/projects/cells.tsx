import { formatMoney } from '@/lib/currency';
import { dayNum, domainOf, faviconUrl, fmtDate, initials } from '@/lib/format';
import { currencyOf, roleField, titleOf, type FieldLike } from '@/lib/project-data';
import type { ProjectData } from '@/types';

export interface Row { id: string; data: ProjectData }
export interface Ctx { fields: FieldLike[]; maxAmount: number; minDay: number; maxDay: number }

export function buildCtx(fields: FieldLike[], rows: Row[]): Ctx {
  const a = roleField(fields, 'amount');
  const s = roleField(fields, 'start'), e = roleField(fields, 'end'), r = roleField(fields, 'range');
  let maxAmount = 1, minDay = Infinity, maxDay = -Infinity;
  for (const row of rows) {
    if (a && typeof row.data[a.id] === 'number') maxAmount = Math.max(maxAmount, row.data[a.id] as number);
    const range = r ? (row.data[r.id] as { start?: string; end?: string } | undefined) : undefined;
    for (const v of [s && row.data[s.id], e && row.data[e.id], range?.start, range?.end]) {
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { const d = dayNum(v); minDay = Math.min(minDay, d); maxDay = Math.max(maxDay, d); }
    }
  }
  return { fields, maxAmount, minDay: Number.isFinite(minDay) ? minDay : 0, maxDay: Number.isFinite(maxDay) ? maxDay : 1 };
}

export function thumbOf(fields: FieldLike[], data: ProjectData): string | null {
  const f = roleField(fields, 'thumbnail') ?? fields.find((x) => x.type === 'image');
  const v = f ? data[f.id] : null;
  return typeof v === 'string' && v ? v : null;
}
export function urlOf(fields: FieldLike[], data: ProjectData): string | null {
  const f = roleField(fields, 'url') ?? fields.find((x) => x.type === 'url');
  const v = f ? data[f.id] : null;
  return typeof v === 'string' && v ? v : null;
}
export function statusOf(fields: FieldLike[], data: ProjectData): { value: string; color: string } | null {
  const f = roleField(fields, 'status');
  const v = f ? data[f.id] : null;
  if (typeof v !== 'string' || !v) return null;
  return { value: v, color: f!.options.choices?.find((c) => c.value === v)?.color ?? '#8f8777' };
}

export function Thumb({ fields, data }: { fields: FieldLike[]; data: ProjectData }) {
  const img = thumbOf(fields, data);
  const t = titleOf(fields, data);
  return img ? <img className="thumb" src={img} alt="" loading="lazy" /> : <span className="thumb" aria-hidden>{t.slice(0, 1).toUpperCase()}</span>;
}

export function Pill({ value, color }: { value: string; color: string }) {
  return <span className="pill" style={{ ['--c' as string]: color }}>{value}</span>;
}

function Span({ start, end, ctx }: { start?: string; end?: string; ctx: Ctx }) {
  const total = Math.max(1, ctx.maxDay - ctx.minDay);
  const s = start ? dayNum(start) : null, e = end ? dayNum(end) : null;
  const a = s ?? e ?? 0, b = e ?? s ?? 0;
  const left = ((a - ctx.minDay) / total) * 100;
  const width = Math.max(2, ((b - a) / total) * 100);
  return (
    <>
      <span className="num" style={{ fontSize: 13 }}>{fmtDate(start, false)} → {fmtDate(end, false)}</span>
      <span className="tl" aria-hidden><i style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} /></span>
    </>
  );
}

export function TitleCell({ fields, data }: { fields: FieldLike[]; data: ProjectData }) {
  const url = urlOf(fields, data);
  const fav = url ? faviconUrl(url) : null;
  return (
    <div className="title-cell">
      <Thumb fields={fields} data={data} />
      <div style={{ minWidth: 0 }}>
        <b>{titleOf(fields, data)}</b>
        {url && <small>{fav && <img className="fav" src={fav} alt="" loading="lazy" />}{domainOf(url)}</small>}
      </div>
    </div>
  );
}

export function Cell({ field: f, row, ctx }: { field: FieldLike; row: Row; ctx: Ctx }) {
  const v = row.data[f.id];
  if (f.role === 'title') return <TitleCell fields={ctx.fields} data={row.data} />;
  if (v === undefined || v === null || v === '') return <span className="faint">—</span>;
  const cur = currencyOf(f);

  if (f.role === 'amount' && typeof v === 'number')
    return <div className="g-c col" style={{ padding: 0 }}><span className="num">{formatMoney(v, cur)}</span><span className="minibar"><i style={{ width: `${(v / ctx.maxAmount) * 100}%` }} /></span></div>;
  if (f.role === 'profit' && typeof v === 'number') {
    const a = roleField(ctx.fields, 'amount');
    const amt = a ? (row.data[a.id] as number | undefined) : undefined;
    const ratio = amt && amt > 0 ? Math.max(0, Math.min(1, v / amt)) : null;
    return <div className="g-c col" style={{ padding: 0 }}><span className="num" style={{ color: v < 0 ? 'var(--bad)' : undefined }}>{formatMoney(v, cur)}</span>{ratio !== null && <span className="minibar profit"><i style={{ width: `${ratio * 100}%` }} /></span>}</div>;
  }
  if (f.role === 'start' && typeof v === 'string') {
    const e = roleField(ctx.fields, 'end');
    const end = e ? (row.data[e.id] as string | undefined) : undefined;
    if (end) return <div className="g-c col" style={{ padding: 0 }}><Span start={v} end={end} ctx={ctx} /></div>;
  }

  switch (f.type) {
    case 'currency':
    case 'formula': return typeof v === 'number' ? <span className="num">{formatMoney(v, cur)}</span> : null;
    case 'number': return <span className="num">{String(v)}</span>;
    case 'date': return <span className="num" style={{ fontSize: 13 }}>{fmtDate(String(v))}</span>;
    case 'daterange': { const r = v as { start?: string; end?: string }; return <div className="g-c col" style={{ padding: 0 }}><Span start={r.start} end={r.end} ctx={ctx} /></div>; }
    case 'status': { const c = f.options.choices?.find((x) => x.value === v)?.color ?? '#8f8777'; return <Pill value={String(v)} color={c} />; }
    case 'select': return <span className="chip">{String(v)}</span>;
    case 'multiselect': { const a = Array.isArray(v) ? (v as string[]) : []; return <span className="row gap-sm" style={{ overflow: 'hidden' }}>{a.slice(0, 3).map((t) => <span className="chip" key={t}>{t}</span>)}{a.length > 3 && <span className="faint">+{a.length - 3}</span>}</span>; }
    case 'person': return <span className="row gap-sm"><span className="avatar">{initials(String(v))}</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(v)}</span></span>;
    case 'url': return <a href={String(v)} target="_blank" rel="noopener noreferrer" className="muted" style={{ textDecoration: 'underline', textDecorationColor: 'var(--line2)' }} onClick={(e) => e.stopPropagation()}>{domainOf(String(v))} ↗</a>;
    case 'checkbox': return <span style={{ color: v ? 'var(--good)' : 'var(--faint)' }}>{v ? '✓' : '—'}</span>;
    case 'rating': return <span className="stars" aria-label={`${v} of 5`}>{'★'.repeat(Number(v))}<s>{'★'.repeat(5 - Number(v))}</s></span>;
    case 'image': return <img className="thumb" style={{ width: 36, height: 36 }} src={String(v)} alt="" loading="lazy" />;
    default: return <span className="muted">{String(v)}</span>;
  }
}
