'use client';
import { useState } from 'react';
import { PERIODS, PERIOD_LABEL, type AnalyticsResult, type Kpi, type Period } from '@/features/analytics/compute';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { BarChart, Donut, Heatmap, HBars, Sparkline } from '@/components/ui/Charts';
import { formatMoney } from '@/lib/currency';
import { compactNumber, pct } from '@/lib/format';

function Delta({ k, invert }: { k: Kpi; invert?: boolean }) {
  if (k.delta === null) return <span className="delta faint">no prior period</span>;
  const up = k.delta >= 0;
  const good = invert ? !up : up;
  return <span className={`delta ${good ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(k.delta).toFixed(0)}% vs previous</span>;
}

function KpiCell({ label, k, fmt, invert }: { label: string; k: Kpi; fmt: (n: number) => string; invert?: boolean }) {
  return (
    <div className="kpi">
      <div className="k-label">{label}</div>
      <div className="k-val">{k.value === null ? '—' : <AnimatedNumber value={k.value} format={fmt} />}</div>
      <Delta k={k} invert={invert} />
      <Sparkline data={k.spark} />
    </div>
  );
}

export function KpiStrip({ r }: { r: AnalyticsResult }) {
  const money = (n: number) => formatMoney(Math.round(n), r.currency, true);
  const int = (n: number) => String(Math.round(n));
  return (
    <div className="kpis">
      {r.flags.amount && <KpiCell label={`Revenue ${r.thisLabel}`} k={r.kpis.revenue} fmt={money} />}
      {r.flags.spent && <KpiCell label="Expenses" k={r.kpis.expenses} fmt={money} invert />}
      {r.flags.profit && <KpiCell label="Profit" k={r.kpis.profit} fmt={money} />}
      {r.flags.amount && r.flags.profit && <KpiCell label="Margin" k={r.kpis.margin} fmt={(n) => pct(n)} />}
      <KpiCell label="Started" k={r.kpis.started} fmt={int} />
      <KpiCell label="Delivered" k={r.kpis.completed} fmt={int} />
    </div>
  );
}

export function AnalyticsPanel({ data, showMoneyHint = false }: { data: Record<Period, AnalyticsResult>; showMoneyHint?: boolean }) {
  const [period, setPeriod] = useState<Period>('month');
  const r = data[period];
  const money = r.unit === 'money';
  const fmt = (n: number) => (money ? formatMoney(Math.round(n), r.currency, true) : String(Math.round(n)));
  const unitLabel = money ? 'revenue' : 'projects';
  return (
    <div>
      <div className="row between wrap" style={{ marginBottom: 18 }}>
        <div className="seg" role="group" aria-label="Period">
          {PERIODS.map((p) => <button key={p} aria-pressed={p === period} onClick={() => setPeriod(p)}>{PERIOD_LABEL[p]}</button>)}
        </div>
        <span className="muted">{r.total} projects counted</span>
      </div>
      <KpiStrip r={r} />

      <h2 className="sec-title">{money ? 'Revenue & profit' : 'Delivered'} <small>last {r.series.length} {period === 'quarter' ? 'quarters' : period + 's'}</small></h2>
      <BarChart
        label={money ? 'Revenue and profit per period' : 'Projects delivered per period'}
        points={r.series.map((s) => (money ? { label: s.label, a: s.revenue, b: r.flags.profit ? Math.max(s.profit, 0) : undefined } : { label: s.label, a: s.completed }))}
        format={fmt}
      />

      <div className="cols">
        <div><h2 className="sec-title">By {r.flags.client ? 'client' : 'tag'} <small>{unitLabel}</small></h2>
          <Donut label="Share by client" slices={r.flags.client ? r.breakdowns.client : r.breakdowns.tags} format={fmt} /></div>
        <div><h2 className="sec-title">By status <small>{unitLabel}</small></h2>
          {r.flags.status ? <HBars slices={r.breakdowns.status} format={fmt} /> : <p className="muted">This dashboard has no status field.</p>}</div>
        {r.flags.tags && r.flags.client && <div><h2 className="sec-title">By tag <small>{unitLabel}</small></h2><HBars slices={r.breakdowns.tags} format={fmt} /></div>}
      </div>

      <h2 className="sec-title">Delivery activity <small>last 12 months</small></h2>
      <Heatmap days={r.heatmap} />

      <div className="kpis" style={{ marginTop: 34 }}>
        <div className="kpi"><div className="k-label">Best month</div><div className="k-val">{r.highlights.bestMonth ? r.highlights.bestMonth.label : '—'}</div><span className="muted num">{r.highlights.bestMonth ? fmt(r.highlights.bestMonth.value) : ''}</span></div>
        <div className="kpi"><div className="k-label">Top client</div><div className="k-val">{r.highlights.topClient ? r.highlights.topClient.label : '—'}</div><span className="muted num">{r.highlights.topClient ? fmt(r.highlights.topClient.value) : ''}</span></div>
        <div className="kpi"><div className="k-label">Current streak</div><div className="k-val">{r.highlights.streakCurrent}<small className="muted" style={{ fontSize: 14, fontFamily: 'var(--font-body)' }}> wk</small></div><span className="muted">weeks in a row with a delivery</span></div>
        <div className="kpi"><div className="k-label">Longest streak</div><div className="k-val">{r.highlights.streakLongest}<small className="muted" style={{ fontSize: 14, fontFamily: 'var(--font-body)' }}> wk</small></div></div>
        {r.flags.amount && <div className="kpi"><div className="k-label">Avg project value</div><div className="k-val">{r.kpis.avgValue.value === null ? '—' : formatMoney(Math.round(r.kpis.avgValue.value), r.currency, true)}</div></div>}
        <div className="kpi"><div className="k-label">Avg duration</div><div className="k-val">{r.kpis.avgDuration.value === null ? '—' : `${Math.round(r.kpis.avgDuration.value)}d`}</div></div>
        {r.flags.due && <div className="kpi"><div className="k-label">On-time rate</div><div className="k-val">{r.kpis.onTime.value === null ? '—' : pct(r.kpis.onTime.value)}</div></div>}
      </div>
      {showMoneyHint && !r.flags.amount && <p className="hint" style={{ marginTop: 16 }}>Some numbers are private to the owner of this page.</p>}
      <span className="sr">{compactNumber(r.total)}</span>
    </div>
  );
}
