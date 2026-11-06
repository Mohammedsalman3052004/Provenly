'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { THUMB_BUCKET } from '@/lib/config';
import { compressImage } from '@/lib/image';
import { formatMoney, minorDigits, minorToInput, parseMoneyInput } from '@/lib/currency';
import { formulaValue } from '@/lib/project-data';
import type { Field, ProjectData } from '@/types';

interface Props {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  data: ProjectData;
  userId: string;
  suggestions?: string[];
  onBlurUrl?: (url: string) => void;
}

function groupInt(s: string): string {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function CurrencyInput({ field, value, onChange, error }: Props) {
  const cur = field.options.currency ?? 'USD';
  const digits = minorDigits(cur);
  const [text, setText] = useState(typeof value === 'number' ? groupInt(minorToInput(value, cur).split('.')[0]) + (minorToInput(value, cur).includes('.') ? '.' + minorToInput(value, cur).split('.')[1] : '') : '');
  return (
    <div style={{ position: 'relative' }}>
      <span className="faint mono" style={{ position: 'absolute', left: 14, top: 11, fontSize: 13 }}>{cur}</span>
      <input
        className={`input mono ${error ? 'err' : ''}`} style={{ paddingLeft: 52 }} inputMode="decimal" value={text} placeholder="0"
        onChange={(e) => {
          let raw = e.target.value.replace(/[^0-9.]/g, '');
          const [i, ...rest] = raw.split('.');
          raw = rest.length ? `${i}.${rest.join('').slice(0, digits)}` : i;
          if (digits === 0) raw = i;
          const shown = raw.includes('.') ? `${groupInt(raw.split('.')[0])}.${raw.split('.')[1]}` : groupInt(raw);
          setText(shown);
          onChange(parseMoneyInput(raw, cur) ?? undefined);
        }}
      />
    </div>
  );
}

function TagBox({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions?: string[] }) {
  const [t, setT] = useState('');
  const add = (s: string) => { const v = s.trim(); if (v && !value.includes(v) && value.length < 30) onChange([...value, v]); setT(''); };
  const listId = useRef(`tags-${Math.random().toString(36).slice(2)}`).current;
  return (
    <div className="tagbox">
      {value.map((x) => (
        <span className="chip" key={x}>{x}<button type="button" aria-label={`Remove ${x}`} onClick={() => onChange(value.filter((y) => y !== x))}>×</button></span>
      ))}
      <input
        list={listId} value={t} placeholder={value.length ? '' : 'Type and press Enter'} onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(t); } else if (e.key === 'Backspace' && !t && value.length) onChange(value.slice(0, -1)); }}
        onBlur={() => t && add(t)}
      />
      <datalist id={listId}>{(suggestions ?? []).filter((s) => !value.includes(s)).map((s) => <option key={s} value={s} />)}</datalist>
    </div>
  );
}

function ImageInput({ value, onChange, userId }: Pick<Props, 'value' | 'onChange' | 'userId'>) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const url = typeof value === 'string' ? value : '';
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const blob = await compressImage(file);
      const sb = createClient();
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await sb.storage.from(THUMB_BUCKET).upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' });
      if (error) throw new Error(error.message);
      onChange(sb.storage.from(THUMB_BUCKET).getPublicUrl(path).data.publicUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed');
    } finally { setBusy(false); }
  }
  return (
    <div>
      <div className="dz">
        {url ? <img src={url} alt="" className="thumb" style={{ width: 84, height: 56 }} /> : <div className="thumb" style={{ width: 84, height: 56 }}>＋</div>}
        <div className="grow">
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            {busy ? 'Uploading…' : url ? 'Replace' : 'Upload image'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
          {url && <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange(undefined)} style={{ marginLeft: 8 }}>Remove</button>}
          <div className="hint">Compressed to WebP in your browser before upload.</div>
        </div>
      </div>
      {err && <div className="field-err">{err}</div>}
    </div>
  );
}

