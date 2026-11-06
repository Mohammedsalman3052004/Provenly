'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { importProjects } from '@/features/projects/actions';
import { parseCsv } from '@/lib/csv';
import { parseMoneyInput } from '@/lib/currency';
import type { Field } from '@/types';

function toIso(s: string): string | undefined {
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); // dd/mm/yyyy
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const p = Date.parse(t + ' UTC');
  return Number.isNaN(p) ? undefined : new Date(p).toISOString().slice(0, 10);
}

function convert(f: Field, raw: string): unknown {
  const s = raw.trim();
  if (!s) return undefined;
  switch (f.type) {
    case 'number': { const n = Number(s.replace(/,/g, '')); return Number.isFinite(n) ? n : undefined; }
    case 'currency': return parseMoneyInput(s, f.options.currency ?? 'USD') ?? undefined;
    case 'date': return toIso(s);
    case 'daterange': return undefined;
    case 'multiselect': return s.split(/[;,|]/).map((x) => x.trim()).filter(Boolean);
    case 'checkbox': return /^(1|true|yes|y|✓)$/i.test(s);
    case 'rating': { const n = Math.round(Number(s)); return n >= 0 && n <= 5 ? n : undefined; }
    default: return s;
  }
}

export function ImportWizard({ dashboardId, fields }: { dashboardId: string; fields: Field[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<string[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ imported: number; skipped: { row: number; reason: string }[] } | null>(null);
  const importable = fields.filter((f) => f.type !== 'formula' && f.type !== 'image' && f.type !== 'daterange');
  const header = rows[0] ?? [];
  const body = rows.slice(1);

  function load(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast('CSV is larger than 5 MB.', { kind: 'err' });
    void file.text().then((t) => {
      const parsed = parseCsv(t);
      if (parsed.length < 2) return toast('That file has no data rows.', { kind: 'err' });
      setRows(parsed); setReport(null);
      const m: Record<string, number> = {};
      for (const f of importable) { const i = parsed[0].findIndex((h) => h.trim().toLowerCase() === f.name.toLowerCase()); if (i >= 0) m[f.id] = i; }
      setMap(m);
    });
  }

  const preview = useMemo(() => body.slice(0, 4).map((r) => importable.map((f) => (map[f.id] !== undefined ? r[map[f.id]] ?? '' : ''))), [body, map]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run() {
    setBusy(true);
    const data = body.map((r) => { const d: Record<string, unknown> = {}; for (const f of importable) { if (map[f.id] === undefined) continue; const v = convert(f, r[map[f.id]] ?? ''); if (v !== undefined) d[f.id] = v; } return d; });
    let imported = 0; const skipped: { row: number; reason: string }[] = [];
    for (let i = 0; i < data.length; i += 500) {
      const res = await importProjects(dashboardId, data.slice(i, i + 500));
      if (!res.ok) { toast(res.error, { kind: 'err' }); setBusy(false); return; }
      imported += res.data.imported; skipped.push(...res.data.skipped.map((s) => ({ ...s, row: s.row + i })));
    }
    setBusy(false); setReport({ imported, skipped });
    toast(`Imported ${imported} project${imported === 1 ? '' : 's'}`); router.refresh();
  }

  return (
    <div className="stack" style={{ gap: 24, maxWidth: 900 }}>
      <div className="dz"><label className="btn btn-primary" style={{ cursor: 'pointer' }}>Choose CSV file<input className="sr" type="file" accept=".csv,text/csv" onChange={(e) => load(e.target.files?.[0])} /></label><span className="muted">First row must be column headers. Max 5 MB.</span></div>
      {rows.length > 0 && (
        <>
          <div>
            <h3 style={{ fontSize: 26, marginBottom: 12 }}>Match columns <span className="faint" style={{ fontSize: 15, fontFamily: 'var(--font-body)' }}>{body.length} rows found</span></h3>
            {importable.map((f) => (
              <div key={f.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <span className="grow">{f.name}{f.required && <b style={{ color: 'var(--bad)' }}> *</b>} <span className="faint">({f.type})</span></span>
                <select className="select" style={{ maxWidth: 260 }} aria-label={`CSV column for ${f.name}`} value={map[f.id] ?? ''} onChange={(e) => setMap((m) => { const n = { ...m }; if (e.target.value === '') delete n[f.id]; else n[f.id] = Number(e.target.value); return n; })}>
                  <option value="">— skip —</option>{header.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ overflow: 'auto' }}>
            <div className="label">Preview (first {preview.length} rows)</div>
            <table style={{ borderCollapse: 'collapse', fontSize: 13 }}><thead><tr>{importable.map((f) => <th key={f.id} style={{ textAlign: 'left', padding: '4px 12px 4px 0', color: 'var(--faint)', fontWeight: 400 }}>{f.name}</th>)}</tr></thead>
              <tbody>{preview.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ padding: '4px 12px 4px 0', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c}</td>)}</tr>)}</tbody></table>
          </div>
          <div><button className="btn btn-primary" onClick={run} disabled={busy || !Object.keys(map).length}>{busy ? 'Importing…' : `Import ${body.length} rows`}</button></div>
        </>
      )}
      {report && (
        <div className="card">
          <b>{report.imported} imported.</b>{report.skipped.length > 0 && <> {report.skipped.length} skipped:<ul style={{ margin: '8px 0 0' }}>{report.skipped.map((s) => <li key={s.row} className="muted">Row {s.row}: {s.reason}</li>)}</ul></>}
        </div>
      )}
    </div>
  );
}
