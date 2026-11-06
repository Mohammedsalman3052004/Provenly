import { formatMoney, minorToInput } from '@/lib/currency';
import { fmtDate } from '@/lib/format';
import type { Field, FieldRole, FormulaDef, ProjectData } from '@/types';

export type FieldLike = Pick<Field, 'id' | 'name' | 'type' | 'role' | 'position' | 'options'>;

export function activeFields<T extends { position: number }>(fields: (T & { archived_at?: string | null })[]): T[] {
  return fields.filter((f) => !f.archived_at).sort((a, b) => a.position - b.position);
}
export function roleField<T extends FieldLike>(fields: T[], role: FieldRole): T | undefined {
  return fields.find((f) => f.role === role);
}
export function currencyOf(f: FieldLike | undefined, fallback = 'USD'): string {
  return f?.options?.currency ?? fallback;
}

export function titleOf(fields: FieldLike[], data: ProjectData): string {
  const f = roleField(fields, 'title') ?? fields.find((x) => x.type === 'text');
  const v = f ? data[f.id] : null;
  return typeof v === 'string' && v.trim() ? v : 'Untitled';
}

export function formulaValue(def: FormulaDef, data: ProjectData): number | null {
  const a = data[def.a];
  const b = data[def.b];
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  if (def.op === 'subtract') return a - b;
  if (def.op === 'add') return a + b;
  return Math.round(a * b);
}

/** Fill every formula field the user has not overridden. Authoritative copy runs on the server. */
export function computeFormulas(fields: FieldLike[], data: ProjectData): ProjectData {
  const out = { ...data };
  for (const f of fields) {
    if (f.type !== 'formula' || !f.options.formula) continue;
    if (typeof out[f.id] === 'number') continue;
    const v = formulaValue(f.options.formula, out);
    if (v !== null) out[f.id] = v;
    else delete out[f.id];
  }
  return out;
}

export function isDoneValue(f: FieldLike | undefined, value: unknown): boolean {
  if (!f || typeof value !== 'string') return false;
  const c = f.options.choices?.find((x) => x.value === value);
  if (c) return !!c.done;
  return /^(done|complete|completed|delivered|live|shipped|launched|released)$/i.test(value);
}

/** Plain-text rendering of any value (search, CSV, print). */
export function valueText(f: FieldLike, v: unknown): string {
  if (v == null || v === '') return '';
  switch (f.type) {
    case 'currency':
    case 'formula':
      return typeof v === 'number' ? formatMoney(v, currencyOf(f)) : '';
    case 'date': return fmtDate(String(v));
    case 'daterange': {
      const r = v as { start?: string; end?: string };
      return `${fmtDate(r.start)} → ${fmtDate(r.end)}`;
    }
    case 'multiselect': return Array.isArray(v) ? v.join(', ') : '';
    case 'checkbox': return v ? 'Yes' : 'No';
    case 'rating': return `${v}/5`;
    default: return String(v);
  }
}

/** Raw-ish value for CSV export (money as decimals so spreadsheets can sum it). */
export function valueCsv(f: FieldLike, v: unknown): string {
  if ((f.type === 'currency' || f.type === 'formula') && typeof v === 'number') return minorToInput(v, currencyOf(f));
  if (f.type === 'date') return String(v ?? '');
  return valueText(f, v);
}

export const STATUS_COLORS = { planned: '#8aa0c8', progress: '#3781fc', done: '#34d399', hold: '#f59e0b' };
export const DEFAULT_STATUS_CHOICES = [
  { value: 'Planned', color: STATUS_COLORS.planned },
  { value: 'In progress', color: STATUS_COLORS.progress },
  { value: 'Completed', color: STATUS_COLORS.done, done: true },
  { value: 'On hold', color: STATUS_COLORS.hold },
];
