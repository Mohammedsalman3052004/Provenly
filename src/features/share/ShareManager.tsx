'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { SharedView } from '@/features/share/SharedView';
import { createShareLink, deleteShareLink, previewShare, setShareRevoked, updateShareLink } from '@/features/share/actions';
import type { SharedViewModel } from '@/features/share/viewmodel';
import { fmtDate, timeAgo } from '@/lib/format';
import type { Field, ShareLink } from '@/types';

type Link = ShareLink & { view_count: number };
interface Form { id: string | null; name: string; hidden: string[]; views: string[]; date_from: string; date_to: string; expires: string; noindex: boolean; password: string; hasPassword: boolean; clearPassword: boolean }

function Qr({ text }: { text: string }) {
  const [svg, setSvg] = useState('');
  useEffect(() => { void import('qrcode').then((q) => q.toString(text, { type: 'svg', margin: 1, width: 160 })).then(setSvg); }, [text]);
  return <div style={{ background: '#fff', padding: 6, borderRadius: 10, width: 172 }} dangerouslySetInnerHTML={{ __html: svg }} aria-label="QR code" />;
}

export function ShareManager({ dashboardId, fields, links }: { dashboardId: string; fields: Field[]; links: Link[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [vm, setVm] = useState<SharedViewModel | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const reqId = useRef(0);

  const blank = (): Form => ({ id: null, name: '', hidden: fields.filter((f) => f.sensitive).map((f) => f.id), views: ['table', 'gallery', 'analytics'], date_from: '', date_to: '', expires: '', noindex: true, password: '', hasPassword: false, clearPassword: false });
  const edit = (l: Link): Form => ({ id: l.id, name: l.name, hidden: l.hidden_field_ids, views: l.views, date_from: l.date_from ?? '', date_to: l.date_to ?? '', expires: l.expires_at ? l.expires_at.slice(0, 10) : '', noindex: l.noindex, password: '', hasPassword: !!l.password_hash, clearPassword: false });

  const refreshPreview = useCallback(async (f: Form) => {
    const id = ++reqId.current;
    setPreviewing(true);
    const res = await previewShare(dashboardId, { hidden: f.hidden, date_from: f.date_from || null, date_to: f.date_to || null, views: f.views });
    if (id !== reqId.current) return;
    setPreviewing(false);
    if (res.ok) setVm(res.data);
  }, [dashboardId]);

  useEffect(() => {
    if (!form) { setVm(null); return; }
    const t = setTimeout(() => void refreshPreview(form), 350);
    return () => clearTimeout(t);
  }, [form?.hidden.join(','), form?.views.join(','), form?.date_from, form?.date_to, form !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form) return;
    if (!form.name.trim()) return toast('Give the link a name, e.g. “Resume link”.', { kind: 'err' });
    if (!form.views.length) return toast('Pick at least one view.', { kind: 'err' });
    setBusy(true);
    const payload = {
      name: form.name, hidden_field_ids: form.hidden, views: form.views, date_from: form.date_from || null, date_to: form.date_to || null,
      expires_at: form.expires ? new Date(form.expires + 'T23:59:59Z').toISOString() : null, noindex: form.noindex,
      password: form.clearPassword ? '' : form.password || undefined,
    };
    if (form.id) {
      const res = await updateShareLink(form.id, payload);
      setBusy(false);
      if (!res.ok) return toast(res.error, { kind: 'err' });
      toast('Link updated');
    } else {
      const res = await createShareLink(dashboardId, payload);
      setBusy(false);
      if (!res.ok) return toast(res.error, { kind: 'err' });
      toast('Link created');
      void navigator.clipboard?.writeText(`${origin}/s/${res.data.token}`).then(() => toast('Link created and copied'), () => undefined);
    }
    setForm(null); router.refresh();
  }

  const copy = (token: string) => navigator.clipboard.writeText(`${origin}/s/${token}`).then(() => toast('Link copied'));
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  if (form)
    return (
      <div className="cols" style={{ gridTemplateColumns: 'minmax(300px, 400px) 1fr', alignItems: 'start' }}>
        <div className="stack" style={{ gap: 20 }}>
          <div><label className="label">Link name</label><input className="input" autoFocus value={form.name} maxLength={60} placeholder="Resume link" onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div>
            <div className="label">Fields visible to the viewer</div>
            <p className="hint" style={{ marginTop: -2, marginBottom: 8 }}>Untick to hide. Hidden values are removed on the server and never sent to the viewer.</p>
            {fields.map((f) => (
              <label key={f.id} className="check" style={{ display: 'flex', padding: '6px 0' }}>
                <input type="checkbox" checked={!form.hidden.includes(f.id)} onChange={() => setForm({ ...form, hidden: toggle(form.hidden, f.id) })} />
                <span className="grow">{f.name}</span>{f.sensitive && <span className="chip">sensitive</span>}
              </label>
            ))}
          </div>
          <div>
            <div className="label">Views</div>
            <div className="row wrap">{(['table', 'gallery', 'analytics'] as const).map((v) => <label key={v} className="check"><input type="checkbox" checked={form.views.includes(v)} onChange={() => setForm({ ...form, views: toggle(form.views, v) })} /> {v === 'table' ? 'Table' : v === 'gallery' ? 'Gallery' : 'Analytics'}</label>)}</div>
          </div>
          <div className="row"><div className="grow"><label className="label">Only projects from</label><input className="input" type="date" value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })} /></div><div className="grow"><label className="label">to</label><input className="input" type="date" value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })} /></div></div>
          <div><label className="label">Password {form.hasPassword && !form.clearPassword && <span className="faint">(set — type to change)</span>}</label>
            <input className="input" type="password" autoComplete="new-password" value={form.password} placeholder="Optional" onChange={(e) => setForm({ ...form, password: e.target.value, clearPassword: false })} />
            {form.hasPassword && <label className="check" style={{ marginTop: 8 }}><input type="checkbox" checked={form.clearPassword} onChange={(e) => setForm({ ...form, clearPassword: e.target.checked, password: '' })} /> Remove password</label>}</div>
          <div><label className="label">Expires on (optional)</label><input className="input" type="date" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })} /></div>
          <label className="check"><input type="checkbox" checked={form.noindex} onChange={(e) => setForm({ ...form, noindex: e.target.checked })} /> Ask search engines not to index this link</label>
          <div className="row"><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save link' : 'Create link'}</button><button className="btn" onClick={() => setForm(null)}>Cancel</button></div>
        </div>
        <div>
          <div className="row between" style={{ marginBottom: 10 }}><span className="eyebrow">Preview as viewer</span>{previewing && <span className="faint">updating…</span>}</div>
          <div style={{ border: '1px solid var(--line2)', borderRadius: 16, maxHeight: '78vh', overflow: 'auto', background: 'var(--bg)' }}>
            {vm ? <SharedView vm={vm} token="preview-preview-pre" embedded /> : <div className="empty">Loading preview…</div>}
          </div>
        </div>
      </div>
    );

  return (
    <div>
      <div className="row" style={{ marginBottom: 22 }}><button className="btn btn-primary" onClick={() => setForm(blank())}>+ New share link</button></div>
      {links.length === 0 && <div className="empty"><div className="glyph">↗</div><h2>Nothing shared yet</h2><p>Create a link, choose what the viewer sees, and put it on your resume.</p></div>}
      {links.map((l) => {
        const expired = l.expires_at && new Date(l.expires_at) < new Date();
        const dead = !!l.revoked_at || !!expired;
        return (
          <div key={l.id} style={{ padding: '20px 0', borderBottom: '1px solid var(--line)', opacity: dead ? 0.6 : 1 }}>
            <div className="row between wrap">
              <div>
                <h3 style={{ fontSize: 26 }}>{l.name} {l.revoked_at && <span className="pill" style={{ ['--c' as string]: '#c9694a' }}>revoked</span>} {expired && !l.revoked_at && <span className="pill" style={{ ['--c' as string]: '#c9694a' }}>expired</span>} {l.password_hash && <span className="chip">password</span>} {!l.noindex && <span className="chip">indexable</span>}</h3>
                <div className="muted num" style={{ fontSize: 13, marginTop: 4, wordBreak: 'break-all' }}>{origin}/s/{l.token}</div>
                <div className="faint" style={{ fontSize: 13, marginTop: 4 }}>{l.view_count} views · {l.hidden_field_ids.length} hidden field{l.hidden_field_ids.length === 1 ? '' : 's'} · created {timeAgo(l.created_at)}{l.expires_at ? ` · expires ${fmtDate(l.expires_at.slice(0, 10))}` : ''}</div>
              </div>
              <div className="row gap-sm wrap">
                {!dead && <button className="btn btn-sm" onClick={() => copy(l.token)}>Copy link</button>}
                {!dead && <a className="btn btn-sm" href={`/s/${l.token}`} target="_blank" rel="noopener noreferrer">Open</a>}
                <button className="btn btn-sm" onClick={() => setQrFor(qrFor === l.id ? null : l.id)}>QR</button>
                <button className="btn btn-sm" onClick={() => setForm(edit(l))}>Edit</button>
                <button className="btn btn-sm" onClick={async () => { const r = await setShareRevoked(l.id, !l.revoked_at); if (r.ok) { toast(l.revoked_at ? 'Link re-enabled' : 'Link revoked'); router.refresh(); } }}>{l.revoked_at ? 'Re-enable' : 'Revoke'}</button>
                <button className="btn btn-sm btn-danger" onClick={async () => { if (confirm(`Delete “${l.name}” permanently?`)) { const r = await deleteShareLink(l.id); if (r.ok) { toast('Link deleted'); router.refresh(); } } }}>Delete</button>
              </div>
            </div>
            {qrFor === l.id && <div style={{ marginTop: 14 }}><Qr text={`${origin}/s/${l.token}`} /></div>}
          </div>
        );
      })}
    </div>
  );
}
