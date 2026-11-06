import { convertMinor } from '@/lib/currency';
import { dayNum, isoFromDay, MONTH_NAMES, todayISO } from '@/lib/format';
import { currencyOf, isDoneValue, roleField, titleOf, type FieldLike } from '@/lib/project-data';
import type { ProjectData } from '@/types';

export type Period = 'week' | 'month' | 'quarter' | 'year';
export const PERIODS: Period[] = ['week', 'month', 'quarter', 'year'];
export const PERIOD_LABEL: Record<Period, string> = { week: 'Weekly', month: 'Monthly', quarter: 'Quarterly', year: 'Yearly' };
const THIS_LABEL: Record<Period, string> = { week: 'this week', month: 'this month', quarter: 'this quarter', year: 'this year' };

export interface NProject {
  id: string;
  dashboardId?: string;
  title: string;
  start: string | null;
  end: string | null;
  due: string | null;
  amount: number | null;
  spent: number | null;
  profit: number | null;
  client: string | null;
  tags: string[];
  status: string | null;
  done: boolean;
}
export interface Flags { amount: boolean; spent: boolean; profit: boolean; due: boolean; client: boolean; tags: boolean; status: boolean }

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const isoOrNull = (v: unknown): string | null => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Turn schema-driven rows into analytics-ready rows. Only uses fields it is given (hidden fields never appear). */
export function normalize(
  fields: FieldLike[],
  projects: { id: string; data: ProjectData }[],
  opts: { baseCurrency?: string; dashboardId?: string } = {},
): { items: NProject[]; flags: Flags; currency: string } {
  const F = (r: Parameters<typeof roleField>[1]) => roleField(fields, r);
  const amountF = F('amount'), spentF = F('spent'), profitF = F('profit');
  const startF = F('start'), endF = F('end'), rangeF = F('range'), dueF = F('due');
  const clientF = F('client'), tagsF = F('tags'), statusF = F('status');
  const nativeCur = currencyOf(amountF ?? spentF ?? profitF);
  const target = opts.baseCurrency ?? nativeCur;
  const money = (f: FieldLike | undefined, d: ProjectData): number | null => {
    if (!f) return null;
    const v = num(d[f.id]);
    return v === null ? null : convertMinor(v, currencyOf(f, nativeCur), target);
  };
  const today = todayISO();

  const items = projects.map((p): NProject => {
    const d = p.data;
    const range = rangeF ? (d[rangeF.id] as { start?: string; end?: string } | undefined) : undefined;
    const start = isoOrNull(startF ? d[startF.id] : undefined) ?? isoOrNull(range?.start);
    const end = isoOrNull(endF ? d[endF.id] : undefined) ?? isoOrNull(range?.end);
    const amount = money(amountF, d);
    const spent = money(spentF, d);
    let profit = money(profitF, d);
    if (profit === null && amount !== null && spent !== null) profit = amount - spent;
    const status = statusF ? str(d[statusF.id]) : null;
    const done = statusF ? isDoneValue(statusF, status) : end !== null && end <= today;
    const tagsRaw = tagsF ? d[tagsF.id] : null;
    return {
      id: p.id,
      dashboardId: opts.dashboardId,
      title: titleOf(fields, d),
      start, end,
      due: isoOrNull(dueF ? d[dueF.id] : undefined),
      amount, spent, profit,
      client: clientF ? str(d[clientF.id]) : null,
      tags: Array.isArray(tagsRaw) ? tagsRaw.filter((x): x is string => typeof x === 'string') : str(tagsRaw) ? [String(tagsRaw)] : [],
      status, done,
    };
  });

  const flags: Flags = {
    amount: !!amountF, spent: !!spentF, profit: !!profitF || (!!amountF && !!spentF),
    due: !!dueF, client: !!clientF, tags: !!tagsF, status: !!statusF,
  };
  return { items, flags, currency: target };
}

// ---------- calendar helpers (UTC day numbers) ----------
interface Bucket { label: string; from: number; to: number }
const monthStart = (y: number, m: number) => Math.floor(Date.UTC(y, m, 1) / 86400000);
const weekIndex = (day: number) => Math.floor((day + 3) / 7); // Monday-based

