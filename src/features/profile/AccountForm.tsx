'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { deleteAccount, updateProfile } from '@/features/profile/actions';
import { CURRENCIES, minorDigits } from '@/lib/currency';
import type { Profile } from '@/types';

export function AccountForm({ profile, siteUrl }: { profile: Profile; siteUrl: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const digits = minorDigits(profile.base_currency);
  const [f, setF] = useState({
    display_name: profile.display_name ?? '', username: profile.username ?? '', bio: profile.bio ?? '', base_currency: profile.base_currency,
    is_public: profile.is_public, goal_type: profile.goal_type, goal_period: profile.goal_period,
    goal_value: profile.goal_value ? String(profile.goal_type === 'revenue' ? profile.goal_value / 10 ** digits : profile.goal_value) : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErrors({});
    const d = minorDigits(f.base_currency);
    const raw = Number(f.goal_value.replace(/,/g, ''));
    const goal_value = f.goal_type && f.goal_value && Number.isFinite(raw) && raw > 0 ? (f.goal_type === 'revenue' ? Math.round(raw * 10 ** d) : Math.round(raw)) : null;
    const res = await updateProfile({ ...f, goal_value });
    setBusy(false);
    if (!res.ok) { setErrors(res.fieldErrors ?? {}); return toast(res.error, { kind: 'err' }); }
    toast('Saved'); router.refresh();
  }
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div>
      <form onSubmit={save} className="form-grid" id="profile">
        <div><label className="label">Display name</label><input className={`input ${errors.display_name ? 'err' : ''}`} value={f.display_name} onChange={(e) => set('display_name', e.target.value)} /></div>
        <div><label className="label">Username <span className="faint">(for your public page)</span></label><input className={`input ${errors.username ? 'err' : ''}`} value={f.username} onChange={(e) => set('username', e.target.value.toLowerCase())} placeholder="salman" />
          {errors.username ? <div className="field-err">{errors.username}</div> : f.username && <div className="hint">{siteUrl}/u/{f.username}</div>}</div>
        <div className="full"><label className="label">Bio</label><textarea className="textarea" style={{ minHeight: 80 }} maxLength={280} value={f.bio} onChange={(e) => set('bio', e.target.value)} /></div>
        <div><label className="label">Base currency <span className="faint">(Home combines dashboards into this)</span></label>
          <select className="select" value={f.base_currency} onChange={(e) => set('base_currency', e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></div>
        <label className="check" style={{ alignSelf: 'end', height: 42 }}><input type="checkbox" checked={f.is_public} onChange={(e) => set('is_public', e.target.checked)} /> Make my public profile page visible</label>
        <div className="full"><hr className="rule" style={{ margin: '6px 0' }} /><h3 style={{ fontSize: 26 }}>Goal</h3></div>
        <div><label className="label">Goal type</label>
          <select className="select" value={f.goal_type ?? ''} onChange={(e) => set('goal_type', (e.target.value || null) as 'revenue' | 'projects' | null)}>
            <option value="">No goal</option><option value="revenue">Revenue</option><option value="projects">Projects delivered</option></select></div>
        {f.goal_type && <>
          <div><label className="label">Target {f.goal_type === 'revenue' ? `(${f.base_currency})` : '(projects)'}</label><input className={`input mono ${errors.goal_value ? 'err' : ''}`} inputMode="decimal" value={f.goal_value} onChange={(e) => set('goal_value', e.target.value)} /></div>
          <div><label className="label">Per</label><select className="select" value={f.goal_period} onChange={(e) => set('goal_period', e.target.value as 'month' | 'year')}><option value="month">Month</option><option value="year">Year</option></select></div>
        </>}
        <div className="full"><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>

      <hr className="rule" />
      <h3 style={{ fontSize: 26, marginBottom: 6 }}>Your data</h3>
      <p className="muted">Download everything you have stored here as one JSON file.</p>
      <a className="btn" href="/app/export" download>Export all my data</a>

      <hr className="rule" />
      <h3 style={{ fontSize: 26, marginBottom: 6, color: 'var(--bad)' }}>Delete account</h3>
      <p className="muted">Permanently deletes your account, dashboards, projects, fields and share links. This cannot be undone.</p>
      <div className="row wrap">
        <input className="input" style={{ maxWidth: 240 }} placeholder="Type DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" />
        <button className="btn btn-danger" disabled={confirm !== 'DELETE'} onClick={async () => { const r = await deleteAccount(confirm); if (r && !r.ok) toast(r.error, { kind: 'err' }); }}>Delete my account</button>
      </div>
    </div>
  );
}
