'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { createDashboard } from '@/features/dashboards/actions';
import { TEMPLATES, getTemplate } from '@/features/fields/templates';
import { CURRENCIES } from '@/lib/currency';
import { FIELD_TYPE_LABELS } from '@/types';

const ICONS = ['◆', '▤', '◐', '◈', '✦', '❖', '☰', '⌘', '✺', '❂'];
const COLORS = ['#3781fc', '#1951fc', '#7cc4ff', '#0b2cb1', '#8b5cf6', '#22d3ee', '#34d399', '#f59e0b'];

export function NewDashboardWizard({ defaultCurrency, first }: { defaultCurrency: string; first: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('◆');
  const [color, setColor] = useState('#3781fc');
  const [template, setTemplate] = useState('freelancing');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [keys, setKeys] = useState<string[]>(getTemplate('freelancing').fields.map((f) => f.key));
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = getTemplate(template);

  function pickTemplate(id: string) { setTemplate(id); setKeys(getTemplate(id).fields.map((f) => f.key)); }

  async function create() {
    setBusy(true);
    const res = await createDashboard({ name, description, icon, color, template: template as 'blank', currency, fieldKeys: keys, sample });
    setBusy(false);
    if (!res.ok) return toast(res.error, { kind: 'err' });
    toast('Dashboard created');
    router.push(sample ? `/app/d/${res.data.id}/projects` : `/app/d/${res.data.id}/add`);
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <div className="row" style={{ marginBottom: 26 }} aria-label={`Step ${step} of 3`}>
        {[1, 2, 3].map((n) => <span key={n} className="pill" style={{ ['--c' as string]: n <= step ? 'var(--accent)' : '#6d6657' }}>{['Name it', 'Choose fields', 'Add your first project'][n - 1]}</span>)}
      </div>

      {step === 1 && (
        <div className="stack" style={{ gap: 22 }}>
          <div><label className="label">Dashboard name</label>
            <input className="input" autoFocus value={name} maxLength={80} placeholder={first ? 'Freelancing Projects' : 'Pinakkaa Websites'} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep(2)} /></div>
          <div><label className="label">Short description (optional)</label>
            <input className="input" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder="Websites I built for this client" /></div>
          <div><label className="label">Icon</label>
            <div className="row wrap gap-sm">{ICONS.map((i) => <button key={i} className="btn btn-icon" aria-pressed={icon === i} style={icon === i ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined} onClick={() => setIcon(i)}>{i}</button>)}</div></div>
          <div><label className="label">Accent colour</label>
            <div className="row wrap gap-sm">{COLORS.map((c) => <button key={c} aria-label={c} aria-pressed={color === c} onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent' }} />)}</div></div>
          <div><button className="btn btn-primary" disabled={!name.trim()} onClick={() => setStep(2)}>Continue</button></div>
        </div>
      )}

      {step === 2 && (
        <div className="stack" style={{ gap: 22 }}>
          <div className="row wrap">
            {TEMPLATES.map((x) => (
              <button key={x.id} className="btn" aria-pressed={template === x.id} style={template === x.id ? { borderColor: 'var(--accent)', color: 'var(--accent-text)' } : undefined} onClick={() => pickTemplate(x.id)}>{x.icon} {x.name}</button>
            ))}
          </div>
          <p className="muted" style={{ margin: 0 }}>{t.blurb}</p>
          <div style={{ maxWidth: 220 }}><label className="label">Currency for money fields</label>
            <select className="select" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div>
            <div className="label">Fields (untick what you do not need — you can change everything later)</div>
            {t.fields.map((f) => (
              <label key={f.key} className="check" style={{ display: 'flex', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                <input type="checkbox" checked={keys.includes(f.key) || f.role === 'title'} disabled={f.role === 'title'} onChange={(e) => setKeys((k) => (e.target.checked ? [...k, f.key] : k.filter((x) => x !== f.key)))} />
                <span className="grow">{f.name}</span><span className="faint">{FIELD_TYPE_LABELS[f.type]}</span>{f.sensitive && <span className="chip">sensitive</span>}
              </label>
            ))}
          </div>
          <div className="row"><button className="btn" onClick={() => setStep(1)}>Back</button><button className="btn btn-primary" onClick={() => setStep(3)}>Continue</button></div>
        </div>
      )}

      {step === 3 && (
        <div className="stack" style={{ gap: 22 }}>
          <p className="muted" style={{ margin: 0, fontSize: 17 }}>“{name}” will start with {keys.length} fields. Want to see it with demo data first?</p>
          <label className="check"><input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} /> Fill it with sample projects (you can delete them any time)</label>
          <div className="row"><button className="btn" onClick={() => setStep(2)}>Back</button><button className="btn btn-primary" disabled={busy} onClick={create}>{busy ? 'Creating…' : sample ? 'Create with sample data' : 'Create and add first project'}</button></div>
        </div>
      )}
    </div>
  );
}