export function bucketsFor(period: Period, today: number): Bucket[] {
  const t = new Date(today * 86400000);
  const y = t.getUTCFullYear(), m = t.getUTCMonth();
  const out: Bucket[] = [];
  if (period === 'week') {
    const monday = weekIndex(today) * 7 - 3;
    for (let i = 11; i >= 0; i--) {
      const from = monday - i * 7;
      const dt = new Date(from * 86400000);
      out.push({ label: `${dt.getUTCDate()} ${MONTH_NAMES[dt.getUTCMonth()]}`, from, to: from + 6 });
    }
  } else if (period === 'month') {
    for (let i = 11; i >= 0; i--) {
      const mm = m - i;
      const yy = y + Math.floor(mm / 12);
      const mi = ((mm % 12) + 12) % 12;
      out.push({ label: MONTH_NAMES[mi], from: monthStart(yy, mi), to: monthStart(yy, mi + 1) - 1 });
    }
  } else if (period === 'quarter') {
    const q = Math.floor(m / 3);
    for (let i = 7; i >= 0; i--) {
      const qq = q - i;
      const yy = y + Math.floor(qq / 4);
      const qi = ((qq % 4) + 4) % 4;
      out.push({ label: `Q${qi + 1} ${String(yy).slice(2)}`, from: monthStart(yy, qi * 3), to: monthStart(yy, qi * 3 + 3) - 1 });
    }
  } else {
    for (let i = 4; i >= 0; i--) out.push({ label: String(y - i), from: monthStart(y - i, 0), to: monthStart(y - i + 1, 0) - 1 });
  }
  return out;
}

export interface Kpi { value: number | null; prev: number | null; delta: number | null; spark: number[] }
export interface Slice { label: string; value: number; count: number }
export interface SeriesPoint { label: string; revenue: number; expenses: number; profit: number; completed: number; started: number }
export interface AnalyticsResult {
  period: Period;
  thisLabel: string;
  currency: string;
  flags: Flags;
  total: number;
  kpis: { revenue: Kpi; expenses: Kpi; profit: Kpi; margin: Kpi; started: Kpi; completed: Kpi; avgValue: Kpi; avgDuration: Kpi; onTime: Kpi };
  series: SeriesPoint[];
  heatmap: { date: string; count: number }[];
  unit: 'money' | 'count';
  breakdowns: { client: Slice[]; tags: Slice[]; status: Slice[] };
  highlights: { bestMonth: { label: string; value: number } | null; topClient: { label: string; value: number } | null; streakCurrent: number; streakLongest: number };
}

const recordDate = (p: NProject) => p.end ?? p.start;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function kpi(series: (number | null)[]): Kpi {
  const spark = series.map((x) => x ?? 0);
  const value = series[series.length - 1] ?? null;
  const prev = series.length > 1 ? series[series.length - 2] : null;
  const delta = value !== null && prev !== null && prev !== 0 ? ((value - prev) / Math.abs(prev)) * 100 : null;
  return { value, prev, delta, spark };
}

function slices(map: Map<string, { value: number; count: number }>, max = 6): Slice[] {
  const all = [...map.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.value - a.value || b.count - a.count);
  if (all.length <= max) return all;
  const head = all.slice(0, max - 1);
  const rest = all.slice(max - 1);
  return [...head, { label: 'Other', value: sum(rest.map((r) => r.value)), count: sum(rest.map((r) => r.count)) }];
}