export function FieldInput(p: Props) {
  const { field, value, onChange, error } = p;
  const cls = `input ${error ? 'err' : ''}`;
  const choices = field.options.choices ?? [];
  switch (field.type) {
    case 'text':
      return <input className={cls} value={(value as string) ?? ''} maxLength={200} onChange={(e) => onChange(e.target.value)} />;
    case 'url':
      return <input className={cls} type="url" placeholder="https://" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} onBlur={(e) => e.target.value && p.onBlurUrl?.(e.target.value)} />;
    case 'longtext':
      return <textarea className={`textarea ${error ? 'err' : ''}`} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Markdown is welcome" />;
    case 'number':
      return <input className={`${cls} mono`} inputMode="decimal" value={value === undefined ? '' : String(value)} onChange={(e) => { const n = e.target.value.trim() === '' ? undefined : Number(e.target.value); onChange(n === undefined || Number.isNaN(n) ? undefined : n); }} />;
    case 'currency':
      return <CurrencyInput {...p} />;
    case 'date':
      return <input className={cls} type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)} />;
    case 'daterange': {
      const r = (value as { start?: string; end?: string }) ?? {};
      return (
        <div className="row">
          <input className={cls} type="date" aria-label="Start" value={r.start ?? ''} onChange={(e) => onChange({ ...r, start: e.target.value || undefined })} />
          <span className="faint">→</span>
          <input className={cls} type="date" aria-label="End" value={r.end ?? ''} onChange={(e) => onChange({ ...r, end: e.target.value || undefined })} />
        </div>
      );
    }
    case 'select':
    case 'status':
      return choices.length ? (
        <select className={`select ${error ? 'err' : ''}`} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">—</option>
          {choices.map((c) => <option key={c.value} value={c.value}>{c.value}</option>)}
        </select>
      ) : <input className={cls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="Add choices in Fields to get a dropdown" />;
    case 'person': {
      const id = `p-${field.id}`;
      return (<><input className={cls} list={id} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} /><datalist id={id}>{(p.suggestions ?? []).map((s) => <option key={s} value={s} />)}</datalist></>);
    }
    case 'multiselect':
      return <TagBox value={Array.isArray(value) ? (value as string[]) : []} onChange={(v) => onChange(v.length ? v : undefined)} suggestions={[...choices.map((c) => c.value), ...(p.suggestions ?? [])]} />;
    case 'checkbox':
      return <label className="check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> Yes</label>;
    case 'rating': {
      const n = typeof value === 'number' ? value : 0;
      return (
        <div className="row gap-sm" role="radiogroup" aria-label={field.name}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" role="radio" aria-checked={n === i} className="btn btn-sm btn-icon" style={{ color: i <= n ? 'var(--accent)' : 'var(--faint)', borderColor: i <= n ? 'var(--accent)' : undefined }} onClick={() => onChange(n === i ? undefined : i)}>★</button>
          ))}
        </div>
      );
    }
    case 'image':
      return <ImageInput value={value} onChange={onChange} userId={p.userId} />;
    case 'formula':
      return <FormulaInput {...p} />;
  }
}

function FormulaInput({ field, value, onChange, data }: Props) {
  const def = field.options.formula;
  const cur = field.options.currency ?? 'USD';
  const computed = def ? formulaValue(def, data) : null;
  const [override, setOverride] = useState(typeof value === 'number' && computed !== null && value !== computed);
  useEffect(() => { if (!override && value !== undefined) onChange(undefined); }, [override, value, onChange]);
  return (
    <div>
      <div className="row">
        <div className="input mono row" style={{ opacity: override ? 0.5 : 1 }}>{computed === null ? '—' : formatMoney(computed, cur)}</div>
        <label className="check" style={{ whiteSpace: 'nowrap', fontSize: 13 }}><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Override</label>
      </div>
      {override && <div style={{ marginTop: 8 }}><CurrencyInput field={{ ...field, type: 'currency' }} value={value} onChange={onChange} data={data} userId="" /></div>}
      <div className="hint">Calculated automatically. Tick Override to enter your own number.</div>
    </div>
  );
}
