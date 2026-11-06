'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { saveFields } from '@/features/fields/actions';
import { CURRENCIES } from '@/lib/currency';
import { DEFAULT_STATUS_CHOICES } from '@/lib/project-data';
import { FIELD_ROLES, FIELD_ROLE_LABELS, FIELD_TYPES, FIELD_TYPE_LABELS, type Field, type FieldRole, type FieldType, type Choice } from '@/types';

const ROLE_TYPES: Record<FieldRole, FieldType[]> = {
  title: ['text'], url: ['url'], amount: ['currency'], spent: ['currency'], profit: ['formula', 'currency'],
  start: ['date'], end: ['date'], due: ['date'], range: ['daterange'], client: ['person', 'text', 'select'],
  status: ['status', 'select'], tags: ['multiselect', 'select'], thumbnail: ['image'], description: ['longtext', 'text'],
};
const rolesFor = (t: FieldType) => FIELD_ROLES.filter((r) => ROLE_TYPES[r].includes(t));

type Draft = Pick<Field, 'id' | 'name' | 'type' | 'role' | 'required' | 'sensitive' | 'default_visible' | 'options'>;

export function FieldEditor({ dashboardId, initial, defaultCurrency }: { dashboardId: string; initial: Field[]; defaultCurrency: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [list, setList] = useState<Draft[]>(initial.map(({ id, name, type, role, required, sensitive, default_visible, options }) => ({ id, name, type, role, required, sensitive, default_visible, options })));
  const [open, setOpen] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const upd = (id: string, patch: Partial<Draft>) => { setList((l) => l.map((f) => (f.id === id ? { ...f, ...patch } : f))); setDirty(true); };
  const move = (i: number, d: number) => setList((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; setDirty(true); return n; });
  const money = list.filter((f) => f.type === 'currency' || f.type === 'number');

  function changeType(f: Draft, type: FieldType) {
    const options = { ...f.options };
    if ((type === 'currency' || type === 'formula') && !options.currency) options.currency = defaultCurrency;
    if (type === 'status' && !options.choices?.length) options.choices = DEFAULT_STATUS_CHOICES;
    if (type === 'formula' && !options.formula) options.formula = { op: 'subtract', a: money[0]?.id ?? '', b: money[1]?.id ?? '' };
    const role = f.role && ROLE_TYPES[f.role].includes(type) ? f.role : null;
    upd(f.id, { type, options, role });
  }

  function add() {
    const id = crypto.randomUUID();
    setList((l) => [...l, { id, name: 'New field', type: 'text', role: null, required: false, sensitive: false, default_visible: true, options: {} }]);
    setOpen(id); setDirty(true);
  }

  async function save() {
    for (const f of list) if (f.type === 'formula' && (!f.options.formula?.a || !f.options.formula?.b)) { toast(`“${f.name}” needs two fields to calculate from.`, { kind: 'err' }); setOpen(f.id); return; }
    setBusy(true);
    const res = await saveFields(dashboardId, list);
    setBusy(false);
    if (!res.ok) return toast(res.error, { kind: 'err' });
    toast('Fields saved'); setDirty(false); router.refresh();
  }

  const setChoices = (f: Draft, choices: Choice[]) => upd(f.id, { options: { ...f.options, choices } });

  return (
    <div>
      {list.map((f, i) => (
        <div key={f.id} draggable={drag !== null} onDragOver={(e) => { e.preventDefault(); if (drag !== null && drag !== i) { setList((l) => { const n = [...l]; const [m] = n.splice(drag, 1); n.splice(i, 0, m); return n; }); setDrag(i); setDirty(true); } }} onDragEnd={() => setDrag(null)}>
          <div className={`frow ${drag === i ? 'dragging' : ''}`}>
            <span className="handle" title="Drag to reorder" onMouseDown={() => setDrag(i)} onMouseUp={() => setDrag(null)} aria-hidden>⠿</span>
            <input className="input" aria-label="Field name" value={f.name} maxLength={60} onChange={(e) => upd(f.id, { name: e.target.value })} />
            <select className="select" aria-label="Field type" value={f.type} onChange={(e) => changeType(f, e.target.value as FieldType)}>
              {FIELD_TYPES.map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
            </select>
            <select className="select" aria-label="Meaning for analytics" value={f.role ?? ''} onChange={(e) => upd(f.id, { role: (e.target.value || null) as FieldRole | null })}>
              <option value="">No special meaning</option>
              {rolesFor(f.type).map((r) => <option key={r} value={r}>{FIELD_ROLE_LABELS[r]}</option>)}
            </select>
            <span className="row gap-sm">
              <button className="btn btn-sm btn-icon" onClick={() => move(i, -1)} aria-label="Move up" disabled={i === 0}>↑</button>
              <button className="btn btn-sm btn-icon" onClick={() => move(i, 1)} aria-label="Move down" disabled={i === list.length - 1}>↓</button>
              <button className="btn btn-sm" onClick={() => setOpen(open === f.id ? null : f.id)} aria-expanded={open === f.id}>Options</button>
              <button className="btn btn-sm btn-icon btn-danger" aria-label="Remove field" onClick={() => { if (f.role === 'title' && list.filter((x) => x.role === 'title').length === 1 && !confirm('This is your title field. Remove it anyway?')) return; setList((l) => l.filter((x) => x.id !== f.id)); setDirty(true); }}>✕</button>
            </span>
          </div>
          {open === f.id && (
            <div className="stack" style={{ padding: '14px 0 18px 32px', borderBottom: '1px solid var(--line)' }}>
              <div className="row wrap gap-lg">
                <label className="check"><input type="checkbox" checked={f.required} onChange={(e) => upd(f.id, { required: e.target.checked })} /> Required</label>
                <label className="check"><input type="checkbox" checked={f.sensitive} onChange={(e) => upd(f.id, { sensitive: e.target.checked })} /> Sensitive <span className="faint">(pre-hidden in new share links)</span></label>
                <label className="check"><input type="checkbox" checked={f.default_visible} onChange={(e) => upd(f.id, { default_visible: e.target.checked })} /> Visible in table by default</label>
              </div>
              {(f.type === 'currency' || f.type === 'formula') && (
                <div style={{ maxWidth: 240 }}><label className="label">Currency</label>
                  <select className="select" value={f.options.currency ?? defaultCurrency} onChange={(e) => upd(f.id, { options: { ...f.options, currency: e.target.value } })}>
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select></div>
              )}
              {f.type === 'formula' && (
                <div className="row wrap">
                  <select className="select" style={{ width: 200 }} aria-label="First field" value={f.options.formula?.a ?? ''} onChange={(e) => upd(f.id, { options: { ...f.options, formula: { op: f.options.formula?.op ?? 'subtract', a: e.target.value, b: f.options.formula?.b ?? '' } } })}>
                    <option value="">Choose…</option>{money.filter((m) => m.id !== f.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <select className="select" style={{ width: 120 }} aria-label="Operation" value={f.options.formula?.op ?? 'subtract'} onChange={(e) => upd(f.id, { options: { ...f.options, formula: { a: f.options.formula?.a ?? '', b: f.options.formula?.b ?? '', op: e.target.value as 'subtract' | 'add' | 'multiply' } } })}>
                    <option value="subtract">minus</option><option value="add">plus</option><option value="multiply">times</option>
                  </select>
                  <select className="select" style={{ width: 200 }} aria-label="Second field" value={f.options.formula?.b ?? ''} onChange={(e) => upd(f.id, { options: { ...f.options, formula: { op: f.options.formula?.op ?? 'subtract', a: f.options.formula?.a ?? '', b: e.target.value } } })}>
                    <option value="">Choose…</option>{money.filter((m) => m.id !== f.id).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              {(f.type === 'select' || f.type === 'status' || f.type === 'multiselect') && (
                <div>
                  <label className="label">Choices</label>
                  {(f.options.choices ?? []).map((c, ci) => (
                    <div className="row" key={ci} style={{ marginBottom: 6 }}>
                      <input type="color" aria-label="Colour" value={c.color} onChange={(e) => setChoices(f, f.options.choices!.map((x, k) => (k === ci ? { ...x, color: e.target.value } : x)))} style={{ width: 36, height: 34, border: 0, background: 'none' }} />
                      <input className="input" style={{ maxWidth: 240, height: 34 }} value={c.value} maxLength={40} onChange={(e) => setChoices(f, f.options.choices!.map((x, k) => (k === ci ? { ...x, value: e.target.value } : x)))} />
                      {f.type === 'status' && <label className="check" style={{ fontSize: 13 }}><input type="checkbox" checked={!!c.done} onChange={(e) => setChoices(f, f.options.choices!.map((x, k) => (k === ci ? { ...x, done: e.target.checked } : x)))} /> counts as delivered</label>}
                      <button className="btn btn-sm btn-icon" aria-label="Remove choice" onClick={() => setChoices(f, f.options.choices!.filter((_, k) => k !== ci))}>✕</button>
                    </div>
                  ))}
                  <button className="btn btn-sm" onClick={() => setChoices(f, [...(f.options.choices ?? []), { value: 'New choice', color: '#8f8777' }])}>+ Add choice</button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="row wrap" style={{ marginTop: 22 }}>
        <button className="btn" onClick={add}>+ Add field</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save fields'}</button>
        <span className="hint" style={{ margin: 0 }}>Removing a field archives it. Its values stay in your data.</span>
      </div>
    </div>
  );
}
