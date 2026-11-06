import { describe, expect, it } from 'vitest';
import { computeAnalytics, normalize, goalProgress } from '@/features/analytics/compute';
import { computeFormulas } from '@/lib/project-data';
import { convertMinor, formatMoney, parseMoneyInput } from '@/lib/currency';
import { parseCsv, toCsv } from '@/lib/csv';
import { validateProjectData } from '@/lib/validators/project';
import type { Field } from '@/types';

const mk = (id: string, name: string, type: Field['type'], role: Field['role'], extra: Partial<Field> = {}): Field => ({
  id, dashboard_id: 'd', name, type, role, position: 0, required: false, sensitive: false, default_visible: true, options: {}, archived_at: null, ...extra,
});
const fields: Field[] = [
  mk('11111111-1111-1111-1111-111111111111', 'Name', 'text', 'title', { required: true }),
  mk('22222222-2222-2222-2222-222222222222', 'Amount', 'currency', 'amount', { options: { currency: 'USD' } }),
  mk('33333333-3333-3333-3333-333333333333', 'Spent', 'currency', 'spent', { options: { currency: 'USD' } }),
  mk('44444444-4444-4444-4444-444444444444', 'Start', 'date', 'start'),
  mk('55555555-5555-5555-5555-555555555555', 'End', 'date', 'end'),
  mk('66666666-6666-6666-6666-666666666666', 'Client', 'person', 'client'),
  mk('77777777-7777-7777-7777-777777777777', 'Profit', 'formula', 'profit', {
    options: { currency: 'USD', formula: { op: 'subtract', a: '22222222-2222-2222-2222-222222222222', b: '33333333-3333-3333-3333-333333333333' } },
  }),
];
const [N, A, S, ST, EN, C, P] = fields.map((f) => f.id);

describe('analytics', () => {
  const rows = [
    { id: 'a', data: { [N]: 'A', [A]: 100000, [S]: 20000, [ST]: '2026-10-01', [EN]: '2026-10-20', [C]: 'Acme' } },
    { id: 'b', data: { [N]: 'B', [A]: 50000, [S]: 10000, [ST]: '2026-09-01', [EN]: '2026-09-15', [C]: 'Acme' } },
    { id: 'c', data: { [N]: 'C', [A]: 70000, [ST]: '2026-10-05', [EN]: '2026-10-28', [C]: 'Beta' } },
  ];
  const { items, flags, currency } = normalize(fields, rows);
  const r = computeAnalytics(items, flags, currency, 'month', '2026-10-30');

  it('sums revenue per month with delta vs previous month', () => {
    expect(r.kpis.revenue.value).toBe(170000);
    expect(r.kpis.revenue.prev).toBe(50000);
    expect(r.kpis.revenue.delta).toBeCloseTo(240);
  });
  it('derives profit and margin', () => {
    expect(r.kpis.profit.value).toBe(80000);
    expect(r.kpis.completed.value).toBe(2);
  });
  it('finds top client and best month', () => {
    expect(r.highlights.topClient).toEqual({ label: 'Acme', value: 150000 });
    expect(r.highlights.bestMonth?.label).toBe('Oct 2026');
  });
  it('has no money KPIs when amount field is not provided (hidden-field safety)', () => {
    const visible = fields.filter((f) => ![A, S, P].includes(f.id));
    const n = normalize(visible, rows);
    expect(n.flags.amount).toBe(false);
    expect(n.items.every((i) => i.amount === null && i.profit === null)).toBe(true);
    expect(computeAnalytics(n.items, n.flags, n.currency, 'month', '2026-10-30').unit).toBe('count');
  });
  it('goal progress counts revenue in the current month', () => {
    const g = goalProgress(items, { type: 'revenue', value: 500000, period: 'month' }, '2026-10-30');
    expect(g?.current).toBe(170000);
  });
});

describe('helpers', () => {
  it('computes profit formula but respects overrides', () => {
    expect(computeFormulas(fields, { [A]: 1000, [S]: 300 })[P]).toBe(700);
    expect(computeFormulas(fields, { [A]: 1000, [S]: 300, [P]: 5 })[P]).toBe(5);
  });
  it('money is integer minor units', () => {
    expect(parseMoneyInput('1,500.55', 'USD')).toBe(150055);
    expect(parseMoneyInput('1500', 'JPY')).toBe(1500);
    expect(formatMoney(150055, 'USD')).toBe('$1,500.55');
    expect(convertMinor(8400, 'INR', 'USD')).toBe(100);
  });
  it('csv round trip with quotes and formula-injection guard', () => {
    const csv = toCsv([['a', 'b,c', '"q"'], ['=SUM(A1)', '2']]);
    expect(parseCsv(csv)[0]).toEqual(['a', 'b,c', '"q"']);
    expect(parseCsv(csv)[1][0]).toBe("'=SUM(A1)");
  });
  it('validates generated schema and strips unknown keys', () => {
    expect(validateProjectData(fields, {}).ok).toBe(false);
    const ok = validateProjectData(fields, { [N]: 'X', [A]: 100, junk: 1 });
    expect(ok.ok && ok.data).toEqual({ [N]: 'X', [A]: 100 });
  });
});
