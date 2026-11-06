import { compactNumber, cn } from '@/lib/format';

const PALETTE = ['#3781fc', '#1951fc', '#7cc4ff', '#8b5cf6', '#22d3ee', '#34d399', '#6c81ae'];
export const sliceColor = (i: number) => PALETTE[i % PALETTE.length];

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const w = 100, h = 30, span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`);
  return (
    <svg className={cn('spark', className)} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(',')[0]} cy={pts[pts.length - 1].split(',')[1]} r="2.2" fill="var(--accent)" />
    </svg>
  );
}

export function BarChart({ points, format, label }: { points: { label: string; a: number; b?: number }[]; format: (n: number) => string; label: string }) {
  const W = 640, H = 220, pad = 26;
  const max = Math.max(1, ...points.map((p) => Math.max(p.a, p.b ?? 0)));
  const bw = (W - pad) / points.length;
  return (
    <div className="chart" role="img" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H + 22}`}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line className="axis" x1={pad} x2={W} y1={H - t * (H - 14)} y2={H - t * (H - 14)} />
            <text x={0} y={H - t * (H - 14) + 4}>{compactNumber(max * t)}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = pad + i * bw;
          const hA = (p.a / max) * (H - 14), hB = ((p.b ?? 0) / max) * (H - 14);
          const w = p.b !== undefined ? bw * 0.34 : bw * 0.56;
          return (
            <g key={i}>
              <rect className="bar" x={x + bw * 0.12} y={H - hA} width={w} height={Math.max(hA, 0)} rx="3"><title>{`${p.label}: ${format(p.a)}`}</title></rect>
              {p.b !== undefined && <rect className="bar alt" x={x + bw * 0.12 + w + 3} y={H - hB} width={w} height={Math.max(hB, 0)} rx="3"><title>{`${p.label}: ${format(p.b)}`}</title></rect>}
              <text x={x + bw * 0.5} y={H + 16} textAnchor="middle">{p.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Donut({ slices, format, label }: { slices: { label: string; value: number }[]; format: (n: number) => string; label: string }) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (!total) return <p className="muted">No data in this period.</p>;
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="row gap-lg wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={label}>
        <g transform="rotate(-90 70 70)">
          {slices.map((s, i) => {
            const len = (s.value / total) * C;
            const el = <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={sliceColor(i)} strokeWidth="16" strokeDasharray={`${Math.max(len - 1.5, 0)} ${C}`} strokeDashoffset={-off} />;
            off += len;
            return el;
          })}
        </g>
      </svg>
      <div className="legend grow">
        {slices.map((s, i) => (
          <div className="li" key={s.label}>
            <span className="sw" style={{ background: sliceColor(i) }} />
            <span className="grow" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            <span className="num muted">{format(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBars({ slices, format }: { slices: { label: string; value: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...slices.map((s) => s.value));
  if (!slices.length) return <p className="muted">No data in this period.</p>;
  return (
    <div className="stack" style={{ gap: 12 }}>
      {slices.map((s) => (
        <div key={s.label}>
          <div className="row between"><span>{s.label}</span><span className="num muted">{format(s.value)}</span></div>
          <div className="hbar"><i style={{ width: `${(s.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Heatmap({ days }: { days: { date: string; count: number }[] }) {
  // rows are Mon..Sun; the series starts on a Monday
  const max = Math.max(1, ...days.map((d) => d.count));
  const level = (c: number) => (c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4)));
  const total = days.reduce((a, d) => a + d.count, 0);
  return (
    <div role="img" aria-label={`${total} projects delivered in the last year`}>
      <div className="heat" style={{ gridTemplateColumns: `repeat(${Math.ceil(days.length / 7)}, 1fr)` }}>
        {days.map((d) => <i key={d.date} data-l={level(d.count)} title={`${d.date}: ${d.count} delivered`} />)}
      </div>
      <p className="hint">{total} delivered in the last year</p>
    </div>
  );
}

export function Ring({ value, label, size = 120 }: { value: number; label: string; size?: number }) {
  const p = Math.max(0, Math.min(1, value));
  const R = size / 2 - 8, C = 2 * Math.PI * R;
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(p * 100)}% of goal`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line2)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--accent)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${p * C} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="ring-c"><div className="num" style={{ fontSize: 22 }}>{Math.round(p * 100)}%</div><div className="hint" style={{ margin: 0 }}>{label}</div></div>
    </div>
  );
}