export function computeAnalytics(items: NProject[], flags: Flags, currency: string, period: Period, todayIso = todayISO()): AnalyticsResult {
  const today = dayNum(todayIso);
  const buckets = bucketsFor(period, today);
  const idx = (iso: string | null): number => {
    if (!iso) return -1;
    const d = dayNum(iso);
    return buckets.findIndex((b) => d >= b.from && d <= b.to);
  };
  const n = buckets.length;
  const zeros = () => Array<number>(n).fill(0);
  const revenue = zeros(), expenses = zeros(), profit = zeros(), started = zeros(), completed = zeros(), valueN = zeros(), durN = zeros(), durSum = zeros(), dueN = zeros(), onTime = zeros();
  const inWindow: NProject[] = [];

  for (const p of items) {
    const rd = recordDate(p);
    const bi = idx(rd);
    if (bi >= 0) {
      inWindow.push(p);
      if (p.amount !== null) { revenue[bi] += p.amount; valueN[bi]++; }
      if (p.spent !== null) expenses[bi] += p.spent;
      if (p.profit !== null) profit[bi] += p.profit;
    }
    const si = idx(p.start);
    if (si >= 0) started[si]++;
    if (p.done) {
      const ci = idx(p.end ?? p.start);
      if (ci >= 0) {
        completed[ci]++;
        if (p.start && p.end) { durN[ci]++; durSum[ci] += Math.max(0, dayNum(p.end) - dayNum(p.start)); }
        if (p.due && p.end) { dueN[ci]++; if (p.end <= p.due) onTime[ci]++; }
      }
    }
  }

  const margin = revenue.map((r, i) => (r > 0 ? (profit[i] / r) * 100 : null));
  const avgValue = revenue.map((r, i) => (valueN[i] ? r / valueN[i] : null));
  const avgDur = durSum.map((s, i) => (durN[i] ? s / durN[i] : null));
  const onTimePct = onTime.map((o, i) => (dueN[i] ? (o / dueN[i]) * 100 : null));

  // breakdowns over the visible window
  const money = flags.amount;
  const tally = (key: (p: NProject) => string[]) => {
    const m = new Map<string, { value: number; count: number }>();
    for (const p of inWindow) for (const k of key(p)) {
      const cur = m.get(k) ?? { value: 0, count: 0 };
      cur.count++;
      cur.value += money ? p.amount ?? 0 : 1;
      m.set(k, cur);
    }
    return m;
  };
  const clientMap = tally((p) => (p.client ? [p.client] : []));
  const breakdowns = {
    client: slices(clientMap),
    tags: slices(tally((p) => p.tags)),
    status: slices(tally((p) => (p.status ? [p.status] : []))),
  };

  // heatmap: last 53 weeks of delivered projects
  const counts = new Map<string, number>();
  for (const p of items) {
    const rd = p.done || !flags.status ? recordDate(p) : null;
    if (rd) counts.set(rd, (counts.get(rd) ?? 0) + 1);
  }
  const heatStart = weekIndex(today) * 7 - 3 - 52 * 7;
  const heatmap: { date: string; count: number }[] = [];
  for (let d = heatStart; d <= today; d++) heatmap.push({ date: isoFromDay(d), count: counts.get(isoFromDay(d)) ?? 0 });

  // highlights: best month, top client, weekly streaks (all time)
  const monthTotals = new Map<string, number>();
  const weeks = new Set<number>();
  for (const p of items) {
    const rd = recordDate(p);
    if (!rd) continue;
    const key = rd.slice(0, 7);
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + (money ? p.amount ?? 0 : 1));
    if (p.done || !flags.status) weeks.add(weekIndex(dayNum(rd)));
  }
  let best: { label: string; value: number } | null = null;
  for (const [k, v] of monthTotals) if (!best || v > best.value) best = { label: `${MONTH_NAMES[Number(k.slice(5)) - 1]} ${k.slice(0, 4)}`, value: v };
  const top = clientMap.size ? [...clientMap.entries()].sort((a, b) => b[1].value - a[1].value)[0] : null;
  const sorted = [...weeks].sort((a, b) => a - b);
  let longest = 0, run = 0, prevW = -999;
  for (const w of sorted) { run = w === prevW + 1 ? run + 1 : 1; longest = Math.max(longest, run); prevW = w; }
  let cur = 0;
  let w = weekIndex(today);
  if (!weeks.has(w)) w--;
  while (weeks.has(w)) { cur++; w--; }

  return {
    period, thisLabel: THIS_LABEL[period], currency, flags, total: items.length,
    kpis: {
      revenue: kpi(revenue), expenses: kpi(expenses), profit: kpi(profit), margin: kpi(margin),
      started: kpi(started), completed: kpi(completed), avgValue: kpi(avgValue), avgDuration: kpi(avgDur), onTime: kpi(onTimePct),
    },
    series: buckets.map((b, i) => ({ label: b.label, revenue: revenue[i], expenses: expenses[i], profit: profit[i], completed: completed[i], started: started[i] })),
    heatmap, unit: money ? 'money' : 'count', breakdowns,
    highlights: { bestMonth: best, topClient: top ? { label: top[0], value: top[1].value } : null, streakCurrent: cur, streakLongest: longest },
  };
}

export function computeAll(items: NProject[], flags: Flags, currency: string): Record<Period, AnalyticsResult> {
  return Object.fromEntries(PERIODS.map((p) => [p, computeAnalytics(items, flags, currency, p)])) as Record<Period, AnalyticsResult>;
}

/** Projects ending/due in the next N days (or overdue) that are not finished. */
export function dueSoon(items: NProject[], days = 7, todayIso = todayISO()): NProject[] {
  const t = dayNum(todayIso);
  return items
    .filter((p) => !p.done && (p.due ?? p.end))
    .filter((p) => dayNum((p.due ?? p.end)!) <= t + days)
    .sort((a, b) => (a.due ?? a.end!).localeCompare(b.due ?? b.end!));
}

export function goalProgress(
  items: NProject[],
  goal: { type: 'revenue' | 'projects' | null; value: number | null; period: 'month' | 'year' },
  todayIso = todayISO(),
): { current: number; target: number; type: 'revenue' | 'projects'; period: 'month' | 'year' } | null {
  if (!goal.type || !goal.value) return null;
  const prefix = goal.period === 'month' ? todayIso.slice(0, 7) : todayIso.slice(0, 4);
  const inPeriod = items.filter((p) => recordDate(p)?.startsWith(prefix));
  const current = goal.type === 'revenue' ? sum(inPeriod.map((p) => p.amount ?? 0)) : inPeriod.filter((p) => p.done || p.end).length;
  return { current, target: goal.value, type: goal.type, period: goal.period };
}
